import express from "express";
import { signup, login, forgotPassword, resetPassword } from "../controllers/authController";

const router = express.Router();

router.post("/register", signup);
router.post("/signup", signup); // Added for RESTful compatibility
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
