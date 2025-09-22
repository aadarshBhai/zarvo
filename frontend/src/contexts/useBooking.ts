// src/contexts/useBooking.ts
import { useContext } from "react";
import { BookingContext } from "./BookingContext";

export const useBooking = () => useContext(BookingContext);
