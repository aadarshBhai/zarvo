import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BookingProvider } from "@/contexts/BookingContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import BookSlot from "./pages/customer/BookSlot";
import MyBookings from "./pages/customer/MyBookings";
import BusinessDashboard from "./pages/business/BusinessDashboard";
import ManageSlots from "./pages/business/ManageSlots";
import ViewBookings from "./pages/business/ViewBookings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BookingProvider>
          <Toaster />
          <Sonner />
          {/* Suppress React Router v7 deprecation warnings by opting into future flags */}
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />

                  <Route path="/book-slot" element={<BookSlot />} />
                  <Route path="/my-bookings" element={<MyBookings />} />
                  <Route path="/business-dashboard" element={<BusinessDashboard />} />
                  <Route path="/manage-slots" element={<ManageSlots />} />
                  <Route path="/view-bookings" element={<ViewBookings />} />
                  <Route path="/admin-dashboard" element={<AdminDashboard />} />
                  <Route path="/user-management" element={<UserManagement />} />
                  <Route path="/profile" element={<Profile />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </BookingProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
