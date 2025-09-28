import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();

  // Guard: only admin can access
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <SettingsIcon className="h-7 w-7" /> System Settings
            </h1>
            <p className="text-muted-foreground">Manage platform-wide configuration</p>
          </div>
          <Badge className="bg-primary text-primary-foreground capitalize">{user.role}</Badge>
        </div>

        {/* General Settings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Basic platform preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platformName">Platform Name</Label>
                <Input id="platformName" placeholder="Zarvo" defaultValue="Zarvo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input id="supportEmail" type="email" placeholder="support@example.com" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="gap-2">
                <Save className="h-4 w-4" /> Save Changes
              </Button>
              <Button variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Authentication and access controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Require email verification</Label>
                <div className="text-sm text-muted-foreground">Enabled</div>
              </div>
              <div className="space-y-2">
                <Label>Allow business signups</Label>
                <div className="text-sm text-muted-foreground">Enabled (admin approval required)</div>
              </div>
            </div>
            <Button variant="outline">Update Security Settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
