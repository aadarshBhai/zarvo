import express from "express";
import { signup, login, forgotPassword, resetPassword, deleteAccount, updateMe } from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/register", signup);
router.post("/signup", signup); // Added for RESTful compatibility
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.delete("/delete-account", protect, deleteAccount);
router.put("/me", protect, updateMe);

export default router;
