import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "doctor" | "customer" | "admin";
  location?: string;
  rating?: number;
}

const UserSchema: Schema<IUser> = new Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["doctor", "customer", "admin"], default: "customer" },
  location: { type: String },
  rating: { type: Number, default: 4.5 },
});

export default mongoose.model<IUser>("User", UserSchema);
