import express from "express";
import { signup, login, forgotPassword, resetPassword, deleteAccount, updateMe, verifyEmail, resendOtp, getMe } from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";
import { verifyCaptcha } from "../middleware/captchaMiddleware";
import { signupLimiter, otpLimiter } from "../middleware/rateLimit";
import { validateEmailDomain } from "../middleware/emailValidation";

const router = express.Router();

router.post("/register", signupLimiter, verifyCaptcha, validateEmailDomain, signup);
router.post("/signup", signupLimiter, verifyCaptcha, validateEmailDomain, signup); // Added for RESTful compatibility
router.post("/login", login);
router.post("/verify-email", otpLimiter, verifyEmail);
router.post("/resend-otp", otpLimiter, resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.delete("/delete-account", protect, deleteAccount);
router.put("/me", protect, updateMe);
router.get("/me", protect, getMe);

export default router;
