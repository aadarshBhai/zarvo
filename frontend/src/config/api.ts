// Centralized API and Socket configuration
// Uses Vite env vars if provided, otherwise falls back to current origin in the browser

const getWindowOrigin = () => {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return undefined;
};

const winOrigin = getWindowOrigin();
const isLocal = !!winOrigin && /^(http:\/\/)?(localhost|127\.0\.0\.1)/.test(winOrigin);

// Base origin selection
const PROD_DEFAULT = "https://zarvo.onrender.com";
const envSocket = (import.meta as any).env?.VITE_SOCKET_URL as string | undefined;
const envApiBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;
const envAuthApi = (import.meta as any).env?.VITE_API_URL as string | undefined;

// When local, default API/Sockets to the backend on port 5000 unless overridden
const LOCAL_BACKEND = "http://localhost:5000";
const ORIGIN = isLocal ? (envSocket || LOCAL_BACKEND) : (envSocket || winOrigin || PROD_DEFAULT);

export const API_BASE: string = isLocal
  ? (envApiBase || `${LOCAL_BACKEND}/api`)
  : (envApiBase || `${ORIGIN}/api`);

export const AUTH_API: string = isLocal
  ? (envAuthApi || `${API_BASE}/auth`)
  : (envAuthApi || `${API_BASE}/auth`);

export const SOCKET_URL: string = isLocal
  ? (envSocket || LOCAL_BACKEND)
  : (envSocket || ORIGIN);

export default {
  API_BASE,
  AUTH_API,
  SOCKET_URL,
};
