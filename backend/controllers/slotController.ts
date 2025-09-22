import { Request, Response } from "express";
import Slot from "../models/slotModel";
import { Booking } from "../models/Booking";
import { Ticket } from "../models/Ticket";
import Doctor from "../models/Doctor"; // Correct casing
import { getIO } from "../socket";
import crypto from "crypto";
import pdfkit from "pdfkit";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

interface AuthRequest extends Request {
  user?: any;
}

// Create Slot (Doctor / Business)
const createSlot = async (req: AuthRequest, res: Response) => {
  try {
    const { date, time, duration, price, department, doctor } = req.body;
    if (!doctor || !doctor.name || !doctor.location) {
      return res.status(400).json({ message: "Doctor information is required" });
    }

    const slot = await Slot.create({
      date,
      time,
      duration,
      price,
      department,
      isBooked: false,
      businessId: req.user?.id,
      doctor: {
        name: doctor.name,
        location: doctor.location,
        rating: doctor.rating || 0,
        email: doctor.email || "",       // added email
        contactEmail: doctor.contactEmail || "", // added contactEmail
      },
    });

    getIO().emit("slotCreated", slot);
    res.status(201).json(slot);
  } catch (error) {
    console.error("Error creating slot:", error);
    res.status(500).json({ message: "Error creating slot", error });
  }
};

// Get available slots (Patients)
const getSlots = async (req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];

    const slots = await Slot.find({
      date: { $gte: todayStr },
      isBooked: false,
    }).sort({ date: 1, time: 1 });

    res.status(200).json(slots);
  } catch (error) {
    console.error("Error fetching slots:", error);
    res.status(500).json({ message: "Error fetching slots", error });
  }
};

// Get business slots (Doctor)
const getBusinessSlots = async (req: AuthRequest, res: Response) => {
  try {
    const slots = await Slot.find({ businessId: req.user?.id }).sort({ date: 1, time: 1 });
    res.json(slots);
  } catch (error) {
    console.error("Error fetching business slots:", error);
    res.status(500).json({ message: "Error fetching business slots", error });
  }
};

// ⭐ Book slot + generate PDF + email
const bookSlot = async (req: Request, res: Response) => {
  try {
    const { slotId } = req.params;
    const { customerName, customerEmail, customerPhone, customerAge, customerGender } = req.body;

    if (!slotId || !customerName || !customerEmail || !customerPhone || !customerAge || !customerGender) {
      return res.status(400).json({ message: "All customer details are required" });
    }

    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ message: "Slot not found" });
    if (slot.isBooked) return res.status(400).json({ message: "Slot already booked" });

    const bookingNumber = "ZARVO-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    const booking = await Booking.create({
      slotId: slot._id,
      customerName,
      customerEmail,
      customerPhone,
      customerAge,
      customerGender,
      doctor: slot.doctor,
      fee: slot.price,
      bookingNumber,
      status: "booked",
    });

    const ticket = await Ticket.create({
      bookingId: booking._id,
      doctorName: slot.doctor.name,
      doctorLocation: slot.doctor.location,
      doctorContact: slot.doctor.email || slot.doctor.contactEmail || "N/A",
      customerName,
      customerEmail,
      customerPhone,
      customerAge,
      customerGender,
      date: slot.date,
      time: slot.time,
      price: slot.price,
      bookingNumber,
    });

    slot.isBooked = true;
    await slot.save();

    getIO().emit("slotUpdated", slot);
    getIO().emit("bookingCreated", booking);
    getIO().emit("ticketCreated", ticket);

    const ticketsDir = path.join(__dirname, `../tickets`);
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }
    const pdfPath = path.join(ticketsDir, `${bookingNumber}.pdf`);
    const doc = new pdfkit();
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);
    doc.fontSize(20).text("ZARVO Booking Ticket", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Booking Number: ${bookingNumber}`);
    doc.text(`Customer: ${customerName}, Age: ${customerAge}, Gender: ${customerGender}`);
    doc.text(`Email: ${customerEmail}`);
    doc.text(`Phone: ${customerPhone}`);
    doc.text(`Doctor: ${slot.doctor.name}`);
    doc.text(`Department: ${slot.department}`);
    doc.text(`Date & Time: ${slot.date} ${slot.time}`);
    doc.text(`Price: ₹${slot.price}`);
    doc.end();

    // Wait until PDF is fully written to disk
    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", (err) => reject(err));
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Your Booking Ticket - ${bookingNumber}`,
      text: `Dear ${customerName},\n\nYour booking is confirmed. Please find the attached ticket.`,
      attachments: [{ filename: `${bookingNumber}.pdf`, path: pdfPath }],
    });

    if (process.env.BUSINESS_EMAIL) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.BUSINESS_EMAIL,
        subject: `New Booking Received - ${bookingNumber}`,
        text: `Dear ${slot.doctor.name || "Doctor"},\n\nA new booking has been made.\n\nBooking Number: ${bookingNumber}\nCustomer: ${customerName}\nEmail: ${customerEmail}\nPhone: ${customerPhone}\nDate & Time: ${slot.date} ${slot.time}\nDepartment: ${slot.department}\n`,
        attachments: [{ filename: `${bookingNumber}.pdf`, path: pdfPath }],
      });
    } else {
      console.warn("No BUSINESS_EMAIL found in .env for notification.");
    }

    res.status(201).json({ booking, ticket, message: "Slot booked, PDF generated & emailed!" });
  } catch (error) {
    console.error("Error booking slot:", error);
    res.status(500).json({ message: "Error booking slot", error });
  }
};

// Delete slot (Business/Doctor)
const deleteSlot = async (req: AuthRequest, res: Response) => {
  try {
    const { slotId } = req.params;
    const force = req.query.force === 'true';

    const slot = await Slot.findOne({ _id: slotId, businessId: req.user?.id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found or you don't have permission to delete it" });
    }

    if (slot.isBooked && !force) {
      return res.status(400).json({ message: "Cannot delete a booked slot. Please cancel the booking first or use emergency delete." });
    }

    if (slot.isBooked && force) {
      const booking = await Booking.findOne({ slotId: slot._id, status: 'booked' });
      if (booking) {
        try {
          const { sendBookingCancellation } = require('../services/emailService');
          await sendBookingCancellation(booking);
        } catch (e) {
          console.warn('Failed to send cancellation email:', e);
        }
        booking.status = 'cancelled';
        // Some older bookings may be missing new required fields; disable validation on status-only update
        await booking.save({ validateBeforeSave: false });
      }
    }

    await Slot.findByIdAndDelete(slotId);
    getIO().emit("slotDeleted", { id: slotId, slotId });
    res.status(200).json({ message: force ? "Slot force-deleted (emergency)" : "Slot deleted successfully" });
  } catch (error) {
    console.error("Error deleting slot:", error);
    res.status(500).json({ message: "Error deleting slot", error });
  }
};

export { createSlot, getSlots, getBusinessSlots, bookSlot, deleteSlot };
