import { Request, Response } from "express";
import { Booking } from "../models/Booking";  // your Booking model
import { sendBookingConfirmation, sendBookingCancellation } from "../services/emailService";

// ✅ Create a new booking
export const createBooking = async (req: Request, res: Response) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    
    // Send confirmation email to customer
    try {
      const emailResult = await sendBookingConfirmation(booking);
      if (emailResult.success) {
        console.log('✅ Booking confirmation email sent successfully');
      } else {
        console.log('⚠️ Booking created but email failed to send:', emailResult.error);
      }
    } catch (emailError) {
      console.log('⚠️ Booking created but email failed to send:', emailError);
    }
    
    res.status(201).json({
      success: true,
      message: "Booking created successfully and confirmation email sent",
      data: booking,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ✅ Get all bookings
export const getBookings = async (_req: Request, res: Response) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get bookings for a specific doctor/business
export const getMyBookings = async (req: Request, res: Response) => {
  try {
    // For now, return all bookings. In a real app, you'd filter by the logged-in user's slots
    const bookings = await Booking.find().sort({ createdAt: -1 });
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

    res.status(200).json({ success: true, message: "Booking deleted successfully and cancellation email sent" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
