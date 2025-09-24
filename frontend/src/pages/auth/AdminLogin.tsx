import React, { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldCheck } from "lucide-react";

const AdminLogin: React.FC = () => {
  const { user, login, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");

  // If already authenticated and is admin/super-admin, go to dashboard
  if (user && (user.role === "admin" || user.role === "super-admin")) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      // After login, re-check role from context localStorage update
      const saved = localStorage.getItem("zarvo_user");
      const parsed = saved ? JSON.parse(saved) : null;
      const role = parsed?.role;
      if (role === "admin" || role === "super-admin") {
        navigate("/admin-dashboard", { replace: true });
      } else {
        // Not an admin: log out and show error
        logout();
        setError("Access denied: Admin credentials required.");
      }
    } catch (err: any) {
      setError(err?.message || "Login failed");
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-md">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Admin Login</CardTitle>
              <CardDescription>Restricted area. Admins and Super Admins only.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in as Admin"}
            </Button>

            <div className="text-xs text-muted-foreground mt-2">
              Not an admin? Use the <Link to="/login" className="underline">regular login</Link> instead.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
