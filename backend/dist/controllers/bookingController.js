"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBooking = exports.updateBooking = exports.getBookingById = exports.getMyBookings = exports.getBookings = exports.createBooking = void 0;
const Booking_1 = require("../models/Booking"); // your Booking model
const emailService_1 = require("../services/emailService");
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
        res.status(200).json({ success: true, message: "Booking deleted successfully and cancellation email sent" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteBooking = deleteBooking;
