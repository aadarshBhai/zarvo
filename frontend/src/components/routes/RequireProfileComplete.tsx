import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const isProfileComplete = (user: { role: string; name?: string; email?: string; phone?: string; businessType?: string }) => {
  if (!user) return false;
  const hasBasic = Boolean(user.name && user.email && user.phone);
  if (!hasBasic) return false;
  if (user.role === 'business' || user.role === 'doctor') {
    return Boolean(user.businessType);
  }
  return true; // customer only needs basic fields
};

interface Props {
  children: React.ReactNode;
}

// Ensures the authenticated user has completed their profile (based on role)
const RequireProfileComplete: React.FC<Props> = ({ children }) => {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) return null;

  if (!user) {
    return <Navigate to="/signup" replace state={{ from: location.pathname }} />;
  }

  if (!isProfileComplete(user)) {
    return <Navigate to="/signup" replace state={{ from: location.pathname, reason: 'incomplete_profile' }} />;
  }

  return <>{children}</>;
};

export default RequireProfileComplete;
