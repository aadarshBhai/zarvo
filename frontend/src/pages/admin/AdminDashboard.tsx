import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Users, Building, Calendar, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBooking } from '@/contexts/BookingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { slots, bookings } = useBooking();

  // Redirect if not admin
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  // Mock users data for admin view
  const allUsers = [
    { id: '1', name: 'John Customer', email: 'customer@test.com', role: 'customer', isActive: true },
    { id: '2', name: 'Dr. Sarah Wilson', email: 'doctor@test.com', role: 'business', isActive: true, isApproved: true },
    { id: '3', name: 'Jane Business', email: 'jane@business.com', role: 'business', isActive: true, isApproved: false },
    { id: '4', name: 'Mike Provider', email: 'mike@provider.com', role: 'business', isActive: false, isApproved: true },
  ];

  const stats = {
    totalUsers: allUsers.length,
    customers: allUsers.filter(u => u.role === 'customer').length,
    businessUsers: allUsers.filter(u => u.role === 'business').length,
    pendingApprovals: allUsers.filter(u => u.role === 'business' && u.isApproved === false).length,
    totalSlots: slots.length,
    bookedSlots: slots.filter(s => s.isBooked).length,
    totalBookings: bookings.length,
    revenueGenerated: slots.filter(s => s.isBooked).reduce((sum, slot) => sum + slot.price, 0)
  };

  const recentActivity = [
    { type: 'user_signup', message: 'New business user registered: Jane Business', time: '2 hours ago' },
    { type: 'booking', message: 'New booking made by John Customer', time: '4 hours ago' },
    { type: 'slot_created', message: 'Dr. Sarah Wilson created 5 new slots', time: '6 hours ago' },
    { type: 'approval_needed', message: 'Business account pending approval: Mike Provider', time: '1 day ago' }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup':
        return <Users className="h-4 w-4 text-primary" />;
      case 'booking':
        return <Calendar className="h-4 w-4 text-success" />;
      case 'slot_created':
        return <Clock className="h-4 w-4 text-accent" />;
      case 'approval_needed':
        return <CheckCircle className="h-4 w-4 text-warning" />;
      default:
        return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              System overview and management controls
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-gradient-primary hover:shadow-primary transition-bounce">
              <Link to="/user-management">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/settings">
                <TrendingUp className="h-4 w-4 mr-2" />
                System Settings
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.customers} customers, {stats.businessUsers} businesses
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <CheckCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">
                Business accounts awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                {stats.bookedSlots} slots booked out of {stats.totalSlots}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.revenueGenerated}</div>
              <p className="text-xs text-muted-foreground">
                From completed bookings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest platform activity and events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* User Status Overview */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>User Status Overview</CardTitle>
              <CardDescription>Current status of all platform users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allUsers.filter(u => u.role === 'business').map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge 
                      variant={user.isActive ? "secondary" : "destructive"}
                      className={user.isActive ? "bg-success text-success-foreground" : ""}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {user.role === 'business' && (
                      <Badge 
                        variant={user.isApproved ? "secondary" : "destructive"}
                        className={user.isApproved ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}
                      >
                        {user.isApproved ? 'Approved' : 'Pending'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="pt-2">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/user-management">View All Users</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button asChild variant="outline" className="h-24 flex-col gap-2">
                <Link to="/user-management">
                  <Users className="h-6 w-6" />
                  <span>Manage Users</span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-24 flex-col gap-2">
                <Link to="/reports">
                  <TrendingUp className="h-6 w-6" />
                  <span>View Reports</span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-24 flex-col gap-2">
                <Link to="/settings">
                  <Building className="h-6 w-6" />
                  <span>System Settings</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;