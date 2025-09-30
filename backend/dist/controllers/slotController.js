"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSlot = exports.bookSlot = exports.getBusinessSlots = exports.getSlots = exports.createSlot = void 0;
const slotModel_1 = __importDefault(require("../models/slotModel"));
const User_1 = __importDefault(require("../models/User"));
const Booking_1 = require("../models/Booking");
const Ticket_1 = require("../models/Ticket");
const Doctor_1 = __importDefault(require("../models/Doctor")); // Correct casing
const socket_1 = require("../socket");
const crypto_1 = __importDefault(require("crypto"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const emailService_1 = require("../services/emailService");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Create Slot (Doctor / Business)
const createSlot = async (req, res) => {
    try {
        // Enforce approval for business/doctor accounts
        if ((req.user?.role === 'doctor' || req.user?.role === 'business') && req.user?.isApproved !== true) {
            return res.status(403).json({ message: "Your account is pending approval. You cannot create slots yet." });
        }
        const { date, time, duration, price, department, doctor } = req.body;
        if (!doctor || !doctor.name || !doctor.location) {
            return res.status(400).json({ message: "Doctor information is required" });
        }
        // Ensure a Doctor profile exists for this business so slots appear on public listing
        try {
            const bizId = req.user?.id;
            if (bizId) {
                const existing = await Doctor_1.default.findOne({ businessId: bizId });
                if (!existing) {
                    await Doctor_1.default.create({
                        name: doctor.name,
                        rating: typeof doctor.rating === 'number' ? doctor.rating : 0,
                        location: doctor.location,
                        department: department || 'General',
                        businessId: bizId,
                    });
                }
            }
        }
        catch (e) {
            // non-fatal; continue creating slot
            console.warn('Failed to ensure Doctor profile exists:', e);
        }
        const slot = await slotModel_1.default.create({
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
                email: doctor.email || "", // added email
                contactEmail: doctor.contactEmail || "", // added contactEmail
            },
        });
        (0, socket_1.getIO)().emit("slotCreated", slot);
        res.status(201).json(slot);
    }
    catch (error) {
        console.error("Error creating slot:", error);
        res.status(500).json({ message: "Error creating slot", error });
    }
};
exports.createSlot = createSlot;
// Get available slots (Patients)
const getSlots = async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split("T")[0];
        // Only include slots from approved, active business/doctor accounts
        const approvedUserIds = await User_1.default.find({
            role: { $in: ["doctor", "business"] },
            isApproved: true,
            isActive: true,
        }).distinct("_id");
        const approvedIdStrings = approvedUserIds.map((id) => id.toString());
        // Further ensure the business/doctor actually has a doctor profile
        const businessesWithDoctor = await Doctor_1.default.find({}).distinct("businessId");
        const businessesWithDoctorStrings = businessesWithDoctor.map((id) => id.toString());
        const eligibleBusinessIds = approvedIdStrings.filter((id) => businessesWithDoctorStrings.includes(id));
        const slots = await slotModel_1.default.find({
            date: { $gte: todayStr },
            isBooked: false,
            businessId: { $in: eligibleBusinessIds },
        }).sort({ date: 1, time: 1 });
        res.status(200).json(slots);
    }
    catch (error) {
        console.error("Error fetching slots:", error);
        res.status(500).json({ message: "Error fetching slots", error });
    }
};
exports.getSlots = getSlots;
// Get business slots (Doctor)
const getBusinessSlots = async (req, res) => {
    try {
        if ((req.user?.role === 'doctor' || req.user?.role === 'business') && req.user?.isApproved !== true) {
            return res.status(403).json({ message: "Your account is pending approval. Please wait for admin approval." });
        }
        const slots = await slotModel_1.default.find({ businessId: req.user?.id }).sort({ date: 1, time: 1 });
        res.json(slots);
    }
    catch (error) {
        console.error("Error fetching business slots:", error);
        res.status(500).json({ message: "Error fetching business slots", error });
    }
};
exports.getBusinessSlots = getBusinessSlots;
// ⭐ Book slot + generate PDF + email
const bookSlot = async (req, res) => {
    try {
        const { slotId } = req.params;
        const { customerName, customerEmail, customerPhone, customerAge, customerGender } = req.body;
        if (!slotId || !customerName || !customerEmail || !customerPhone || !customerAge || !customerGender) {
            return res.status(400).json({ message: "All customer details are required" });
        }
        const slot = await slotModel_1.default.findById(slotId);
        if (!slot)
            return res.status(404).json({ message: "Slot not found" });
        if (slot.isBooked)
            return res.status(400).json({ message: "Slot already booked" });
        const bookingNumber = "ZARVO-" + crypto_1.default.randomBytes(4).toString("hex").toUpperCase();
        const booking = await Booking_1.Booking.create({
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
        const ticket = await Ticket_1.Ticket.create({
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
        (0, socket_1.getIO)().emit("slotUpdated", slot);
        (0, socket_1.getIO)().emit("bookingCreated", booking);
        (0, socket_1.getIO)().emit("ticketCreated", ticket);
        const ticketsDir = path_1.default.join(__dirname, `../tickets`);
        if (!fs_1.default.existsSync(ticketsDir)) {
            fs_1.default.mkdirSync(ticketsDir, { recursive: true });
        }
        const pdfPath = path_1.default.join(ticketsDir, `${bookingNumber}.pdf`);
        const doc = new pdfkit_1.default();
        const writeStream = fs_1.default.createWriteStream(pdfPath);
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
        await new Promise((resolve, reject) => {
            writeStream.on("finish", () => resolve());
            writeStream.on("error", (err) => reject(err));
        });
        // Email to customer with PDF (best-effort)
        try {
            await (0, emailService_1.sendEmailWithAttachments)(customerEmail, `Your Booking Ticket - ${bookingNumber}`, `Dear ${customerName},<br/><br/>Your booking is confirmed. Please find the attached ticket.`, [{ filename: `${bookingNumber}.pdf`, path: pdfPath }]);
            console.log("✅ Booking email to customer queued");
        }
        catch (e) {
            console.error("❌ Failed to queue booking email to customer:", e);
        }
        // Notify the doctor/business owner directly (if we have an email)
        try {
            let doctorEmail = slot.doctor.email || slot.doctor.contactEmail || "";
            if (!doctorEmail && slot.businessId) {
                try {
                    const provider = await User_1.default.findById(slot.businessId);
                    if (provider?.email)
                        doctorEmail = provider.email;
                }
                catch { }
            }
            if (doctorEmail) {
                try {
                    await (0, emailService_1.sendEmailWithAttachments)(doctorEmail, `New Booking Received - ${bookingNumber}`, `Dear ${slot.doctor.name || "Doctor"},<br/><br/>A new booking has been made.<br/><br/>Booking Number: ${bookingNumber}<br/>Customer: ${customerName}<br/>Email: ${customerEmail}<br/>Phone: ${customerPhone}<br/>Date & Time: ${slot.date} ${slot.time}<br/>Department: ${slot.department}<br/>`, [{ filename: `${bookingNumber}.pdf`, path: pdfPath }]);
                    console.log("✅ Booking email to doctor queued");
                }
                catch (e) {
                    console.warn('Failed to notify doctor via email:', e);
                }
            }
        }
        catch (e) {
            console.warn('Failed to notify doctor via email:', e);
        }
        if (process.env.BUSINESS_EMAIL) {
            try {
                await (0, emailService_1.sendEmailWithAttachments)(process.env.BUSINESS_EMAIL, `New Booking Received - ${bookingNumber}`, `Dear ${slot.doctor.name || "Doctor"},<br/><br/>A new booking has been made.<br/><br/>Booking Number: ${bookingNumber}<br/>Customer: ${customerName}<br/>Email: ${customerEmail}<br/>Phone: ${customerPhone}<br/>Date & Time: ${slot.date} ${slot.time}<br/>Department: ${slot.department}<br/>`, [{ filename: `${bookingNumber}.pdf`, path: pdfPath }]);
                console.log("✅ Booking email to business queued");
            }
            catch (e) {
                console.warn("Failed to notify business via email:", e);
            }
        }
        else {
            console.warn("No BUSINESS_EMAIL found in .env for notification.");
        }
        res.status(201).json({ booking, ticket, message: "Slot booked, PDF generated & emailed!" });
    }
    catch (error) {
        console.error("Error booking slot:", error);
        res.status(500).json({ message: "Error booking slot", error });
    }
};
exports.bookSlot = bookSlot;
// Delete slot (Business/Doctor)
const deleteSlot = async (req, res) => {
    try {
        if ((req.user?.role === 'doctor' || req.user?.role === 'business') && req.user?.isApproved !== true) {
            return res.status(403).json({ message: "Your account is pending approval. You cannot delete slots yet." });
        }
        const { slotId } = req.params;
        const force = req.query.force === 'true';
        const slot = await slotModel_1.default.findOne({ _id: slotId, businessId: req.user?.id });
        if (!slot) {
            return res.status(404).json({ message: "Slot not found or you don't have permission to delete it" });
        }
        if (slot.isBooked && !force) {
            return res.status(400).json({ message: "Cannot delete a booked slot. Please cancel the booking first or use emergency delete." });
        }
        if (slot.isBooked && force) {
            const booking = await Booking_1.Booking.findOne({ slotId: slot._id, status: 'booked' });
            if (booking) {
                try {
                    const { sendBookingCancellation } = require('../services/emailService');
                    await sendBookingCancellation(booking);
                }
                catch (e) {
                    console.warn('Failed to send cancellation email:', e);
                }
                booking.status = 'cancelled';
                // Some older bookings may be missing new required fields; disable validation on status-only update
                await booking.save({ validateBeforeSave: false });
            }
        }
        await slotModel_1.default.findByIdAndDelete(slotId);
        (0, socket_1.getIO)().emit("slotDeleted", { id: slotId, slotId });
        res.status(200).json({ message: force ? "Slot force-deleted (emergency)" : "Slot deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting slot:", error);
        res.status(500).json({ message: "Error deleting slot", error });
    }
};
exports.deleteSlot = deleteSlot;
