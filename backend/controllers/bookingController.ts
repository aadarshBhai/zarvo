import { Request, Response } from "express";
import { Booking } from "../models/Booking";  // your Booking model
import Slot from "../models/slotModel";
import { sendBookingConfirmation, sendBookingCancellation } from "../services/emailService";
import { getIO } from "../socket";

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
