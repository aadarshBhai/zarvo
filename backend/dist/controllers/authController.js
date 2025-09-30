"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMe = exports.resetPassword = exports.forgotPassword = exports.login = exports.deleteAccount = exports.resendOtp = exports.verifyEmail = exports.getMe = exports.signup = void 0;
const User_1 = __importDefault(require("../models/User"));
const slotModel_1 = __importDefault(require("../models/slotModel"));
const Booking_1 = require("../models/Booking");
const Ticket_1 = require("../models/Ticket");
const Doctor_1 = __importDefault(require("../models/Doctor"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const emailService_1 = require("../services/emailService");
const socket_1 = require("../socket");
const generateToken = (userId, role) => jsonwebtoken_1.default.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
// ================= SIGNUP =================
const signup = async (req, res) => {
    try {
        const { email, role } = req.body;
        const requireEmailVerification = String(process.env.REQUIRE_EMAIL_VERIFICATION || 'false').toLowerCase() === 'true';
        // Prevent creating admin accounts via public signup
        if (role === 'admin') {
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
            emailVerified: requireEmailVerification ? false : true,
        };
        // Save all fields from req.body (name, email, password, phone, role, businessType, etc.)
        const user = await User_1.default.create(payload);
        // Email verification handling (OTP) only if required
        if (requireEmailVerification) {
            const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
            user.emailVerificationOTP = otp;
            user.emailVerificationExpiry = new Date(Date.now() + 15 * 60 * 1000);
            await user.save();
            try {
                const resSend = await (0, emailService_1.sendOtpEmail)(user.email, otp, 'Verify your email');
                if (!resSend.success) {
                    console.error('Failed to send verification email', resSend.error);
                }
            }
            catch (e) {
                console.error("Failed to send verification email", e);
            }
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
            message: requireEmailVerification
                ? "Signup successful. Please verify your email with the OTP sent to you."
                : "Signup successful.",
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
// ================= GET ME =================
const getMe = async (req, res) => {
    try {
        const userId = req.user?._id?.toString?.() || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        const user = await User_1.default.findById(userId).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        return res.json({
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
            },
        });
    }
    catch (error) {
        console.error("getMe error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.getMe = getMe;
// Google login removed per request
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
        const sendRes = await (0, emailService_1.sendOtpEmail)(user.email, otp, 'Email Verification');
        if (!sendRes.success) {
            console.error('resendOtp: failed to send OTP', sendRes.error);
            return res.status(500).json({ message: "Failed to send OTP email" });
        }
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
        // External auth account deletion skipped (Firebase removed)
        const role = existing.role || 'customer';
        const email = existing.email;
        if (role === 'customer') {
            // Customer: delete their bookings and tickets, and free up slots
            const bookings = await Booking_1.Booking.find({ customerEmail: email });
            const bookingIds = bookings.map(b => b._id);
            const slotIds = bookings.map(b => b.slotId).filter(Boolean);
            // Delete tickets first
            if (bookingIds.length > 0) {
                await Ticket_1.Ticket.deleteMany({ bookingId: { $in: bookingIds } });
            }
            // Delete bookings
            if (bookingIds.length > 0) {
                await Booking_1.Booking.deleteMany({ _id: { $in: bookingIds } });
            }
            // Mark related slots as available
            if (slotIds.length > 0) {
                await slotModel_1.default.updateMany({ _id: { $in: slotIds } }, { $set: { isBooked: false } });
                try {
                    const io = (0, socket_1.getIO)();
                    slotIds.forEach(id => io.emit('slotUpdated', { id: String(id), slotId: String(id), isBooked: false }));
                }
                catch { }
            }
        }
        else if (role === 'doctor' || role === 'business') {
            // Provider: delete their slots, bookings tied to those slots, tickets, and doctor profile
            const slots = await slotModel_1.default.find({ businessId: userId });
            const slotIds = slots.map(s => s._id);
            if (slotIds.length > 0) {
                const bookings = await Booking_1.Booking.find({ slotId: { $in: slotIds } });
                const bookingIds = bookings.map(b => b._id);
                if (bookingIds.length > 0) {
                    await Ticket_1.Ticket.deleteMany({ bookingId: { $in: bookingIds } });
                    await Booking_1.Booking.deleteMany({ _id: { $in: bookingIds } });
                    try {
                        const io = (0, socket_1.getIO)();
                        bookingIds.forEach(id => io.emit('bookingCancelled', { id: String(id) }));
                    }
                    catch { }
                }
                await slotModel_1.default.deleteMany({ _id: { $in: slotIds } });
                try {
                    const io = (0, socket_1.getIO)();
                    slotIds.forEach(id => io.emit('slotDeleted', { id: String(id), slotId: String(id) }));
                }
                catch { }
            }
            // Remove doctor profile(s)
            await Doctor_1.default.deleteMany({ businessId: userId });
        }
        await User_1.default.findByIdAndDelete(userId);
        return res.status(200).json({ message: "Account and related data deleted" });
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
        if (!user) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`[LOGIN] user not found: ${email}`);
                return res.status(400).json({ message: "User not found" });
            }
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`[LOGIN] incorrect password for: ${email}`);
                return res.status(400).json({ message: "Incorrect password" });
            }
            return res.status(400).json({ message: "Invalid credentials" });
        }
        // Block login if email verification is required AND user not verified
        const requireEmailVerification = String(process.env.REQUIRE_EMAIL_VERIFICATION || 'false').toLowerCase() === 'true';
        if (requireEmailVerification && user.emailVerified === false) {
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
                approvalStatus: user.approvalStatus,
                isApproved: user.isApproved,
                emailVerified: user.emailVerified,
            },
            token: generateToken(String(user._id), user.role || 'customer'),
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
        // Determine frontend base URL robustly
        const originHeader = (req.headers["origin"] || req.headers["referer"]);
        const rawOrigins = (process.env.FRONTEND_URLS || "")
            .split(",")
            .map(o => o.trim())
            .filter(Boolean);
        const primaryFromList = rawOrigins.length > 0 ? rawOrigins[0] : undefined;
        const frontendUrl = (process.env.FRONTEND_URL || primaryFromList || originHeader || "https://zarvo.onrender.com").replace(/\/$/, "");
        const resetUrl = `${frontendUrl}/reset-password/${token}`;
        // Send email via centralized mailer
        const sendRes = await (0, emailService_1.sendPasswordResetEmail)(user.email, resetUrl);
        if (!sendRes.success) {
            console.error("Forgot password mail send failed:", sendRes.error);
            return res.status(500).json({ message: "Failed to send reset email" });
        }
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
        // Auto-login after reset: return JWT and user profile
        return res.status(200).json({
            message: "Password reset successful",
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
            },
            token: generateToken(user._id.toString(), user.role || 'customer'),
        });
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
