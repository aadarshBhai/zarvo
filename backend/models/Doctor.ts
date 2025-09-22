import mongoose, { Schema, Document } from "mongoose";

export interface IDoctor extends Document {
  name: string;
  rating: number;
  location: string;
  department: string;
  businessId: string;
}

const doctorSchema = new Schema<IDoctor>(
  {
    name: { type: String, required: true },
    rating: { type: Number, default: 0 },
    location: { type: String, required: true },
    department: { type: String, required: true },
    businessId: { type: String, required: true },
  },
  { timestamps: true }
);

const Doctor = mongoose.model<IDoctor>("Doctor", doctorSchema);
export default Doctor;
