"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBooking = exports.updateBooking = exports.getBookingById = exports.getMyBookings = exports.getBookings = exports.cancelBooking = exports.createBooking = void 0;
const Booking_1 = require("../models/Booking"); // your Booking model
const slotModel_1 = __importDefault(require("../models/slotModel"));
const emailService_1 = require("../services/emailService");
const socket_1 = require("../socket");
// ✅ Create a new booking
const createBooking = async (req, res) => {
    try {
        const booking = new Booking_1.Booking(req.body);
        await booking.save();
        // Send confirmation email to customer
        try {
            const emailResult = await (0, emailService_1.sendBookingConfirmation)(booking);
            if (emailResult.success) {
                console.log('✅ Booking confirmation email sent successfully');
            }
            else {
                console.log('⚠️ Booking created but email failed to send:', emailResult.error);
            }
        }
        catch (emailError) {
            console.log('⚠️ Booking created but email failed to send:', emailError);
        }
        res.status(201).json({
            success: true,
            message: "Booking created successfully and confirmation email sent",
            data: booking,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.createBooking = createBooking;
// ✅ Cancel booking (customer-initiated) with 2-hour cutoff
const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking_1.Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }
        // Optional: verify ownership by email if authenticated
        if (req.user?.email && booking.customerEmail && req.user.email !== booking.customerEmail) {
            return res.status(403).json({ success: false, message: "You are not allowed to cancel this booking" });
        }
        // Get slot info to determine start time
        const slot = await slotModel_1.default.findById(booking.slotId);
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
        booking.status = "cancelled";
        await booking.save();
        // Release the slot
        if (slot.isBooked) {
            slot.isBooked = false;
            await slot.save();
        }
        // Send cancellation email (best-effort)
        try {
            const emailResult = await (0, emailService_1.sendBookingCancellation)(booking);
            if (emailResult.success) {
                console.log('✅ Booking cancellation email sent successfully');
            }
            else {
                console.log('⚠️ Cancellation email failed to send:', emailResult.error);
            }
        }
        catch (emailError) {
            console.log('⚠️ Cancellation email failed to send:', emailError);
        }
        // Emit realtime event
        try {
            const io = (0, socket_1.getIO)();
            io.emit("bookingCancelled", { id: booking.id, slotId: booking.slotId });
        }
        catch { }
        return res.status(200).json({ success: true, message: "Booking cancelled" });
    }
    catch (error) {
        console.error("Cancel booking error:", error);
        return res.status(500).json({ success: false, message: error.message || "Server error" });
    }
};
exports.cancelBooking = cancelBooking;
// ✅ Get all bookings
const getBookings = async (_req, res) => {
    try {
        const bookings = await Booking_1.Booking.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: bookings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getBookings = getBookings;
// ✅ Get bookings for a specific doctor/business
const getMyBookings = async (req, res) => {
    try {
        // For now, return all bookings. In a real app, you'd filter by the logged-in user's slots
        const bookings = await Booking_1.Booking.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: bookings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMyBookings = getMyBookings;
// ✅ Get booking by ID
const getBookingById = async (req, res) => {
    try {
        const booking = await Booking_1.Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }
        res.status(200).json({ success: true, data: booking });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getBookingById = getBookingById;
// ✅ Update booking
const updateBooking = async (req, res) => {
    try {
        const booking = await Booking_1.Booking.findByIdAndUpdate(req.params.id, req.body, {
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
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.updateBooking = updateBooking;
// ✅ Delete booking
const deleteBooking = async (req, res) => {
    try {
        const booking = await Booking_1.Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }
        // Release the slot if currently booked
        try {
            const slot = await slotModel_1.default.findById(booking.slotId);
            if (slot && slot.isBooked) {
                slot.isBooked = false;
                await slot.save();
            }
        }
        catch { }
        // Send cancellation email to customer before deleting
        try {
            const emailResult = await (0, emailService_1.sendBookingCancellation)(booking);
            if (emailResult.success) {
                console.log('✅ Booking cancellation email sent successfully');
            }
            else {
                console.log('⚠️ Booking will be deleted but cancellation email failed to send:', emailResult.error);
            }
        }
        catch (emailError) {
            console.log('⚠️ Booking will be deleted but cancellation email failed to send:', emailError);
        }
        // Delete the booking
        await Booking_1.Booking.findByIdAndDelete(req.params.id);
        // Emit realtime event so clients update immediately
        try {
            const io = (0, socket_1.getIO)();
            io.emit("bookingCancelled", { id: booking.id, slotId: booking.slotId });
        }
        catch { }
        res.status(200).json({ success: true, message: "Booking deleted successfully and cancellation email sent" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteBooking = deleteBooking;
