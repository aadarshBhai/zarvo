import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Search, Filter, Users, CheckCircle, XCircle, Eye, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import io from 'socket.io-client';
import { API_BASE, SOCKET_URL } from '@/config/api';

// Define user interface
interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  joinedDate: string;
  lastLogin: string;
  isApproved?: boolean;
  businessType?: string;
}

const UserManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const token = typeof window !== 'undefined' ? localStorage.getItem('zarvo_token') : null;

  // Redirect if not admin or super-admin
  if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
    return <Navigate to="/login" replace />;
  }

  // Load users from backend and subscribe to realtime events
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await fetch(`${API_BASE}/admin/users`, { headers });
        const data = await res.json();
        const mapped: AdminUser[] = (data?.data || []).map((u: any) => ({
          id: u._id || u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          isActive: u.isActive !== false,
          isApproved: u.isApproved,
          businessType: u.businessType,
          joinedDate: u.createdAt || new Date().toISOString(),
          lastLogin: u.updatedAt || u.createdAt || new Date().toISOString(),
        }));
        setAllUsers(mapped);
      } catch (e) {
        console.error('Failed to fetch users', e);
      }
    };
    fetchUsers();

    const s = io(SOCKET_URL);
    s.on('doctorSignupPending', (doc: any) => {
      setAllUsers(prev => [{
        id: doc.id || doc._id,
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        role: doc.role || 'business',
        isActive: true,
        isApproved: false,
        businessType: doc.businessType,
        joinedDate: doc.createdAt || new Date().toISOString(),
        lastLogin: doc.createdAt || new Date().toISOString(),
      }, ...prev.filter(u => (u.id) !== (doc.id || doc._id))]);
    });
    s.on('doctorApproved', ({ id }: any) => {
      setAllUsers(prev => prev.map(u => (u.id === id ? { ...u, isApproved: true } : u)));
    });
    s.on('doctorRejected', ({ id }: any) => {
      setAllUsers(prev => prev.filter(u => u.id !== id));
    });
    s.on('userRemoved', ({ id }: any) => {
      setAllUsers(prev => prev.filter(u => u.id !== id));
    });
    return () => { s.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = allUsers.filter(usr => {
    const matchesSearch = !searchTerm || 
      usr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usr.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !roleFilter || roleFilter === 'all' || usr.role === roleFilter;
    
    const matchesStatus = !statusFilter || statusFilter === 'all' ||
      (statusFilter === 'active' && usr.isActive) ||
      (statusFilter === 'inactive' && !usr.isActive) ||
      (statusFilter === 'pending' && (usr.role === 'business' || usr.role === 'doctor') && usr.isApproved === false) ||
      (statusFilter === 'approved' && (usr.role === 'business' || usr.role === 'doctor') && usr.isApproved === true);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleApproveUser = async (userId: string) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch(`${API_BASE}/admin/doctors/${userId}/approve`, { method: 'PATCH', headers });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to approve');
      setAllUsers(users => users.map(u => u.id === userId ? { ...u, isApproved: true } : u));
      toast({ title: 'User approved', description: 'Business user has been approved and can now create slots.' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message || 'Approve failed', variant: 'destructive' });
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch(`${API_BASE}/admin/doctors/${userId}/reject`, { method: 'PATCH', headers });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to reject');
      setAllUsers(users => users.filter(u => u.id !== userId));
      toast({ title: 'User rejected', description: 'Business user has been rejected.' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message || 'Reject failed', variant: 'destructive' });
    }
  };

  const handleRemoveCustomer = async (userId: string) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to remove user');
      setAllUsers(users => users.filter(u => u.id !== userId));
      toast({ title: 'User removed', description: 'The user has been removed from the platform.' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message || 'Remove failed', variant: 'destructive' });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive text-destructive-foreground';
      case 'business':
        return 'bg-primary text-primary-foreground';
      case 'customer':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusBadge = (usr: AdminUser) => {
    if (!usr.isActive) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    if (usr.role === 'business' && usr.isApproved === false) {
      return <Badge className="bg-warning text-warning-foreground">Pending Approval</Badge>;
    }
    return <Badge className="bg-success text-success-foreground">Active</Badge>;
  };

  const stats = useMemo(() => ({
    total: allUsers.length,
    customers: allUsers.filter(u => u.role === 'customer').length,
    businesses: allUsers.filter(u => (u.role === 'business' || u.role === 'doctor')).length,
    pending: allUsers.filter(u => (u.role === 'business' || u.role === 'doctor') && u.isApproved === false).length,
    active: allUsers.filter(u => u.isActive).length
  }), [allUsers]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage all platform users and their permissions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.customers}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Businesses</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.businesses}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <CheckCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.active}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="roleFilter" className="text-sm font-medium">Role</label>
                <Select onValueChange={setRoleFilter}>
                  <SelectTrigger id="roleFilter" name="role">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="statusFilter" className="text-sm font-medium">Status</label>
                <Select onValueChange={setStatusFilter}>
                  <SelectTrigger id="statusFilter" name="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">All Users ({filteredUsers.length})</h2>
          
          <div className="space-y-4">
            {filteredUsers.map((usr) => (
              <Card key={usr.id} className="shadow-card hover:shadow-elevated transition-smooth">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{usr.name}</h3>
                        <p className="text-muted-foreground">{usr.email}</p>
                        <p className="text-sm text-muted-foreground">{usr.phone}</p>
                        {usr.businessType && (
                          <p className="text-sm text-muted-foreground">Business: {usr.businessType}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex gap-2 mb-2">
                          <Badge className={getRoleColor(usr.role)}>
                            {usr.role.charAt(0).toUpperCase() + usr.role.slice(1)}
                          </Badge>
                          {getStatusBadge(usr)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Joined: {new Date(usr.joinedDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last login: {new Date(usr.lastLogin).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        {(usr.role === 'business' || usr.role === 'doctor') && usr.isApproved === false && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveUser(usr.id)}
                            className="bg-success text-success-foreground hover:bg-success/90"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                        )}
                        {(usr.role === 'business' || usr.role === 'doctor') && usr.isApproved === false && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectUser(usr.id)}
                            className="text-destructive"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        )}
                        {usr.role === 'customer' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveCustomer(usr.id)}
                            className="text-destructive"
                          >
                            Remove
                          </Button>
                        )}

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedUser(usr)}>
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>User Details</DialogTitle>
                              <DialogDescription>
                                Complete information for {selectedUser?.name}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedUser && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Name</label>
                                    <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Email</label>
                                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Phone</label>
                                    <p className="text-sm text-muted-foreground">{selectedUser.phone}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Role</label>
                                    <p className="text-sm text-muted-foreground capitalize">{selectedUser.role}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Status</label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedUser.isActive ? 'Active' : 'Inactive'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Joined Date</label>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(selectedUser.joinedDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                  {selectedUser.businessType && (
                                    <div className="col-span-2">
                                      <label className="text-sm font-medium">Business Type</label>
                                      <p className="text-sm text-muted-foreground">{selectedUser.businessType}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;