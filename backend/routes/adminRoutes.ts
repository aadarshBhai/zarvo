import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware";
import { approveDoctor, listPendingDoctors, listUsers, rejectDoctor, removeUser } from "../controllers/adminController";

const router = express.Router();

// All routes are protected and require admin/super-admin
router.use(protect, isAdmin);

router.get("/users", listUsers);
router.get("/pending-doctors", listPendingDoctors);
router.patch("/doctors/:id/approve", approveDoctor);
router.patch("/doctors/:id/reject", rejectDoctor);
router.delete("/users/:id", removeUser);

export default router;
