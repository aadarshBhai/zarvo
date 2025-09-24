import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBooking } from '@/contexts/BookingContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const ManageSlots = () => {
  const { user, isReady } = useAuth();
  const { getBusinessSlots, createSlot, deleteSlot } = useBooking();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [businessSlotsState, setBusinessSlotsState] = useState<any[]>([]);
  const [newSlot, setNewSlot] = useState({
    date: '',
    time: '',
    duration: 30,
    department: '',
    price: 100,
    doctorName: user?.name || '',
    doctorRating: 5,
    doctorLocation: ''
  });

  useEffect(() => {
    if (user?.id) {
      const fetchSlots = async () => {
        const slots = await getBusinessSlots();
        // Ensure doctor object exists for each slot
        const safeSlots = slots.map(slot => ({
          ...slot,
          doctor: slot.doctor || { name: 'Unknown Doctor', location: 'Unknown', rating: 0 },
        }));
        setBusinessSlotsState(safeSlots);
      };
      fetchSlots();
    }
  }, [user, getBusinessSlots]);

  if (!isReady) {
    // Wait for auth hydration to prevent redirect flicker on refresh
    return null;
  }

  if (!user || user.role !== 'business') {
    return <Navigate to="/login" replace />;
  }

  if (user.isApproved === false) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-2">Account Pending Approval</h2>
            <p className="text-muted-foreground">
              Your business account is under review. You'll be able to manage slots once approved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const departments = ['Heart Checkup', 'General Checkup', 'Dental Care', 'Eye Care', 'Dermatology'];

  const getDurationOptions = (department: string) => {
    const durations = {
      'Heart Checkup': [30, 45, 60],
      'General Checkup': [15, 20, 30],
      'Dental Care': [30, 45, 60],
      'Eye Care': [20, 25, 30],
      'Dermatology': [30, 45]
    };
    return durations[department as keyof typeof durations] || [15, 20, 30, 45, 60];
  };

  const handleCreateSlot = async () => {
    if (!newSlot.date || !newSlot.time || !newSlot.department || !newSlot.doctorName || !newSlot.doctorLocation) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const doctorPayload = {
        id: user.id || "temp-id",
        name: newSlot.doctorName?.trim() || "Unknown Doctor",
        specialization: newSlot.department?.trim() || "General",
        rating: typeof newSlot.doctorRating === 'number' ? newSlot.doctorRating : 0,
        location: newSlot.doctorLocation?.trim() || "Unknown Location",
      };

      // Ensure all required doctor fields are present
      if (!doctorPayload.name || !doctorPayload.location) {
        toast({
          title: "Missing doctor info",
          description: "Doctor name and location are required.",
          variant: "destructive",
        });
        setIsCreating(false);
        return;
      }

      const slotPayload = {
        date: newSlot.date,
        time: newSlot.time,
        duration: newSlot.duration,
        department: newSlot.department,
        price: newSlot.price,
        businessId: user.id || "temp-business-id",
        businessName: user.name || "Unknown Business",
        doctor: doctorPayload,
        isBooked: false,
      };

      const createdSlot = await createSlot(slotPayload);

      toast({
        title: "Slot created successfully!",
        description: "Your new time slot is now available for booking.",
      });

      setIsCreateDialogOpen(false);
      setNewSlot({
        date: '',
        time: '',
        duration: 30,
        department: '',
        price: 100,
        doctorName: user?.name || '',
        doctorRating: 5,
        doctorLocation: ''
      });

      setBusinessSlotsState(prev => [...prev, {
        ...createdSlot,
        doctor: createdSlot.doctor || { name: 'Unknown Doctor', location: 'Unknown', rating: 0 },
      }]);
    } catch (error) {
      console.error("Error creating slot:", error);
      toast({
        title: "Failed to create slot",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await deleteSlot(slotId);
      toast({
        title: "Slot deleted",
        description: "The time slot has been removed.",
      });
      setBusinessSlotsState(prev => prev.filter(slot => (slot.id || slot._id) !== slotId));
    } catch (error) {
      // handled in BookingContext
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Time Slots</h1>
            <p className="text-muted-foreground">Create and manage your available appointment slots</p>
          </div>

          {/* Create Slot Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:shadow-primary transition-bounce">
                <Plus className="h-4 w-4 mr-2" />
                Create New Slot
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Time Slot</DialogTitle>
                <DialogDescription>
                  Add a new available time slot for your customers to book.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newSlot.date}
                    onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newSlot.time}
                    onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={newSlot.department}
                    onValueChange={(value) => setNewSlot({ ...newSlot, department: value })}
                  >
                    <SelectTrigger id="department" name="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newSlot.department && (
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Select
                      value={newSlot.duration.toString()}
                      onValueChange={(value) => setNewSlot({ ...newSlot, duration: parseInt(value) })}
                    >
                      <SelectTrigger id="duration" name="duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getDurationOptions(newSlot.department).map((duration) => (
                          <SelectItem key={duration} value={duration.toString()}>
                            {duration} minutes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="10"
                    value={newSlot.price}
                    onChange={(e) => setNewSlot({ ...newSlot, price: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctorName">Doctor Name *</Label>
                  <Input
                    id="doctorName"
                    type="text"
                    value={newSlot.doctorName}
                    onChange={(e) => setNewSlot({ ...newSlot, doctorName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctorLocation">Doctor Location *</Label>
                  <Input
                    id="doctorLocation"
                    type="text"
                    value={newSlot.doctorLocation}
                    onChange={(e) => setNewSlot({ ...newSlot, doctorLocation: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctorRating">Doctor Rating *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="doctorRating"
                      type="number"
                      min="0"
                      max="5"
                      step="0.5"
                      value={newSlot.doctorRating}
                      onChange={(e) => setNewSlot({ ...newSlot, doctorRating: parseFloat(e.target.value) })}
                      className="w-20 text-center font-bold text-lg"
                    />
                    <span className="text-yellow-500 text-lg">★</span>
                    <span className="text-muted-foreground text-sm">(0-5)</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSlot}
                  disabled={isCreating}
                  className="bg-gradient-primary hover:shadow-primary transition-bounce"
                >
                  {isCreating ? 'Creating...' : 'Create Slot'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Slots List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Time Slots ({businessSlotsState.length})</h2>
          {businessSlotsState.length === 0 && <p>No slots created yet.</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {businessSlotsState.map((slot) => {
              const doctor = slot.doctor && slot.doctor.name ? slot.doctor : { name: 'Unknown Doctor', location: 'Unknown', rating: 0 };
              return (
                <Card key={slot.id || slot._id} className="relative">
                  <CardHeader>
                    <CardTitle>{slot.department}</CardTitle>
                    <CardDescription>
                      {slot.date} at {slot.time} | {slot.duration} minutes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p><strong>Price:</strong> ${slot.price}</p>
                    <p><strong>Doctor:</strong> {doctor.name}</p>
                    <p><strong>Location:</strong> {doctor.location}</p>
                    <p><strong>Rating:</strong> {doctor.rating}★</p>
                    <Badge className={`mt-2 ${slot.isBooked ? 'bg-red-600' : 'bg-green-600'}`}>
                      {slot.isBooked ? 'Booked' : 'Available'}
                    </Badge>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        const id = slot.id || slot._id;
                        if (slot.isBooked) {
                          if (window.confirm("This slot is booked. Are you sure you want to delete it? This will cancel the booking and notify the customer.")) {
                            // pass force=true for booked slots
                            deleteSlot(id, true)
                              .then(() => {
                                setBusinessSlotsState(prev => prev.filter(s => (s.id || s._id) !== id));
                                toast({ title: "Slot deleted", description: "The booked slot was force-deleted and the booking cancelled." });
                              })
                              .catch(() => {/* handled in context */});
                          }
                        } else {
                          handleDeleteSlot(id);
                        }
                      }}
                      title={slot.isBooked ? "Emergency delete: This will cancel the booking and notify the customer." : "Delete this slot"}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> 
                      {slot.isBooked ? "Delete (Emergency)" : "Delete"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageSlots;
