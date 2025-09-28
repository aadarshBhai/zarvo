import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: React.ReactNode;
}

// Guards routes that require the user to have completed signup (i.e., be authenticated)
const RequireSignup: React.FC<Props> = ({ children }) => {
  const { user, isReady } = useAuth();
  const location = useLocation();

  // While auth state is hydrating, don't redirect yet
  if (!isReady) return null;

  // Consider the user signed up if we have an authenticated user in context
  const isSignedUp = !!user;

  if (!isSignedUp) {
    // Redirect to signup, preserving where they came from
    return <Navigate to="/signup" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default RequireSignup;
