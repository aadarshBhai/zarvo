import { Request, Response } from "express";
import { Rating } from "../models/Rating";
import Doctor from "../models/Doctor";
import { getIO } from "../socket";

// POST /api/ratings
export const rateDoctor = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { doctorId, value } = req.body as { doctorId: string; value: number };
    if (!doctorId || typeof value !== 'number') {
      return res.status(400).json({ message: "doctorId and numeric value are required" });
    }
    if (value < 0 || value > 5) {
      return res.status(400).json({ message: "value must be between 0 and 5" });
    }

    const userId = req.user?._id?.toString?.();
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    // Disallow editing existing ratings: one rating per user per doctor (no updates)
    const existing = await Rating.findOne({ userId, doctorId });
    if (existing) {
      return res.status(409).json({ message: "You have already rated this doctor" });
    }
    await Rating.create({ userId, doctorId, value });

    // Recompute average and count
    const agg = await Rating.aggregate([
      { $match: { doctorId } },
      { $group: { _id: "$doctorId", avg: { $avg: "$value" }, count: { $sum: 1 } } }
    ]);
    const avg = agg[0]?.avg || 0;
    const count = agg[0]?.count || 0;

    // Persist on Doctor
    await Doctor.updateOne({ businessId: doctorId }, { $set: { rating: avg, ratingCount: count } });

    // Emit realtime update
    try {
      const io = getIO();
      io.emit("doctorRatingUpdated", { doctorId, average: avg, count });
    } catch {}

    return res.status(200).json({ success: true, average: avg, count, myRating: value });
  } catch (error: any) {
    console.error("rateDoctor error:", error);
    return res.status(500).json({ message: error?.message || "Server error" });
  }
};

// GET /api/ratings/:doctorId
export const getDoctorRating = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { doctorId } = req.params as { doctorId: string };
    if (!doctorId) return res.status(400).json({ message: "doctorId required" });

    const agg = await Rating.aggregate([
      { $match: { doctorId } },
      { $group: { _id: "$doctorId", avg: { $avg: "$value" }, count: { $sum: 1 } } }
    ]);
    const avg = agg[0]?.avg || 0;
    const count = agg[0]?.count || 0;

    let myRating: number | undefined = undefined;
    const userId = req.user?._id?.toString?.();
    if (userId) {
      const mine = await Rating.findOne({ userId, doctorId });
      if (mine) myRating = mine.value;
    }

    return res.status(200).json({ success: true, average: avg, count, myRating });
  } catch (error: any) {
    console.error("getDoctorRating error:", error);
    return res.status(500).json({ message: error?.message || "Server error" });
  }
};
