import { Request, Response } from "express";
import { Booking } from "../models/Booking";  // your Booking model
import Slot from "../models/slotModel";
import { sendBookingConfirmation, sendBookingCancellation, notifyDoctorCancellation, sendEmailWithAttachments } from "../services/emailService";
import { getIO } from "../socket";
import { Ticket } from "../models/Ticket";
import crypto from "crypto";
import pdfkit from "pdfkit";
import fs from "fs";
import path from "path";
 

// ✅ Create a new booking (unified flow: book slot + create ticket + PDF + emails)
export const createBooking = async (req: Request, res: Response) => {
  try {
    const { slotId, customerName, customerEmail, customerPhone, customerAge, customerGender } = req.body || {};


    if (!slotId || !customerName || !customerEmail || !customerPhone || !customerAge || !customerGender) {
      return res.status(400).json({ success: false, message: "slotId, customerName, customerEmail, customerPhone, customerAge, customerGender are required" });
    }

    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ success: false, message: "Slot not found" });
    if (slot.isBooked) return res.status(400).json({ success: false, message: "Slot already booked" });

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
      date: slot.date,
      time: slot.time,
      price: slot.price,
      bookingNumber,
    } as any);

    // Mark slot booked
    slot.isBooked = true;
    await slot.save();

    // Realtime notifications
    try {
      const io = getIO();
      io.emit("slotUpdated", slot);
      io.emit("bookingCreated", booking);
      io.emit("ticketCreated", ticket);
    } catch {}

    // Prepare PDF in a writable location (prefer /tmp on PaaS)
    const ticketsDir = process.env.TICKETS_DIR || "/tmp/zarvo-tickets";
    try {
      if (!fs.existsSync(ticketsDir)) {
        fs.mkdirSync(ticketsDir, { recursive: true });
      }
    } catch (mkErr) {
      console.warn("Failed to ensure tickets directory, falling back to project path:", mkErr);
    }
    const fallbackDir = path.join(__dirname, `../tickets`);
    const outDir = fs.existsSync(ticketsDir) ? ticketsDir : fallbackDir;
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const pdfPath = path.join(outDir, `${bookingNumber}.pdf`);

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

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", (err) => reject(err));
    });

    // Send email to customer with PDF (best-effort)
    try {
      await sendEmailWithAttachments(
        customerEmail,
        `Your Booking Ticket - ${bookingNumber}`,
        `Dear ${customerName},<br/><br/>Your booking is confirmed. Please find the attached ticket.`,
        [{ filename: `${bookingNumber}.pdf`, path: pdfPath }]
      );
      console.log("✅ Booking email to customer queued");
    } catch (e) {
      console.error("❌ Failed to queue booking email to customer:", e);
    }

    // Notify doctor/business
    try {
      let doctorEmail = slot.doctor.email || slot.doctor.contactEmail || "";
      if (!doctorEmail && (slot as any).businessId) {
        try {
          const { default: User } = await import("../models/User");
          const provider = await User.findById((slot as any).businessId);
          if (provider?.email) doctorEmail = provider.email;
        } catch {}
      }
      if (doctorEmail) {
        try {
          await sendEmailWithAttachments(
            doctorEmail,
            `New Booking Received - ${bookingNumber}`,
            `Dear ${slot.doctor.name || "Doctor"},<br/><br/>A new booking has been made.<br/><br/>Booking Number: ${bookingNumber}<br/>Customer: ${customerName}<br/>Email: ${customerEmail}<br/>Phone: ${customerPhone}<br/>Date & Time: ${slot.date} ${slot.time}<br/>Department: ${slot.department}<br/>`,
            [{ filename: `${bookingNumber}.pdf`, path: pdfPath }]
          );
          console.log("✅ Booking email to doctor queued");
        } catch (e) {
          console.warn('Failed to notify doctor via email:', e);
        }
      }
    } catch (e) {
      console.warn('Failed to notify doctor via email:', e);
    }

    if (process.env.BUSINESS_EMAIL) {
      try {
        await sendEmailWithAttachments(
          process.env.BUSINESS_EMAIL,
          `New Booking Received - ${bookingNumber}`,
          `New booking created.<br/>Booking Number: ${bookingNumber}<br/>Customer: ${customerName}<br/>Email: ${customerEmail}<br/>Phone: ${customerPhone}<br/>Date & Time: ${slot.date} ${slot.time}<br/>Department: ${slot.department}<br/>`,
          [{ filename: `${bookingNumber}.pdf`, path: pdfPath }]
        );
        console.log("✅ Booking email to business queued");
      } catch (e) {
        console.warn("Failed to notify business via email:", e);
      }
    }

    res.status(201).json({
      success: true,
      message: "Slot booked, ticket created, PDF generated & emails queued",
      data: { booking, ticket },
    });
  } catch (error: any) {
    console.error("Create booking (unified) error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ✅ Cancel booking (customer-initiated) with 2-hour cutoff
export const cancelBooking = async (req: Request & { user?: any }, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Optional: verify ownership by email if authenticated
    if (req.user?.email && booking.customerEmail && req.user.email !== booking.customerEmail) {
      return res.status(403).json({ success: false, message: "You are not allowed to cancel this booking" });
    }

    // Get slot info to determine start time
    const slot = await Slot.findById(booking.slotId);
    if (!slot) {
      return res.status(404).json({ success: false, message: "Related slot not found" });
    }

    // Parse slot date and time to Date object (assuming slot.date like YYYY-MM-DD and slot.time like HH:mm)
    const slotStart = new Date(`${slot.date}T${slot.time}:00`);
    if (isNaN(slotStart.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid slot date/time" });
    }

    const now = new Date();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    if (now.getTime() > slotStart.getTime() - twoHoursMs) {
      return res.status(400).json({ success: false, message: "Cancellation is only allowed up to 2 hours before the appointment" });
    }

    if (booking.status === "cancelled") {
      return res.status(200).json({ success: true, message: "Booking already cancelled" });
    }

    // Mark booking as cancelled
    booking.status = "cancelled" as any;
    await booking.save();

    // Release the slot
    if (slot.isBooked) {
      slot.isBooked = false;
      await slot.save();
    }

    // Send cancellation email (best-effort)
    try {
      const emailResult = await sendBookingCancellation(booking);
      if (emailResult.success) {
        console.log('✅ Booking cancellation email sent successfully');
      } else {
        console.log('⚠️ Cancellation email failed to send:', emailResult.error);
      }
    } catch (emailError) {
      console.log('⚠️ Cancellation email failed to send:', emailError);
    }

    // Notify the doctor/provider about the cancellation (best-effort)
    try {
      const notifyResult = await notifyDoctorCancellation(booking, slot);
      if (notifyResult.success) {
        console.log('✅ Doctor notified about cancellation');
      } else {
        console.log('⚠️ Doctor notification not sent:', notifyResult.error);
      }
    } catch (notifyErr) {
      console.log('⚠️ Doctor notification failed:', notifyErr);
    }

    // Emit realtime event
    try {
      const io = getIO();
      io.emit("bookingCancelled", { id: booking.id, slotId: booking.slotId });
    } catch {}

    return res.status(200).json({ success: true, message: "Booking cancelled" });
  } catch (error: any) {
    console.error("Cancel booking error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ✅ Get all bookings
export const getBookings = async (req: Request, res: Response) => {
  try {
    const includeCancelled = (req.query.includeCancelled as string) === 'true';
    const baseQuery: any = {};
    if (!includeCancelled) {
      baseQuery.status = { $ne: 'cancelled' };
    }
    const bookings = await Booking.find(baseQuery).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get bookings for a specific doctor/business
export const getMyBookings = async (req: Request & { user?: any }, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    // If the requester is a customer, return only their bookings by email
    const role = (req.user as any).role || 'customer';
    const email = (req.user as any).email;

    if (!email) {
      return res.status(400).json({ success: false, message: "Authenticated user has no email" });
    }

    let query: any = {};
    if (role === 'customer') {
      query = { customerEmail: email };
    } else {
      // For doctor/business we would ideally filter by ownership of slots. As a simple heuristic,
      // filter by doctor.name if it matches the user's name. Adjust as your data model evolves.
      const name = (req.user as any).name;
      query = name ? { "doctor.name": name } : {};
    }

    const includeCancelled = (req.query.includeCancelled as string) === 'true';
    if (!includeCancelled) {
      query.status = { $ne: 'cancelled' };
    }

    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get booking by ID
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    res.status(200).json({ success: true, data: booking });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update booking
export const updateBooking = async (req: Request, res: Response) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: booking,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ✅ Delete booking
export const deleteBooking = async (req: Request, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Release the slot if currently booked
    try {
      const slot = await Slot.findById(booking.slotId as any);
      if (slot && slot.isBooked) {
        slot.isBooked = false;
        await slot.save();
      }
    } catch {}

    // Send cancellation email to customer before deleting
    try {
      const emailResult = await sendBookingCancellation(booking);
      if (emailResult.success) {
        console.log('✅ Booking cancellation email sent successfully');
      } else {
        console.log('⚠️ Booking will be deleted but cancellation email failed to send:', emailResult.error);
      }
    } catch (emailError) {
      console.log('⚠️ Booking will be deleted but cancellation email failed to send:', emailError);
    }

    // Delete the booking
    await Booking.findByIdAndDelete(req.params.id);

    // Emit realtime event so clients update immediately
    try {
      const io = getIO();
      io.emit("bookingCancelled", { id: booking.id, slotId: booking.slotId });
    } catch {}

    res.status(200).json({ success: true, message: "Booking deleted successfully and cancellation email sent" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Public cancel endpoint: guests cancel using bookingNumber + customerEmail (2-hour cutoff enforced)
export const cancelBookingPublic = async (req: Request, res: Response) => {
  try {
    const { bookingNumber, customerEmail } = req.body || {};
    if (!bookingNumber || !customerEmail) {
      return res.status(400).json({ success: false, message: "bookingNumber and customerEmail are required" });
    }

    const booking = await Booking.findOne({ bookingNumber });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.customerEmail !== customerEmail) {
      return res.status(403).json({ success: false, message: "Provided email does not match this booking" });
    }

    const slot = await Slot.findById(booking.slotId);
    if (!slot) {
      return res.status(404).json({ success: false, message: "Related slot not found" });
    }

    const slotStart = new Date(`${slot.date}T${slot.time}:00`);
    if (isNaN(slotStart.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid slot date/time" });
    }

    const now = new Date();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    if (now.getTime() > slotStart.getTime() - twoHoursMs) {
      return res.status(400).json({ success: false, message: "Cancellation is only allowed up to 2 hours before the appointment" });
    }

    if (booking.status === "cancelled") {
      return res.status(200).json({ success: true, message: "Booking already cancelled" });
    }

    booking.status = "cancelled" as any;
    await booking.save();

    if (slot.isBooked) {
      slot.isBooked = false;
      await slot.save();
    }

    // Send emails (best-effort)
    try {
      const emailResult = await sendBookingCancellation(booking);
      if (emailResult.success) {
        console.log('✅ Booking cancellation email sent successfully');
      } else {
        console.log('⚠️ Cancellation email failed to send:', emailResult.error);
      }
    } catch (emailError) {
      console.log('⚠️ Cancellation email failed to send:', emailError);
    }

    try {
      const notifyResult = await notifyDoctorCancellation(booking, slot);
      if (notifyResult.success) {
        console.log('✅ Doctor notified about cancellation');
      } else {
        console.log('⚠️ Doctor notification not sent:', notifyResult.error);
      }
    } catch (notifyErr) {
      console.log('⚠️ Doctor notification failed:', notifyErr);
    }

    // Realtime updates
    try {
      const io = getIO();
      io.emit("bookingCancelled", { id: booking.id, slotId: booking.slotId });
      io.emit("slotUpdated", { id: slot.id, isBooked: slot.isBooked });
    } catch {}

    return res.status(200).json({ success: true, message: "Booking cancelled" });
  } catch (error: any) {
    console.error("Public cancel booking error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};
