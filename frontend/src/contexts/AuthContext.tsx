import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'customer' | 'business' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  businessType?: string;
  isApproved?: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: { name: string; email: string; phone?: string; password: string; role: UserRole; businessType?: string }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// Make sure VITE_API_URL ends with /api/auth
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('zarvo_user');
    const token = localStorage.getItem('zarvo_token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setIsReady(true);
  }, []);

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
    } catch (error: any) {
      throw new Error(error.message || "Login error");
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: { name: string; email: string; phone?: string; password: string; role: UserRole; businessType?: string }) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Signup failed");

      setUser(data.user);
      localStorage.setItem('zarvo_user', JSON.stringify(data.user));
      localStorage.setItem('zarvo_token', data.token);
    } catch (error: any) {
      throw new Error(error.message || "Signup error");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('zarvo_user');
    localStorage.removeItem('zarvo_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading, isReady }}>
      {children}
    </AuthContext.Provider>
  );
};
