"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const captchaMiddleware_1 = require("../middleware/captchaMiddleware");
const rateLimit_1 = require("../middleware/rateLimit");
const emailValidation_1 = require("../middleware/emailValidation");
const router = express_1.default.Router();
router.post("/register", rateLimit_1.signupLimiter, captchaMiddleware_1.verifyCaptcha, emailValidation_1.validateEmailDomain, authController_1.signup);
router.post("/signup", rateLimit_1.signupLimiter, captchaMiddleware_1.verifyCaptcha, emailValidation_1.validateEmailDomain, authController_1.signup); // Added for RESTful compatibility
router.post("/login", authController_1.login);
router.post("/verify-email", rateLimit_1.otpLimiter, authController_1.verifyEmail);
router.post("/resend-otp", rateLimit_1.otpLimiter, authController_1.resendOtp);
router.post("/forgot-password", authController_1.forgotPassword);
router.post("/reset-password", authController_1.resetPassword);
router.delete("/delete-account", authMiddleware_1.protect, authController_1.deleteAccount);
router.put("/me", authMiddleware_1.protect, authController_1.updateMe);
router.get("/me", authMiddleware_1.protect, authController_1.getMe);
exports.default = router;
