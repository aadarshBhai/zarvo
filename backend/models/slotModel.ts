import mongoose, { Schema, Document } from "mongoose";

export interface ISlot extends Document {
  date: string;
  time: string;
  duration: number;
  price: number;
  department: string;
  isBooked: boolean;
  businessId: string;
  doctor: {
    name: string;
    location: string;
    rating: number;
    email?: string;
    contactEmail?: string;
  };
}

const slotSchema = new Schema<ISlot>(
  {
    date: { type: String, required: true },
    time: { type: String, required: true },
    duration: { type: Number, required: true },
    price: { type: Number, required: true },
    department: { type: String, required: true },
    isBooked: { type: Boolean, default: false },
    businessId: { type: String, required: true },
    doctor: {
      name: { type: String, required: true },
      location: { type: String, required: true },
      rating: { type: Number, default: 0 },
      email: { type: String, default: "" },
      contactEmail: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

const Slot = mongoose.model<ISlot>("Slot", slotSchema);
export default Slot;
