"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMe = exports.resetPassword = exports.forgotPassword = exports.login = exports.deleteAccount = exports.resendOtp = exports.verifyEmail = exports.signup = void 0;
const User_1 = __importDefault(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const socket_1 = require("../socket");
// JWT token generator (includes role for client-side routing convenience)
const generateToken = (userId, role) => jsonwebtoken_1.default.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
// ================= SIGNUP =================
const signup = async (req, res) => {
    try {
        const { email, role } = req.body;
        // Prevent creating admin accounts via public signup
        if (role === 'admin' || role === 'super-admin') {
            return res.status(403).json({ message: "Admin accounts cannot be created via public signup" });
        }
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }
        // Build payload with proper defaults
        const isDoctorOrBusiness = role === 'doctor' || role === 'business';
        const payload = {
            ...req.body,
            role: role || 'customer',
            approvalStatus: isDoctorOrBusiness ? 'pending' : 'approved',
            isApproved: isDoctorOrBusiness ? false : true,
            isActive: true,
            emailVerified: false,
        };
        // Save all fields from req.body (name, email, password, phone, role, businessType, etc.)
        const user = await User_1.default.create(payload);
        // Generate and store OTP for email verification
        const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
        user.emailVerificationOTP = otp;
        user.emailVerificationExpiry = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        // Send verification email via free Gmail SMTP
        try {
            const transporter = nodemailer_1.default.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: "Verify your email",
                html: `<p>Your verification code is <b>${otp}</b>. It expires in 15 minutes.</p>`,
            });
        }
        catch (e) {
            console.error("Failed to send verification email", e);
        }
        // Emit realtime event for admin dashboards if doctor/business signup pending
        if (isDoctorOrBusiness) {
            try {
                (0, socket_1.getIO)().emit('doctorSignupPending', {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    approvalStatus: user.approvalStatus,
                    isApproved: user.isApproved,
                    createdAt: user.createdAt,
                });
            }
            catch (e) {
                // socket may not be initialized in some environments
                console.warn('Socket emit failed for doctorSignupPending');
            }
        }
        res.status(201).json({
            message: "Signup successful. Please verify your email with the OTP sent to you.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                businessType: user.businessType,
                approvalStatus: user.approvalStatus,
                isApproved: user.isApproved,
                emailVerified: user.emailVerified,
            }
        });
    }
    catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.signup = signup;
// ================= VERIFY EMAIL (OTP) =================
const verifyEmail = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User_1.default.findOne({ email });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (user.emailVerified === true) {
            return res.status(200).json({ message: "Email already verified" });
        }
        const expected = user.emailVerificationOTP;
        const expiry = user.emailVerificationExpiry;
        if (!expected || !expiry || new Date() > new Date(expiry)) {
            return res.status(400).json({ message: "OTP expired. Please request a new one." });
        }
        if (String(otp) !== String(expected)) {
            return res.status(400).json({ message: "Invalid OTP" });
        }
        user.emailVerified = true;
        user.emailVerificationOTP = undefined;
        user.emailVerificationExpiry = undefined;
        await user.save();
        return res.status(200).json({ message: "Email verified successfully" });
    }
    catch (e) {
        console.error("verifyEmail error:", e);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.verifyEmail = verifyEmail;
// ================= RESEND OTP =================
const resendOtp = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User_1.default.findOne({ email });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (user.emailVerified === true) {
            return res.status(200).json({ message: "Email already verified" });
        }
        const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
        user.emailVerificationOTP = otp;
        user.emailVerificationExpiry = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        const transporter = nodemailer_1.default.createTransport({
            service: "gmail",
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Your OTP code",
            html: `<p>Your verification code is <b>${otp}</b>. It expires in 15 minutes.</p>`,
        });
        return res.status(200).json({ message: "OTP sent" });
    }
    catch (e) {
        console.error("resendOtp error:", e);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.resendOtp = resendOtp;
// ================= DELETE ACCOUNT =================
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user?._id?.toString?.() || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        const existing = await User_1.default.findById(userId);
        if (!existing) {
            return res.status(404).json({ message: "User not found" });
        }
        await User_1.default.findByIdAndDelete(userId);
        return res.status(200).json({ message: "Account deleted" });
    }
    catch (error) {
        console.error("Delete account error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.deleteAccount = deleteAccount;
// ================= LOGIN =================
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User_1.default.findOne({ email });
        if (!user)
            return res.status(400).json({ message: "Invalid credentials" });
        const isMatch = await user.comparePassword(password);
        if (!isMatch)
            return res.status(400).json({ message: "Invalid credentials" });
        // Block login if email not verified yet
        if (user.emailVerified === false) {
            return res.status(403).json({ message: "Email not verified. Please verify your email to continue." });
        }
        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                businessType: user.businessType,
                emailVerified: user.emailVerified,
            },
            token: generateToken(user._id.toString(), user.role || 'customer'),
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.login = login;
// ================= FORGOT PASSWORD =================
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User_1.default.findOne({ email });
        if (!user)
            return res.status(400).json({ message: "User not found" });
        // Generate token
        const token = crypto_1.default.randomBytes(32).toString("hex");
        user.resetToken = token;
        user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        await user.save();
        // Send email
        const transporter = nodemailer_1.default.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        // Determine frontend base URL robustly
        const originHeader = (req.headers["origin"] || req.headers["referer"]);
        const rawOrigins = (process.env.FRONTEND_URLS || "")
            .split(",")
            .map(o => o.trim())
            .filter(Boolean);
        const primaryFromList = rawOrigins.length > 0 ? rawOrigins[0] : undefined;
        const frontendUrl = (process.env.FRONTEND_URL || primaryFromList || originHeader || "https://zarvo.onrender.com").replace(/\/$/, "");
        const resetUrl = `${frontendUrl}/reset-password/${token}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Password Reset",
            html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link valid for 1 hour.</p>`,
        });
        res.status(200).json({ message: "Password reset email sent" });
    }
    catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.forgotPassword = forgotPassword;
// ================= RESET PASSWORD =================
const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        const user = await User_1.default.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: new Date() },
        });
        if (!user)
            return res.status(400).json({ message: "Invalid or expired token" });
        user.password = password;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();
        res.status(200).json({ message: "Password reset successful" });
    }
    catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.resetPassword = resetPassword;
// ================= UPDATE ME =================
const updateMe = async (req, res) => {
    try {
        const userId = req.user?._id?.toString?.() || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        const { name, phone, businessType } = req.body;
        const updated = await User_1.default.findByIdAndUpdate(userId, {
            $set: {
                ...(name !== undefined ? { name } : {}),
                ...(phone !== undefined ? { phone } : {}),
                ...(businessType !== undefined ? { businessType } : {}),
            },
        }, { new: true }).select("-password");
        if (!updated)
            return res.status(404).json({ message: "User not found" });
        return res.json({
            user: {
                id: updated._id,
                name: updated.name,
                email: updated.email,
                phone: updated.phone,
                role: updated.role,
                businessType: updated.businessType,
                approvalStatus: updated.approvalStatus,
                isApproved: updated.isApproved,
            },
        });
    }
    catch (error) {
        console.error("updateMe error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.updateMe = updateMe;
