import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BookingProvider } from "@/contexts/BookingContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RequireSignup from "@/components/routes/RequireSignup";
import RequireProfileComplete from "@/components/routes/RequireProfileComplete";
import RequireApproval from "@/components/routes/RequireApproval";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import AdminLogin from "./pages/auth/AdminLogin";

import BookSlot from "./pages/customer/BookSlot";
import MyBookings from "./pages/customer/MyBookings";
import ManageSlots from "./pages/business/ManageSlots";
import ViewBookings from "./pages/business/ViewBookings";
import BusinessDashboard from "./pages/business/BusinessDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import Settings from "./pages/admin/Settings";
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
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />

                  <Route path="/book-slot" element={<RequireProfileComplete><BookSlot /></RequireProfileComplete>} />
                  <Route path="/my-bookings" element={<RequireProfileComplete><MyBookings /></RequireProfileComplete>} />
                  <Route path="/business-dashboard" element={<RequireApproval><BusinessDashboard /></RequireApproval>} />
                  <Route path="/manage-slots" element={<RequireApproval><ManageSlots /></RequireApproval>} />
                  <Route path="/view-bookings" element={<RequireApproval><ViewBookings /></RequireApproval>} />
                  <Route path="/admin-dashboard" element={<RequireSignup><AdminDashboard /></RequireSignup>} />
                  <Route path="/user-management" element={<RequireSignup><UserManagement /></RequireSignup>} />
                  <Route path="/settings" element={<RequireSignup><Settings /></RequireSignup>} />
                  <Route path="/profile" element={<RequireProfileComplete><Profile /></RequireProfileComplete>} />

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
