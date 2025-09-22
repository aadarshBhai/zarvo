import mongoose, { Schema, Document } from "mongoose";

export interface ITicket extends Document {
  bookingId: mongoose.Types.ObjectId;
  doctorName: string;
  doctorLocation: string;
  doctorContact: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  time: string;
  price: number;
  bookingNumber: string;
}

const TicketSchema: Schema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    doctorName: { type: String, required: true },
    doctorLocation: { type: String, required: true },
    doctorContact: { type: String, default: "N/A" },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    price: { type: Number, required: true },
    bookingNumber: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const Ticket = mongoose.model<ITicket>("Ticket", TicketSchema);
