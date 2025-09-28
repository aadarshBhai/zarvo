import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: React.ReactNode;
}

// Guards business routes: user must be authenticated, role === 'business', and isApproved === true
const RequireApproval: React.FC<Props> = ({ children }) => {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) return null;

  if (!user) {
    return <Navigate to="/signup" replace state={{ from: location.pathname }} />;
  }

  const requiresApproval = (user.role === 'business' || user.role === 'doctor');
  const isApproved = user.isApproved === true;
  if (requiresApproval && !isApproved) {
    // Allow access to the main dashboard even if approval is pending,
    // but block other protected business routes.
    if (location.pathname !== '/business-dashboard') {
      return <Navigate to="/business-dashboard" replace state={{ reason: 'approval_pending' }} />;
    }
  }

  return <>{children}</>;
};

export default RequireApproval;
