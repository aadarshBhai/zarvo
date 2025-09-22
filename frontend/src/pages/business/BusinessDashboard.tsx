import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Calendar, Clock, Users, TrendingUp, Plus, Eye, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBooking } from '@/contexts/BookingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const BusinessDashboard = () => {
  const { user } = useAuth();
  const { getBusinessSlots, bookings } = useBooking();

  const [businessSlots, setBusinessSlots] = useState<any[]>([]);

  // Fetch business slots safely
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const slots = await getBusinessSlots();
        setBusinessSlots(slots || []);
      } catch (err) {
        console.error("Failed to fetch slots:", err);
        setBusinessSlots([]);
      }
    };
    fetchSlots();
  }, [user, getBusinessSlots]);

  // Redirect if not business user
  if (!user || user.role !== 'business') {
    return <Navigate to="/login" replace />;
  }

  // Safe businessBookings
  const businessBookings = (bookings || []).filter(b => 
    businessSlots.some(s => s.id === b.slotId)
  );

  const stats = {
    totalSlots: businessSlots.length,
    bookedSlots: businessSlots.filter(s => s.isBooked).length,
    availableSlots: businessSlots.filter(s => !s.isBooked).length,
    totalBookings: businessBookings.length,
    confirmedBookings: businessBookings.filter(b => b.status === 'confirmed').length,
    completedBookings: businessBookings.filter(b => b.status === 'completed').length
  };

  const recentBookings = businessBookings
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Business Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.name}! Manage your appointments and schedule.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-gradient-primary hover:shadow-primary transition-bounce">
              <Link to="/manage-slots">
                <Plus className="h-4 w-4 mr-2" />
                Add Slots
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/view-bookings">
                <Eye className="h-4 w-4 mr-2" />
                View All Bookings
              </Link>
            </Button>
          </div>
        </div>

        {/* Approval Status */}
        {user.isApproved === false && (
          <Card className="border-warning bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-warning" />
                <div>
                  <h3 className="font-medium text-warning">Account Pending Approval</h3>
                  <p className="text-sm text-muted-foreground">
                    Your business account is under review. You'll be able to create slots once approved by our admin team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSlots}</div>
              <p className="text-xs text-muted-foreground">
                {stats.availableSlots} available
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Booked Slots</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bookedSlots}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalSlots > 0 ? Math.round((stats.bookedSlots / stats.totalSlots) * 100) : 0}% booking rate
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                {stats.confirmedBookings} confirmed
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${businessSlots.filter(s => s.isBooked).reduce((sum, slot) => sum + slot.price, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                From booked slots
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>Latest appointments booked with you</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/view-bookings">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by creating available time slots for your customers.
                </p>
                <Button asChild className="bg-gradient-primary hover:shadow-primary transition-bounce">
                  <Link to="/manage-slots">Create Your First Slot</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div key={booking.bookingNumber || booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{booking.customerName}</div>
                      <div className="text-sm text-muted-foreground">
                        {booking.department} • {new Date(booking.date).toLocaleDateString()} at {booking.time}
                      </div>
                      <div className="text-xs text-muted-foreground">{booking.customerEmail}</div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        className={
                          booking.status === 'confirmed' 
                            ? 'bg-success text-success-foreground' 
                            : booking.status === 'cancelled'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BusinessDashboard;
