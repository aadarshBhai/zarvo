import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar, 
  Settings, 
  User, 
  Menu, 
  LogOut, 
  BarChart3,
  Clock,
  Users,
  Stethoscope
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getNavItems = () => {
    if (!user) {
      return [
        { label: 'Home', href: '/', icon: Stethoscope },
        { label: 'Login', href: '/login', icon: User },
        { label: 'Sign Up', href: '/signup', icon: User }
      ];
    }

    switch (user.role) {
      case 'customer':
        return [
          { label: 'Book Appointment', href: '/book-slot', icon: Calendar },
          { label: 'My Bookings', href: '/my-bookings', icon: Clock },
          { label: 'Profile', href: '/profile', icon: User }
        ];
      case 'business':
        return [
          { label: 'Dashboard', href: '/business-dashboard', icon: BarChart3 },
          { label: 'Manage Slots', href: '/manage-slots', icon: Calendar },
          { label: 'View Bookings', href: '/view-bookings', icon: Clock },
          { label: 'Profile', href: '/profile', icon: User }
        ];
      case 'admin':
        return [
          { label: 'Admin Dashboard', href: '/admin-dashboard', icon: BarChart3 },
          { label: 'User Management', href: '/user-management', icon: Users },
          { label: 'System Settings', href: '/settings', icon: Settings }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const NavContent = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        
        return (
          <React.Fragment key={item.href}>
            {(
              <Link
                to={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-smooth text-sm font-medium ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-primary'
                    : 'text-foreground hover:bg-secondary'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Zarvo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              <NavContent />
            </div>
            
            {user && (
              <div className="flex items-center gap-2 pl-4 border-l">
                <span className="text-sm text-muted-foreground">
                  Welcome, {user.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col gap-4 py-4">
                  {user && (
                    <div className="pb-4 border-b">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2">
                    <NavContent />
                  </div>
                  
                  {user && (
                    <div className="pt-4 border-t">
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={logout}
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;