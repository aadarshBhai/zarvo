import { Request, Response } from "express";
import User from "../models/User";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";

// JWT token generator
const generateToken = (userId: string) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET!, { expiresIn: "7d" });

// ================= SIGNUP =================
export const signup = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Save all fields from req.body (name, email, password, phone, role, businessType, etc.)
    const user = await User.create(req.body);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        businessType: user.businessType,
      },
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
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

    await User.findByIdAndDelete(userId);
    return res.status(200).json({ message: "Account deleted" });
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
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        businessType: user.businessType,
      },
      token: generateToken(user._id.toString()),
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

const frontendUrl = process.env.FRONTEND_URL; 
const resetUrl = `${frontendUrl?.replace(/\/$/, "")}/reset-password/${token}`;




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

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
