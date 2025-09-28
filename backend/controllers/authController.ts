import { Request, Response } from "express";
import User from "../models/User";
import Slot from "../models/slotModel";
import { Booking } from "../models/Booking";
import { Ticket } from "../models/Ticket";
import Doctor from "../models/Doctor";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { getIO } from "../socket";

const generateToken = (userId: string, role: string) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET!, { expiresIn: "7d" });

// ================= SIGNUP =================
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;
    const requireEmailVerification = String(process.env.REQUIRE_EMAIL_VERIFICATION || 'false').toLowerCase() === 'true';

    // Prevent creating admin accounts via public signup
    if (role === 'admin') {
      return res.status(403).json({ message: "Admin accounts cannot be created via public signup" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Build payload with proper defaults
    const isDoctorOrBusiness = role === 'doctor' || role === 'business';
    const payload: any = {
      ...req.body,
      role: role || 'customer',
      approvalStatus: isDoctorOrBusiness ? 'pending' : 'approved',
      isApproved: isDoctorOrBusiness ? false : true,
      isActive: true,
      emailVerified: requireEmailVerification ? false : true,
    };
    // Save all fields from req.body (name, email, password, phone, role, businessType, etc.)
    const user = await User.create(payload);

    // Email verification handling (OTP) only if required
    if (requireEmailVerification) {
      const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
      (user as any).emailVerificationOTP = otp;
      (user as any).emailVerificationExpiry = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER!,
            pass: process.env.EMAIL_PASS!,
          },
        });
        await transporter.sendMail({
          from: process.env.EMAIL_USER!,
          to: user.email,
          subject: "Verify your email",
          html: `<p>Your verification code is <b>${otp}</b>. It expires in 15 minutes.</p>`
        });
      } catch (e) {
        console.error("Failed to send verification email", e);
      }
    }

    // Emit realtime event for admin dashboards if doctor/business signup pending
    if (isDoctorOrBusiness) {
      try {
        getIO().emit('doctorSignupPending', {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          approvalStatus: user.approvalStatus,
          isApproved: user.isApproved,
          createdAt: (user as any).createdAt,
        });
      } catch (e) {
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
        approvalStatus: (user as any).approvalStatus,
        isApproved: (user as any).isApproved,
        emailVerified: (user as any).emailVerified,
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET ME =================
export const getMe = async (req: Request & { user?: any }, res: Response) => {
  try {
    const userId = req.user?._id?.toString?.() || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      user: {
        id: (user as any)._id,
        name: (user as any).name,
        email: (user as any).email,
        phone: (user as any).phone,
        role: (user as any).role,
        businessType: (user as any).businessType,
        approvalStatus: (user as any).approvalStatus,
        isApproved: (user as any).isApproved,
        emailVerified: (user as any).emailVerified,
      },
    });
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Google login removed per request

// ================= VERIFY EMAIL (OTP) =================
export const verifyEmail = async (req: Request, res: Response) => {
  const { email, otp } = req.body as { email: string; otp: string };
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if ((user as any).emailVerified === true) {
      return res.status(200).json({ message: "Email already verified" });
    }

    const expected = (user as any).emailVerificationOTP;
    const expiry = (user as any).emailVerificationExpiry as Date | undefined;
    if (!expected || !expiry || new Date() > new Date(expiry)) {
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }
    if (String(otp) !== String(expected)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    (user as any).emailVerified = true;
    (user as any).emailVerificationOTP = undefined;
    (user as any).emailVerificationExpiry = undefined;
    await user.save();

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (e) {
    console.error("verifyEmail error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

// ================= RESEND OTP =================
export const resendOtp = async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if ((user as any).emailVerified === true) {
      return res.status(200).json({ message: "Email already verified" });
    }
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    (user as any).emailVerificationOTP = otp;
    (user as any).emailVerificationExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER!, pass: process.env.EMAIL_PASS! },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER!,
      to: user.email,
      subject: "Your OTP code",
      html: `<p>Your verification code is <b>${otp}</b>. It expires in 15 minutes.</p>`,
    });
    return res.status(200).json({ message: "OTP sent" });
  } catch (e) {
    console.error("resendOtp error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

  // ================= DELETE ACCOUNT =================
  export const deleteAccount = async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user?._id?.toString?.() || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const existing = await User.findById(userId);
      if (!existing) {
        return res.status(404).json({ message: "User not found" });
      }

      // External auth account deletion skipped (Firebase removed)

      const role = (existing as any).role || 'customer';
      const email = (existing as any).email;

      if (role === 'customer') {
        // Customer: delete their bookings and tickets, and free up slots
        const bookings = await Booking.find({ customerEmail: email });
        const bookingIds = bookings.map(b => (b as any)._id);
        const slotIds = bookings.map(b => (b as any).slotId).filter(Boolean);

        // Delete tickets first
        if (bookingIds.length > 0) {
          await Ticket.deleteMany({ bookingId: { $in: bookingIds } });
        }
        // Delete bookings
        if (bookingIds.length > 0) {
          await Booking.deleteMany({ _id: { $in: bookingIds } });
        }
        // Mark related slots as available
        if (slotIds.length > 0) {
          await Slot.updateMany({ _id: { $in: slotIds } }, { $set: { isBooked: false } });
          try {
            const io = getIO();
            slotIds.forEach(id => io.emit('slotUpdated', { id: String(id), slotId: String(id), isBooked: false }));
          } catch {}
        }
      } else if (role === 'doctor' || role === 'business') {
        // Provider: delete their slots, bookings tied to those slots, tickets, and doctor profile
        const slots = await Slot.find({ businessId: userId });
        const slotIds = slots.map(s => (s as any)._id);

        if (slotIds.length > 0) {
          const bookings = await Booking.find({ slotId: { $in: slotIds as any } });
          const bookingIds = bookings.map(b => (b as any)._id);

          if (bookingIds.length > 0) {
            await Ticket.deleteMany({ bookingId: { $in: bookingIds } });
            await Booking.deleteMany({ _id: { $in: bookingIds } });
            try {
              const io = getIO();
              bookingIds.forEach(id => io.emit('bookingCancelled', { id: String(id) }));
            } catch {}
          }

          await Slot.deleteMany({ _id: { $in: slotIds } });
          try {
            const io = getIO();
            slotIds.forEach(id => io.emit('slotDeleted', { id: String(id), slotId: String(id) }));
          } catch {}
        }

        // Remove doctor profile(s)
        await Doctor.deleteMany({ businessId: userId });
      }

      await User.findByIdAndDelete(userId);
      return res.status(200).json({ message: "Account and related data deleted" });
    } catch (error) {
      console.error("Delete account error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };

// ================= LOGIN =================
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
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
    if (requireEmailVerification && (user as any).emailVerified === false) {
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
        approvalStatus: (user as any).approvalStatus,
        isApproved: (user as any).isApproved,
        emailVerified: (user as any).emailVerified,
      },
      token: generateToken(user._id.toString(), (user as any).role || 'customer'),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= FORGOT PASSWORD =================
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
      },
    });

    // Determine frontend base URL robustly
    const originHeader = (req.headers["origin"] || req.headers["referer"]) as string | undefined;
    const rawOrigins = (process.env.FRONTEND_URLS || "")
      .split(",")
      .map(o => o.trim())
      .filter(Boolean);
    const primaryFromList = rawOrigins.length > 0 ? rawOrigins[0] : undefined;
    const frontendUrl = (process.env.FRONTEND_URL || primaryFromList || originHeader || "https://zarvo.onrender.com").replace(/\/$/, "");
    const resetUrl = `${frontendUrl}/reset-password/${token}`;


    await transporter.sendMail({
      from: process.env.EMAIL_USER!,
      to: user.email,
      subject: "Password Reset",
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link valid for 1 hour.</p>`,
    });

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= RESET PASSWORD =================
export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;
  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    // Auto-login after reset: return JWT and user profile
    return res.status(200).json({
      message: "Password reset successful",
      user: {
        id: (user as any)._id,
        name: (user as any).name,
        email: (user as any).email,
        phone: (user as any).phone,
        role: (user as any).role,
        businessType: (user as any).businessType,
        approvalStatus: (user as any).approvalStatus,
        isApproved: (user as any).isApproved,
        emailVerified: (user as any).emailVerified,
      },
      token: generateToken((user as any)._id.toString(), (user as any).role || 'customer'),
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE ME =================
export const updateMe = async (req: Request & { user?: any }, res: Response) => {
  try {
    const userId = req.user?._id?.toString?.() || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { name, phone, businessType } = req.body as {
      name?: string;
      phone?: string;
      businessType?: string;
    };

    const updated = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          ...(name !== undefined ? { name } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(businessType !== undefined ? { businessType } : {}),
        },
      },
      { new: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json({
      user: {
        id: updated._id,
        name: updated.name,
        email: updated.email,
        phone: (updated as any).phone,
        role: (updated as any).role,
        businessType: (updated as any).businessType,
        approvalStatus: (updated as any).approvalStatus,
        isApproved: (updated as any).isApproved,
      },
    });
  } catch (error) {
    console.error("updateMe error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
