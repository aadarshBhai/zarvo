import { Router } from "express";
import * as slotController from "../controllers/slotController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

// ✅ Create a slot (Business/Doctor)
router.post("/", protect, slotController.createSlot);

// ✅ Get all available slots (public for patients)
router.get("/", slotController.getSlots);

// ✅ Get slots for logged-in business/doctor
router.get("/my-slots", protect, slotController.getBusinessSlots);

// ✅ Book a slot (Customer)
router.post("/book/:slotId", slotController.bookSlot);

// ✅ Delete a slot (Business/Doctor)
router.delete("/:slotId", protect, slotController.deleteSlot);

export default router;
