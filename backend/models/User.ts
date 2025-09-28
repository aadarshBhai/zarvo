import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  [key: string]: any; // <- This allows any extra fields
  resetToken?: string;
  resetTokenExpiry?: Date;
  emailVerified?: boolean;
  emailVerificationOTP?: string;
  emailVerificationExpiry?: Date;
  role?: "customer" | "business" | "doctor" | "admin";
  // approvalStatus is for business/doctor accounts: 'pending' | 'approved' | 'rejected'
  approvalStatus?: string;
  isApproved?: boolean; // derived convenience flag
  isActive?: boolean;
  deletedAt?: Date | null;
  comparePassword: (password: string) => Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["customer", "business", "doctor", "admin"], default: "customer" },
  approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
  isApproved: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  emailVerificationOTP: { type: String },
  emailVerificationExpiry: { type: Date },
  deletedAt: { type: Date, default: null },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
}, { strict: false, timestamps: true }); // <- Important: allows saving extra fields

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>("User", UserSchema);
