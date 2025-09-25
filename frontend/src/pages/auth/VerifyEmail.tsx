import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: { email?: string } };
  const [email, setEmail] = useState(state?.email || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { verifyEmail, resendOtp, isLoading, user } = useAuth();

  // If user already logged in, redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email || !otp) {
      setError('Please enter the email and OTP code.');
      return;
    }
    try {
      await verifyEmail(email, otp);
      setMessage('Email verified! You can now log in.');
      setTimeout(() => navigate('/login'), 1000);
    } catch (e: any) {
      setError(e?.message || 'Verification failed');
    }
  };

  const resend = async () => {
    setError('');
    setMessage('');
    if (!email) {
      setError('Please enter your email first.');
      return;
    }
    try {
      await resendOtp(email);
      setMessage('OTP sent. Please check your inbox.');
    } catch (e: any) {
      setError(e?.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>Verify your email</CardTitle>
            <CardDescription>
              Enter the 6-digit verification code sent to your email to activate your account.
            </CardDescription>
          </CardHeader>
          <form onSubmit={submit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {message && (
                <Alert>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input id="otp" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} required />
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">Verify</Button>
                <Button type="button" variant="outline" onClick={resend} disabled={isLoading}>Resend OTP</Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="link" type="button" onClick={() => navigate('/login')}>
                Back to Login
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
