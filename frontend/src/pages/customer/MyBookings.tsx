import React, { useEffect, useState } from "react";
import axios from "axios";
import QRCode from "qrcode";
import { API_BASE } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";

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
  const API_URL = API_BASE;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { user } = useAuth();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem("zarvo_token");
        if (!token || !user?.email) {
          setBookings([]);
          setError(token ? "" : "Please sign in to view your bookings.");
          return;
        }

        const res = await axios.get<{ data: Booking[] } | Booking[]>(
          `${API_URL}/bookings/my-bookings`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const list: Booking[] = Array.isArray((res.data as any)?.data)
          ? (res.data as { data: Booking[] }).data
          : (Array.isArray(res.data) ? (res.data as Booking[]) : []);
        // Defensive filter: ensure only bookings belonging to the current user are shown
        const mine = user?.email ? list.filter(b => b.customerEmail === user.email) : [];
        setBookings(mine);

        // Generate QR codes
        list.forEach(async (booking: Booking) => {
          const text = `Doctor: ${booking.doctor.name}\nLocation: ${booking.doctor.location}\nBooking: ${booking.bookingNumber}\nFee: ₹${booking.fee}\nStatus: ${booking.status}`;
          const qr = await QRCode.toDataURL(text);
          setQrCodes(prev => ({ ...prev, [booking._id]: qr }));
        });
      } catch (err: any) {
        console.error(err);
        if (err?.response?.status === 401) {
          setError("Please sign in to view your bookings.");
        } else {
          setError(err?.response?.data?.message || "Failed to load bookings");
        }
      }
    };

    fetchBookings();
  }, [API_URL, user?.email]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">My Bookings</h2>
      {message && <div className="mb-3 text-green-600">{message}</div>}
      {error && <div className="mb-3 text-red-600">{error}</div>}

      {bookings.filter(b => b.status !== 'cancelled').length === 0 && !error && <p>No bookings yet.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bookings.filter(b => b.status !== 'cancelled').map(booking => (
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
            <div className="mt-3">
              <button
                className={`px-3 py-2 rounded text-white ${booking.status === 'booked' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'}`}
                disabled={booking.status !== 'booked'}
                onClick={async () => {
                  try {
                    setMessage("");
                    setError("");
                    const token = localStorage.getItem("zarvo_token");
                    await axios.post(
                      `${API_URL}/bookings/${booking._id}/cancel`,
                      {},
                      token ? { headers: { Authorization: `Bearer ${token}` } } : {}
                    );
                    // remove locally so it disappears immediately
                    setBookings(prev => prev.filter(b => b._id !== booking._id));
                    setMessage("Booking cancelled successfully");
                  } catch (err: any) {
                    const msg = err?.response?.data?.message || "Failed to cancel booking";
                    setError(msg);
                  }
                }}
              >
                Cancel Booking
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyBookings;
