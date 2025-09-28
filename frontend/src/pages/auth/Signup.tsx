import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Phone, Eye, EyeOff, Stethoscope, Building } from 'lucide-react';

const Signup = () => {
  const { user, signup, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: '' as UserRole | '',
    businessType: '',
    businessTypeOther: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  // If user is already logged in, normally we would redirect.
  // But when arriving from Google verification, allow completing the profile form.
  const tsStr = typeof window !== 'undefined' ? localStorage.getItem('zarvo_google_verified_at') : null;
  const allowBecauseOfGoogle = (() => {
    if (!tsStr) return false;
    const ts = Number(tsStr);
    if (Number.isNaN(ts)) return false;
    // 10 minutes window after Google login
    return Date.now() - ts <= 10 * 60 * 1000;
  })();

  if (user && !allowBecauseOfGoogle) {
    const target = (() => {
      switch (user.role) {
        case 'business':
        case 'doctor':
          return '/business-dashboard';
        case 'admin':
          return '/admin-dashboard';
        case 'customer':
        default:
          return '/book-slot';
      }
    })();
    return <Navigate to={target} replace />;
  }

  // Healthcare-focused departments for business (doctor) signup
  const businessTypes = [
    'General Physician / Medicine',
    'Pediatrics',
    'Gynecology & Obstetrics',
    'Orthopedics',
    'Dermatology',
    'Cardiology',
    'Ophthalmology',
    'Dentistry',
    'ENT (Ear, Nose, Throat)',
    'Psychiatry / Mental Health',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.role) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.role === 'business') {
      if (!formData.businessType) {
        setError('Please select a business type');
        return;
      }
      if (formData.businessType === 'Other' && !formData.businessTypeOther.trim()) {
        setError('Please specify your department');
        return;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      const result = await signup({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role as UserRole,
        businessType: (formData.businessType === 'Other' ? formData.businessTypeOther.trim() : formData.businessType) || undefined,
        password: formData.password
      });

      toast({
        title: "Account created!",
        description: "You can now sign in to your account.",
      });

      // Auto-login the user with the credentials they just set so route guards allow dashboards
      try {
        await login(formData.email, formData.password);
      } catch (e) {
        // If auto-login fails (e.g., email verification required), proceed without blocking and let guards handle UX
      }

      // Clear the Google verification flag now that profile is completed
      try { localStorage.removeItem('zarvo_google_verified_at'); } catch {}

      // Redirect to respective dashboard based on chosen role
      const role = formData.role as UserRole;
      if (role === 'business' || role === 'doctor') {
        navigate('/business-dashboard');
      } else {
        // default customer/guest flow
        navigate('/book-slot');
      }
    } catch (error: any) {
      const isConflict = Number(error?.code) === 409;
      const message = isConflict
        ? 'This email is already registered. Please sign in with your account.'
        : (error?.message || 'Failed to create account. Please try again.');
      setError(message);
      toast({
        title: isConflict ? 'Email already exists' : 'Signup failed',
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">Zarvo</span>
          </div>
          <p className="text-muted-foreground">Create your account</p>
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>Join Zarvo</CardTitle>
            <CardDescription>
              Sign up as a Customer or Business Professional
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="role">I want to register as *</Label>
                <Select onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                  <SelectTrigger id="role" name="role">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Guest (Book appointments)</SelectItem>
                    <SelectItem value="business">Business Professional (Provide services)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10"
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>

              {formData.role === 'business' && (
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type *</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Select onValueChange={(value) => setFormData({ ...formData, businessType: value, ...(value !== 'Other' ? { businessTypeOther: '' } : {}) })}>
                      <SelectTrigger id="businessType" name="businessType" className="pl-10">
                        <SelectValue placeholder="Select your business type" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.businessType === 'Other' && (
                      <div className="mt-2">
                        <Label htmlFor="businessTypeOther">Please specify your department</Label>
                        <Input
                          id="businessTypeOther"
                          name="businessTypeOther"
                          type="text"
                          placeholder="Enter your department"
                          value={formData.businessTypeOther}
                          onChange={(e) => setFormData({ ...formData, businessTypeOther: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:shadow-primary transition-bounce" 
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </CardContent>
          </form>

          
        </Card>
      </div>
    </div>
  );
};

export default Signup;
