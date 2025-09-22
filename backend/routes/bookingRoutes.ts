// routes/bookingRoutes.ts
import { Router } from "express";
import {
  createBooking,
  getBookings,
  getMyBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
} from "../controllers/bookingController";

const router = Router();

// @route   POST /api/bookings
// @desc    Create a new booking
router.post("/", createBooking);

// @route   GET /api/bookings
// @desc    Get all bookings
router.get("/", getBookings);

// @route   GET /api/bookings/all
// @desc    Get all bookings (alternative endpoint)
router.get("/all", getBookings);

// @route   GET /api/bookings/my-bookings
// @desc    Get bookings for the logged-in doctor/business
router.get("/my-bookings", getMyBookings);

// @route   GET /api/bookings/:id
// @desc    Get a single booking by ID
router.get("/:id", getBookingById);

// @route   PUT /api/bookings/:id
// @desc    Update a booking
router.put("/:id", updateBooking);

// @route   DELETE /api/bookings/:id
// @desc    Delete a booking
router.delete("/:id", deleteBooking);

export default router;
