// src/contexts/BookingContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import axios, { AxiosResponse } from "axios";
import io from "socket.io-client";

// -------------------- TYPES --------------------
export interface Doctor {
  id?: string;
  name: string;
  location: string;
  rating: number;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
}

export interface TimeSlot {
  id: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  department: string;
  doctor: Doctor;
  isBooked: boolean;
  customer?: Customer;
  bookingCreatedAt?: string;
}

export interface Booking {
  id: string;
  slotId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAge: number;
  customerGender: string;
  department?: string;
  doctor?: Doctor;
  fee?: number;
  bookingNumber?: string;
  status?: string;
  createdAt?: string;
  [key: string]: any;
}

// Shapes returned by the backend API
interface SlotApi {
  _id?: string;
  id?: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  department: string;
  doctor: Doctor;
  isBooked: boolean;
  customer?: Customer;
  bookingCreatedAt?: string;
}

interface BookingApi {
  id: string;
  slotId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAge: number;
  customerGender: string;
  department?: string;
  doctor?: Doctor;
  fee?: number;
  bookingNumber?: string;
  status?: string;
  createdAt?: string;
}

// Envelope sometimes used by API: { data: T }
type ApiEnvelope<T> = { data: T };

interface BookingContextProps {
  slots: TimeSlot[];
  bookings: Booking[];
  bookSlot: (slotId: string, customer: Customer) => Promise<TimeSlot | undefined>;
  refreshSlots: () => void;
  getBusinessSlots: () => Promise<TimeSlot[]>;
  createSlot: (slot: Omit<TimeSlot, "id">) => Promise<TimeSlot>;
  deleteSlot: (slotId: string, force?: boolean) => Promise<void>;
  refreshBookings: () => void;
}

// -------------------- CONTEXT --------------------
export const BookingContext = createContext<BookingContextProps>({
  slots: [],
  bookings: [],
  bookSlot: async () => undefined,
  refreshSlots: () => {},
  getBusinessSlots: async () => [],
  createSlot: async () => ({} as TimeSlot),
  deleteSlot: async () => {},
  refreshBookings: () => {},
});

// -------------------- PROVIDER --------------------
export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [socket, setSocket] = useState<any>(null);

  const API_URL = (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000/api";
  const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL || "http://localhost:5000";

  // -------------------- BUSINESS SLOTS --------------------
  const getBusinessSlots = async (): Promise<TimeSlot[]> => {
    try {
      const token = localStorage.getItem("zarvo_token");
      const res: AxiosResponse<ApiEnvelope<SlotApi[]> | SlotApi[]> = await axios.get(
        `${API_URL}/slots/my-slots`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );
      const dataArray: SlotApi[] = Array.isArray((res.data as any)?.data)
        ? (res.data as ApiEnvelope<SlotApi[]>).data
        : (Array.isArray(res.data) ? (res.data as SlotApi[]) : []);
      return dataArray.map((s: SlotApi) => ({
        id: s._id || s.id,
        date: s.date,
        time: s.time,
        duration: s.duration,
        price: s.price,
        department: s.department,
        doctor: s.doctor,
        isBooked: s.isBooked,
        customer: s.customer || undefined,
        bookingCreatedAt: s.bookingCreatedAt || undefined,
      }));
    } catch (err) {
      console.error("Error fetching business slots:", err);
      return [];
    }
  };

  // -------------------- BOOKINGS --------------------
  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("zarvo_token");
      const role = localStorage.getItem("zarvo_role");
      let response: AxiosResponse<ApiEnvelope<BookingApi[]> | BookingApi[]> | { data: BookingApi[] };

      if (token && role === "doctor") {
        response = await axios.get<ApiEnvelope<BookingApi[]> | BookingApi[]>(`${API_URL}/bookings/my-bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else if (token) {
        response = await axios.get<ApiEnvelope<BookingApi[]> | BookingApi[]>(`${API_URL}/bookings/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        response = { data: [] };
      }

      const list: BookingApi[] = Array.isArray((response.data as any)?.data)
        ? (response.data as ApiEnvelope<BookingApi[]>).data
        : (Array.isArray(response.data) ? (response.data as BookingApi[]) : []);
      setBookings(list as unknown as Booking[]);
    } catch (err: any) {
      console.error("Error fetching bookings:", err.response?.data || err);
    }
  };

  const refreshBookings = () => {
    fetchBookings();
  };

  // -------------------- SLOTS --------------------
  const fetchSlots = async () => {
    try {
      const token = localStorage.getItem("zarvo_token");
      const role = localStorage.getItem("zarvo_role");
      let response: AxiosResponse<ApiEnvelope<SlotApi[]> | SlotApi[]>;

      if (token && role === "doctor") {
        response = await axios.get<ApiEnvelope<SlotApi[]> | SlotApi[]>(`${API_URL}/slots/my-slots`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        response = await axios.get<ApiEnvelope<SlotApi[]> | SlotApi[]>(`${API_URL}/slots`);
      }

      const dataArray: SlotApi[] = Array.isArray((response.data as any)?.data)
        ? (response.data as ApiEnvelope<SlotApi[]>).data
        : (Array.isArray(response.data) ? (response.data as SlotApi[]) : []);
      const mappedSlots: TimeSlot[] = dataArray.map((s: SlotApi) => ({
        id: s._id || s.id,
        date: s.date,
        time: s.time,
        duration: s.duration,
        price: s.price,
        department: s.department,
        doctor: s.doctor,
        isBooked: s.isBooked,
        customer: s.customer || undefined,
        bookingCreatedAt: s.bookingCreatedAt || undefined,
      }));

      setSlots(mappedSlots);
    } catch (err) {
      console.error("Error fetching slots:", err);
    }
  };

  const refreshSlots = () => {
    fetchSlots();
  };

  // -------------------- CREATE SLOT --------------------
  const createSlot = async (slot: Omit<TimeSlot, "id">): Promise<TimeSlot> => {
    try {
      const token = localStorage.getItem("zarvo_token");
      const res: AxiosResponse<SlotApi> = await axios.post<SlotApi>(
        `${API_URL}/slots`,
        slot,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );
      const newSlot: TimeSlot = {
        id: (res.data as SlotApi)._id || (res.data as SlotApi).id!,
        date: res.data.date,
        time: res.data.time,
        duration: res.data.duration,
        price: res.data.price,
        department: res.data.department,
        doctor: res.data.doctor,
        isBooked: res.data.isBooked,
        customer: res.data.customer || undefined,
        bookingCreatedAt: res.data.bookingCreatedAt || undefined,
      };
      setSlots(prev => [...prev, newSlot]);
      return newSlot;
    } catch (err) {
      console.error("Error creating slot:", err);
      throw err;
    }
  };

  // -------------------- DELETE SLOT --------------------
  const deleteSlot = async (slotId: string, force: boolean = false) => {
    try {
      const token = localStorage.getItem("zarvo_token");
      await axios.delete(
        `${API_URL}/slots/${slotId}${force ? "?force=true" : ""}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );
      setSlots(prev => prev.filter(s => s.id !== slotId));
      console.log(`Slot ${slotId} deleted successfully.`);
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.warn(`Slot ${slotId} not found. Removing locally.`);
        setSlots(prev => prev.filter(s => s.id !== slotId));
      } else if (err.response?.status === 400) {
        // Handle specific error messages from the backend
        const errorMessage = err.response?.data?.message || "Cannot delete this slot";
        console.error("Cannot delete slot:", errorMessage);
        // You could show a toast notification or alert here
        alert(errorMessage);
      } else {
        console.error("Error deleting slot:", err.response?.data || err);
      }
    }
  };

  // -------------------- BOOK SLOT --------------------
  const bookSlot = async (slotId: string, customer: Customer): Promise<TimeSlot | undefined> => {
    try {
      const token = localStorage.getItem("zarvo_token");
      const res: AxiosResponse<{ booking: BookingApi }> = await axios.post<{ booking: BookingApi }>(
        `${API_URL}/slots/book/${slotId}`,
        {
          slotId,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          customerAge: customer.age,
          customerGender: customer.gender,
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );

      const bookingData: BookingApi = res.data.booking;

      let bookedSlot: TimeSlot | undefined;
      setSlots(prev =>
        prev.map(slot => {
          if (slot.id === slotId) {
            bookedSlot = {
              ...slot,
              isBooked: true,
              customer: {
                name: bookingData.customerName,
                email: bookingData.customerEmail,
                phone: bookingData.customerPhone,
                age: bookingData.customerAge,
                gender: bookingData.customerGender,
              },
              bookingCreatedAt: bookingData.createdAt,
            };
            return bookedSlot;
          }
          return slot;
        })
      );

      setBookings(prev => [...prev, bookingData as unknown as Booking]);
      return bookedSlot;
    } catch (err: any) {
      console.error("Booking failed:", err.response?.data || err);
      throw err;
    }
  };

  // -------------------- SOCKET.IO REAL-TIME --------------------
  useEffect(() => {
    fetchSlots();
    fetchBookings();

    const s = io(SOCKET_URL);
    setSocket(s);

    s.on("slotCreated", (newSlot: TimeSlot) => {
      setSlots(prev => [...prev, newSlot]);
    });

    s.on("slotUpdated", (updatedSlot: TimeSlot) => {
      setSlots(prev =>
        prev.map(slot => (slot.id === updatedSlot.id ? { ...slot, ...updatedSlot } : slot))
      );
    });

    s.on("slotDeleted", (deleted: any) => {
      const deletedId = deleted?.id || deleted?.slotId;
      if (!deletedId) return;
      setSlots(prev => prev.filter(slot => slot.id !== deletedId));
    });

    s.on("bookingCreated", (newBooking: Booking) => {
      setBookings(prev => [...prev, newBooking]);
      setSlots(prev =>
        prev.map(slot =>
          slot.id === newBooking.slotId
            ? {
                ...slot,
                isBooked: true,
                customer: {
                  name: newBooking.customerName,
                  email: newBooking.customerEmail,
                  phone: newBooking.customerPhone,
                  age: newBooking.customerAge,
                  gender: newBooking.customerGender,
                },
                bookingCreatedAt: newBooking.createdAt,
              }
            : slot
        )
      );
    });

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <BookingContext.Provider
      value={{
        slots,
        bookings,
        bookSlot,
        refreshSlots,
        getBusinessSlots,
        createSlot,
        deleteSlot,
        refreshBookings,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

// -------------------- HOOK --------------------
export const useBooking = () => useContext(BookingContext);
