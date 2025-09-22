import React, { useEffect, useState } from "react";
import axios from "axios";
import QRCode from "qrcode";

interface Booking {
  _id: string;
  slotId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAge: number;
  customerGender: string;
  doctor: {
    name: string;
    location: string;
    rating: number;
  };
  fee: number;
  bookingNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const MyBookings: React.FC = () => {
  const API_URL = "http://localhost:5000/api";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await axios.get(`${API_URL}/bookings/my-bookings`);
        setBookings(res.data.data || []);

        // Generate QR codes
        (res.data.data || []).forEach(async (booking: Booking) => {
          const text = `Doctor: ${booking.doctor.name}\nLocation: ${booking.doctor.location}\nBooking: ${booking.bookingNumber}\nFee: ₹${booking.fee}\nStatus: ${booking.status}`;
          const qr = await QRCode.toDataURL(text);
          setQrCodes(prev => ({ ...prev, [booking._id]: qr }));
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchBookings();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">My Bookings</h2>

      {bookings.length === 0 && <p>No bookings yet.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bookings.map(booking => (
          <div key={booking._id} className="border p-4 rounded shadow">
            <p><strong>Doctor:</strong> {booking.doctor.name}</p>
            <p><strong>Location:</strong> {booking.doctor.location}</p>
            <p><strong>Booking Number:</strong> {booking.bookingNumber}</p>
            <p><strong>Fee:</strong> ₹{booking.fee}</p>
            <p><strong>Status:</strong> {booking.status}</p>
            <p><strong>Customer:</strong> {booking.customerName}</p>
            <p><strong>Email:</strong> {booking.customerEmail}</p>
            <p><strong>Phone:</strong> {booking.customerPhone}</p>
            <p><strong>Booked on:</strong> {new Date(booking.createdAt).toLocaleDateString()}</p>
            {qrCodes[booking._id] && (
              <img src={qrCodes[booking._id]} alt="QR Code" className="mt-2" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyBookings;
