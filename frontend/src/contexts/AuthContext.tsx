import React, { createContext, useContext, useState, useEffect } from 'react';
import { AUTH_API } from '@/config/api';

export type UserRole = 'customer' | 'business' | 'doctor' | 'admin' | 'super-admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  businessType?: string;
  isApproved?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: { name: string; email: string; phone?: string; password: string; role: UserRole; businessType?: string }) => Promise<any>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  refreshMe: () => Promise<void>;
  isLoading: boolean;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// Centralized auth API base (should end with /api/auth)
const API_URL = AUTH_API;


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const savedUser = localStorage.getItem('zarvo_user');
      const token = localStorage.getItem('zarvo_token');
      if (savedUser && token) {
        // Optimistically set saved user
        setUser(JSON.parse(savedUser));
        // Refresh from backend to get latest approval and profile flags
        try {
          const res = await fetch(`${API_URL}/me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.user) {
              setUser(data.user);
              localStorage.setItem('zarvo_user', JSON.stringify(data.user));
              if (data?.user?.role) localStorage.setItem('zarvo_role', data.user.role);
            }
          }
        } catch {}
      }
      setIsReady(true);
    };
    bootstrap();
  }, []);

  const refreshMe = async () => {
    const token = localStorage.getItem('zarvo_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem('zarvo_user', JSON.stringify(data.user));
          if (data?.user?.role) localStorage.setItem('zarvo_role', data.user.role);
        }
      }
    } catch {}
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      setUser(data.user);
      localStorage.setItem('zarvo_user', JSON.stringify(data.user));
      localStorage.setItem('zarvo_token', data.token);
      if (data?.user?.role) localStorage.setItem('zarvo_role', data.user.role);
    } catch (error: any) {
      throw new Error(error.message || "Login error");
    } finally {
      setIsLoading(false);
    }
  };

  // Google login removed per request

  const signup = async (userData: { name: string; email: string; phone?: string; password: string; role: UserRole; businessType?: string }) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) {
        const err: any = new Error(data.message || "Signup failed");
        err.code = res.status;
        throw err;
      }
      // Some flows return token immediately; our secured flow requires email verification first.
      if (data?.token && data?.user) {
        setUser(data.user);
        localStorage.setItem('zarvo_user', JSON.stringify(data.user));
        localStorage.setItem('zarvo_token', data.token);
        if (data?.user?.role) localStorage.setItem('zarvo_role', data.user.role);
      }
      return data;
    } catch (error: any) {
      const err: any = new Error(error?.message || "Signup error");
      if (error?.code) err.code = error.code;
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (email: string) => {
    const res = await fetch(`${API_URL}/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to resend OTP');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('zarvo_user');
    localStorage.removeItem('zarvo_token');
    localStorage.removeItem('zarvo_role');
    localStorage.removeItem('zarvo_google_verified_at');
  };

  const deleteAccount = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('zarvo_token');
      if (!token || !user) throw new Error("Not authenticated");

      const res = await fetch(`${API_URL}/delete-account`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete account");
      }
      
      // Clear user data after successful deletion
      logout();
    } catch (error: any) {
      throw new Error(error.message || "Error deleting account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, deleteAccount, verifyEmail, resendOtp, refreshMe, isLoading, isReady }}>
      {children}
    </AuthContext.Provider>
  );
};
