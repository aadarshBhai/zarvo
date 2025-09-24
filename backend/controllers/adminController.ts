import { Request, Response } from "express";
import User from "../models/User";
import { getIO } from "../socket";

// GET /api/admin/users
export const listUsers = async (req: Request, res: Response) => {
  try {
    const { role, status, q } = req.query as { role?: string; status?: string; q?: string };
    const filter: any = {};

    if (role && role !== "all") filter.role = role;

    if (status && status !== "all") {
      if (status === "active") filter.isActive = true;
      else if (status === "inactive") filter.isActive = false;
      else if (status === "pending") filter.approvalStatus = "pending";
      else if (status === "approved") filter.approvalStatus = "approved";
      else if (status === "rejected") filter.approvalStatus = "rejected";
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    return res.json({ data: users });
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/pending-doctors
export const listPendingDoctors = async (_req: Request, res: Response) => {
  try {
    const doctors = await User.find({
      role: { $in: ["doctor", "business"] },
      approvalStatus: "pending",
    }).select("-password").sort({ createdAt: -1 });
    return res.json({ data: doctors });
  } catch (err) {
    console.error("listPendingDoctors error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/admin/doctors/:id/approve
export const approveDoctor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { approvalStatus: "approved", isApproved: true },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    try {
      getIO().emit("doctorApproved", { id: user._id, email: user.email, name: user.name });
    } catch {}

    return res.json({ message: "Doctor approved", user });
  } catch (err) {
    console.error("approveDoctor error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/admin/doctors/:id/reject
export const rejectDoctor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { approvalStatus: "rejected", isApproved: false },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    try {
      getIO().emit("doctorRejected", { id: user._id, email: user.email, name: user.name });
    } catch {}

    return res.json({ message: "Doctor rejected", user });
  } catch (err) {
    console.error("rejectDoctor error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/admin/users/:id
export const removeUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await User.findById(id);
    if (!existing) return res.status(404).json({ message: "User not found" });

    await User.findByIdAndDelete(id);

    try {
      getIO().emit("userRemoved", { id });
    } catch {}

    return res.json({ message: "User removed" });
  } catch (err) {
    console.error("removeUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
