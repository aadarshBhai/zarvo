// Centralized API and Socket configuration
// Uses Vite env vars if provided, otherwise falls back to current origin in the browser

const getWindowOrigin = () => {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return undefined;
};

const ORIGIN = getWindowOrigin() || (import.meta as any).env?.VITE_SOCKET_URL || "https://zarvo.onrender.com";

export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || `${ORIGIN}/api`;
export const AUTH_API: string = (import.meta as any).env?.VITE_API_URL || `${API_BASE}/auth`;
export const SOCKET_URL: string = (import.meta as any).env?.VITE_SOCKET_URL || ORIGIN;

export default {
  API_BASE,
  AUTH_API,
  SOCKET_URL,
};
