// routes/bookingRoutes.ts
import { Router } from "express";
import {
  createBooking,
  getBookings,
  getMyBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  cancelBooking,
  cancelBookingPublic,
} from "../controllers/bookingController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

// @route   POST /api/bookings
// @desc    Create a new booking
router.post("/", createBooking);

// @route   POST /api/bookings/cancel-public
// @desc    Public guest cancellation using bookingNumber + customerEmail (2-hour cutoff)
router.post("/cancel-public", cancelBookingPublic);

// @route   GET /api/bookings
// @desc    Get all bookings
router.get("/", getBookings);

// @route   GET /api/bookings/all
// @desc    Get all bookings (alternative endpoint)
router.get("/all", getBookings);

// @route   GET /api/bookings/my-bookings
// @desc    Get bookings for the logged-in doctor/business
router.get("/my-bookings", protect, getMyBookings);

// @route   GET /api/bookings/:id
// @desc    Get a single booking by ID
router.get("/:id", getBookingById);

// @route   PUT /api/bookings/:id
// @desc    Update a booking
router.put("/:id", updateBooking);

// @route   DELETE /api/bookings/:id
// @desc    Delete a booking
router.delete("/:id", deleteBooking);

// @route   POST /api/bookings/:id/cancel
// @desc    Customer cancels a booking (server enforces 2-hour cutoff)
router.post("/:id/cancel", protect, cancelBooking);

export default router;
