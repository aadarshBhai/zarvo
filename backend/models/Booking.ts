import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  slotId: mongoose.Types.ObjectId;          // Link to the booked slot
  customerName: string;                     // Customer info
  customerEmail: string;
  customerPhone: string;
  customerAge: number;                      // NEW field
  customerGender: "Male" | "Female" | "Other"; // NEW field
  doctor: {                                 // Embedded doctor info (copied from slot)
    name: string;
    location: string;
    rating: number;
  };
  fee: number;                              // Slot fee
  bookingNumber: string;                    // Unique booking number
  status: "booked" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema: Schema<IBooking> = new Schema(
  {
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: "Slot", required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerAge: { type: Number, required: true }, // Added
    customerGender: { 
      type: String, 
      enum: ["Male", "Female", "Other"], 
      required: true 
    }, // Added
    doctor: {
      name: { type: String, required: true },
      location: { type: String, required: true },
      rating: { type: Number, default: 0 },
    },
    fee: { type: Number, required: true },
    bookingNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: ["booked", "completed", "cancelled"], default: "booked" },
  },
  { timestamps: true }
);

export const Booking = mongoose.model<IBooking>("Booking", BookingSchema);
