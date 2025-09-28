// src/pages/customer/BookSlot.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useBooking, TimeSlot } from "../../contexts/BookingContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { API_BASE } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";

interface BookingUser {
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
}

const BookSlot: React.FC = () => {
  const { slots, refreshSlots, bookSlot } = useBooking();
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);

  // Filters
  const [searchName, setSearchName] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [minRating, setMinRating] = useState<number>(0);

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<BookingUser>({
    name: "",
    email: "",
    phone: "",
    age: 0,
    gender: "",
  });

  // Load slots initially
  useEffect(() => {
    const loadSlots = async () => {
      try {
        setLoading(true);
        await refreshSlots();
      } catch (err) {
        console.error(err);
        setError("Could not load slots. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    loadSlots();
  }, [refreshSlots]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUserForm({ ...userForm, [e.target.name]: e.target.value });
  };

  const handleBook = async () => {
    if (!selectedSlotId) return;
    if (!userForm.name || !userForm.email || !userForm.phone || !userForm.age || !userForm.gender) {
      setError("All fields are required.");
      return;
    }

    try {
      setBookingInProgress(selectedSlotId);
      setError(null);
      setSuccessMessage(null);

      const bookedSlot = await bookSlot(selectedSlotId, userForm);

      if (bookedSlot) {
        setSuccessMessage(
          `Successfully booked a ${bookedSlot.department} slot on ${bookedSlot.date} at ${bookedSlot.time}.`
        );
        setUserForm({ name: "", email: "", phone: "", age: 0, gender: "" });
        setSelectedSlotId(null);
      }
    } catch (err: any) {
      console.error("Booking error:", err);
      setError("Booking failed. Please try again.");
    } finally {
      setBookingInProgress(null);
    }
  };

  const availableSlots = slots.filter((s) => !s.isBooked);

  // Build department list from available slots
  const departments = useMemo(() => {
    const set = new Set<string>();
    availableSlots.forEach(s => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set).sort();
  }, [availableSlots]);

  const filtered = useMemo(() => {
    return availableSlots.filter((s) => {
      const nameOk = searchName.trim().length === 0 || (s.doctor?.name || "").toLowerCase().includes(searchName.trim().toLowerCase());
      const deptOk = !departmentFilter || s.department === departmentFilter;
      const ratingVal = typeof s.doctor?.rating === 'number' ? s.doctor.rating : 0;
      const ratingOk = ratingVal >= minRating;
      return nameOk && deptOk && ratingOk;
    });
  }, [availableSlots, searchName, departmentFilter, minRating]);
  const selectedSlot = selectedSlotId ? slots.find((s) => s.id === selectedSlotId) : null;

  // Display helper: 24h -> 12h
  const to12h = (time24: string): string => {
    const m = time24?.match(/^(\d{2}):(\d{2})$/);
    if (!m) return time24;
    let hour = parseInt(m[1], 10);
    const min = m[2];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${min} ${ampm}`;
  };

  // Rating UI state
  const [ratingSubmitting, setRatingSubmitting] = useState<string | null>(null);
  const [pendingRatings, setPendingRatings] = useState<Record<string, number>>({}); // key: doctorId(businessId)

  const submitRating = async (doctorId?: string) => {
    if (!doctorId) return;
    if (!user) {
      setError("Please sign in to rate this doctor.");
      return;
    }
    const value = pendingRatings[doctorId];
    if (typeof value !== 'number') {
      setError("Please select a rating first.");
      return;
    }
    try {
      setRatingSubmitting(doctorId);
      setError(null);
      const token = localStorage.getItem('zarvo_token');
      const res = await fetch(`${API_BASE}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ doctorId, value }),
      });
      if (res.status === 409) {
        setError("You have already rated this doctor.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to submit rating');
      }
      // Optimistic UI: no need to update here; realtime event will refresh ratings
    } catch (e: any) {
      setError(e?.message || 'Failed to submit rating');
    } finally {
      setRatingSubmitting(null);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Book Slot</h1>
        <div className="text-gray-600 mb-6">
          Select an available slot and confirm your details to book.
        </div>

        {error && <div className="mb-4 text-red-600 font-medium">{error}</div>}
        {successMessage && <div className="mb-4 text-green-600 font-medium">{successMessage}</div>}

        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading slots...</div>
        ) : availableSlots.length === 0 ? (
          <div className="text-center text-gray-600 py-10">No slots available right now.</div>
        ) : (
          <>
            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                className="p-2 border rounded-lg"
                placeholder="Search by doctor name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
              <select
                className="p-2 border rounded-lg"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                className="p-2 border rounded-lg"
                value={String(minRating)}
                onChange={(e) => setMinRating(parseFloat(e.target.value) || 0)}
              >
                {[0,1,2,3,4,4.5,5].map(v => (
                  <option key={v} value={v}>{v}+ stars</option>
                ))}
              </select>
              <button
                className="p-2 border rounded-lg bg-gray-100"
                onClick={() => { setSearchName(""); setDepartmentFilter(""); setMinRating(0); }}
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((slot: TimeSlot) => (
              <Card
                key={slot.id || `${slot.date}-${slot.time}`}
                className="p-5 bg-white rounded-2xl shadow-md border border-gray-200"
              >
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {slot.department}
                </h2>
                <div className="text-gray-600 text-sm">
                  {slot.date} at {to12h(slot.time)}
                </div>
                <div className="text-gray-600 text-sm">
                  Duration: {slot.duration} minutes
                </div>
                <div className="mt-3 text-sm">
                  <div>
                    <span className="font-medium">Doctor:</span>{" "}
                    {slot.doctor?.name || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span>{" "}
                    {slot.doctor?.location || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Rating:</span>{" "}
                    {slot.doctor?.rating || 0}★
                  </div>
                </div>
                {/* Rating control (login required, one-time) */}
                <div className="mt-3 flex items-center gap-2">
                  <select
                    className="p-2 border rounded-lg"
                    value={String(pendingRatings[slot.businessId || ''] ?? '')}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setPendingRatings(prev => ({ ...prev, [slot.businessId || '']: isNaN(v) ? undefined as any : v }));
                    }}
                    disabled={!slot.businessId}
                  >
                    <option value="">Rate this doctor</option>
                    {[1,2,3,4,5].map(v => (
                      <option key={v} value={v}>{v} star{v>1?'s':''}</option>
                    ))}
                  </select>
                  <Button
                    variant="secondary"
                    disabled={!slot.businessId || ratingSubmitting === (slot.businessId as string)}
                    onClick={() => submitRating(slot.businessId)}
                  >
                    {ratingSubmitting === slot.businessId ? 'Submitting...' : 'Submit'}
                  </Button>
                </div>
                <div className="mt-2 font-medium text-gray-800">
                  Price: ₹{slot.price}
                </div>
                <Button
                  onClick={() => setSelectedSlotId(slot.id)}
                  disabled={bookingInProgress === slot.id}
                  className="mt-4 w-full"
                >
                  {bookingInProgress === slot.id ? "Processing..." : "Book"}
                </Button>
              </Card>
            ))}
            </div>
          </>
        )}

        {selectedSlotId && selectedSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    value={userForm.name}
                    onChange={handleChange}
                    className="mt-1 w-full p-2 border rounded-lg"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={userForm.email}
                    onChange={handleChange}
                    className="mt-1 w-full p-2 border rounded-lg"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={userForm.phone}
                    onChange={handleChange}
                    className="mt-1 w-full p-2 border rounded-lg"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label
                    htmlFor="age"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Age
                  </label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    value={userForm.age}
                    onChange={handleChange}
                    className="mt-1 w-full p-2 border rounded-lg"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label
                    htmlFor="gender"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={userForm.gender}
                    onChange={handleChange}
                    className="mt-1 w-full p-2 border rounded-lg"
                    autoComplete="sex"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setSelectedSlotId(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleBook}
                  disabled={
                    !userForm.name ||
                    !userForm.email ||
                    !userForm.phone ||
                    !userForm.age ||
                    !userForm.gender
                  }
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookSlot;
