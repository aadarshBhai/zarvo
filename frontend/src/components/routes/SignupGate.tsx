import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  // Optional: how recent the google verification must be (ms). Default 10 minutes.
  maxAgeMs?: number;
}

const SignupGate: React.FC<Props> = ({ children, maxAgeMs = 10 * 60 * 1000 }) => {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const tsStr = localStorage.getItem("zarvo_google_verified_at");
      if (!tsStr) {
        navigate("/", { replace: true, state: { mustGoogle: true } });
        return;
      }
      const ts = Number(tsStr);
      if (Number.isNaN(ts) || Date.now() - ts > maxAgeMs) {
        // Too old or invalid, block direct access to /signup
        localStorage.removeItem("zarvo_google_verified_at");
        navigate("/", { replace: true, state: { mustGoogle: true } });
        return;
      }
      // Allowed through
    } catch {
      navigate("/", { replace: true, state: { mustGoogle: true } });
    }
  }, [navigate, maxAgeMs]);

  return <>{children}</>;
};

export default SignupGate;
