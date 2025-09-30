"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/bookingRoutes.ts
const express_1 = require("express");
const bookingController_1 = require("../controllers/bookingController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// @route   POST /api/bookings
// @desc    Create a new booking
router.post("/", bookingController_1.createBooking);
// @route   POST /api/bookings/cancel-public
// @desc    Public guest cancellation using bookingNumber + customerEmail (2-hour cutoff)
router.post("/cancel-public", bookingController_1.cancelBookingPublic);
// @route   GET /api/bookings
// @desc    Get all bookings
router.get("/", bookingController_1.getBookings);
// @route   GET /api/bookings/all
// @desc    Get all bookings (alternative endpoint)
router.get("/all", bookingController_1.getBookings);
// @route   GET /api/bookings/my-bookings
// @desc    Get bookings for the logged-in doctor/business
router.get("/my-bookings", authMiddleware_1.protect, bookingController_1.getMyBookings);
// @route   GET /api/bookings/:id
// @desc    Get a single booking by ID
router.get("/:id", bookingController_1.getBookingById);
// @route   PUT /api/bookings/:id
// @desc    Update a booking
router.put("/:id", bookingController_1.updateBooking);
// @route   DELETE /api/bookings/:id
// @desc    Delete a booking
router.delete("/:id", bookingController_1.deleteBooking);
// @route   POST /api/bookings/:id/cancel
// @desc    Customer cancels a booking (server enforces 2-hour cutoff)
router.post("/:id/cancel", authMiddleware_1.protect, bookingController_1.cancelBooking);
exports.default = router;
