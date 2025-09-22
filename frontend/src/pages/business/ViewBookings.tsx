// src/pages/business/ViewBookings.tsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Calendar, Clock, Phone, Mail, Search, Filter, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBooking, TimeSlot, Booking } from "@/contexts/BookingContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ViewBookings: React.FC = () => {
  const { user } = useAuth();
  const { getBusinessSlots, bookings, refreshBookings } = useBooking();
  const [businessSlots, setBusinessSlots] = useState<TimeSlot[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Redirect if not a business user
  if (!user || user.role !== "business") return <Navigate to="/login" replace />;

  // Fetch business slots
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const slots = await getBusinessSlots();
        setBusinessSlots(slots);
      } catch (err) {
        console.error("Failed to fetch business slots:", err);
      }
    };
    fetchSlots();
    refreshBookings();
  }, [getBusinessSlots, refreshBookings]);

  // Filter bookings belonging to this business
  const businessBookings: Booking[] = bookings.filter((b) =>
    businessSlots.some((s) => s.id === b.slotId)
  );

  // Apply search & status filter
  const filteredBookings = businessBookings.filter((b) => {
    const matchesSearch =
      !searchTerm ||
      b.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.department?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "bg-success text-success-foreground";
      case "cancelled":
        return "bg-destructive text-destructive-foreground";
      case "completed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const statsCounts = {
    total: businessBookings.length,
    confirmed: businessBookings.filter((b) => b.status === "confirmed").length,
    completed: businessBookings.filter((b) => b.status === "completed").length,
    cancelled: businessBookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">View Bookings</h1>
          <p className="text-muted-foreground">Manage all your appointment bookings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsCounts.total}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <Calendar className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{statsCounts.confirmed}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsCounts.completed}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <Users className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{statsCounts.cancelled}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" /> Filter Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer name, email, or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">All Bookings ({filteredBookings.length})</h2>

          {filteredBookings.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {businessBookings.length === 0 ? "No bookings yet" : "No bookings match your filters"}
                </h3>
                <p className="text-muted-foreground">
                  {businessBookings.length === 0
                    ? "Customers will appear here once they book your slots."
                    : "Try adjusting your search or filter criteria."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((b) => (
                <Card key={b.id} className="shadow-card hover:shadow-elevated transition-smooth">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{b.customerName || "Not booked yet"}</CardTitle>
                        <CardDescription>{b.department || b.doctor?.name || "N/A"}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(b.status)}>
                        {b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : "Pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{b.date ? new Date(b.date).toLocaleDateString() : "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{b.time || "-"} ({b.duration || "-" } mins)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{b.customerGender || "-"}, {b.customerAge ? `${b.customerAge} yrs` : "-"}</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{b.customerEmail || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{b.customerPhone || "-"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Booking ID: {b.id || "-"} • Booked on: {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "-"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewBookings;
