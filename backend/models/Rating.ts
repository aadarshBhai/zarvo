import mongoose, { Schema, Document } from "mongoose";

export interface IRating extends Document {
  userId: mongoose.Types.ObjectId; // User who rated
  doctorId: string;                // We use businessId (provider) as doctor identifier
  value: number;                   // 0 - 5
  createdAt: Date;
  updatedAt: Date;
}

const RatingSchema: Schema<IRating> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: String, required: true },
    value: { type: Number, required: true, min: 0, max: 5 },
  },
  { timestamps: true }
);

// Enforce one rating per user per doctor
RatingSchema.index({ userId: 1, doctorId: 1 }, { unique: true });

export const Rating = mongoose.model<IRating>("Rating", RatingSchema);
