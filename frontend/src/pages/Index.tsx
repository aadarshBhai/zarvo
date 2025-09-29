import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Users, 
  ArrowRight, 
  CheckCircle, 
  Star, 
  Stethoscope,
  Heart,
  Eye,
  Smile,
  Activity,
  MessageCircle
} from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Google sign-in removed

  const features = [
    {
      icon: Calendar,
      title: "Easy Booking",
      description: "Book appointments with healthcare professionals in just a few clicks"
    },
    {
      icon: Clock,
      title: "Real-time Availability",
      description: "See live slot availability and book instantly"
    },
    {
      icon: Users,
      title: "Trusted Professionals",
      description: "Connect with verified healthcare providers and businesses"
    },
    {
      icon: CheckCircle,
      title: "Instant Confirmation",
      description: "Get immediate booking confirmation and reminders"
    }
  ];

  const departments = [
    { icon: Heart, name: "Heart Checkup", color: "text-red-500" },
    { icon: Eye, name: "Eye Care", color: "text-blue-500" },
    { icon: Smile, name: "Dental Care", color: "text-green-500" },
    { icon: Activity, name: "General Checkup", color: "text-purple-500" },
    { icon: Stethoscope, name: "Dermatology", color: "text-orange-500" }
  ];

  const stats = [
    { label: "Trusted Providers", value: "500+" },
    { label: "Happy Customers", value: "10K+" },
    { label: "Appointments Booked", value: "50K+" },
    { label: "Cities Covered", value: "25+" }
  ];

  if (user) {
    // Redirect authenticated users to their respective dashboards
    const getDashboardLink = () => {
      switch (user.role) {
        case 'customer':
          return '/book-slot';
        case 'business':
          return '/business-dashboard';
        case 'admin':
          return '/admin-dashboard';
        default:
          return '/profile';
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Welcome Message */}
            <Card className="shadow-elevated mb-8">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Stethoscope className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Welcome back, {user.name}!</CardTitle>
                <CardDescription>
                  Ready to {user.role === 'customer' ? 'book your next appointment' : 'manage your business'}?
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex justify-center gap-2 mb-4">
                  <Badge className="bg-success text-success-foreground capitalize">
                    {user.role}
                  </Badge>
                  {user.role === 'business' && user.isApproved === false && (
                    <Badge className="bg-warning text-warning-foreground">
                      Pending Approval
                    </Badge>
                  )}
                </div>
                <Button asChild className="bg-gradient-primary hover:shadow-primary transition-bounce">
                  <Link to={getDashboardLink()}>
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <Card key={stat.label} className="shadow-card text-center">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-primary">{stat.value}</div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Stethoscope className="h-8 w-8 text-white" />
              </div>
              <span className="text-3xl font-bold">Zarvo</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Book Healthcare Appointments
              <span className="block text-primary-light">Effortlessly</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              Connect with trusted healthcare professionals and book appointments instantly. 
              Your health journey simplified.
            </p>
            {/* WhatsApp CTA */}
            <div className="flex items-center justify-center gap-3">
              <a
                href={
                  `https://wa.me/918738030604?text=${encodeURIComponent(
                    'Hi, I would like to upload my report and get real-time suggestions.'
                  )}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium shadow-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Chat on WhatsApp (+91 87380 30604)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Zarvo?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We make healthcare appointments simple, fast, and reliable
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="shadow-card hover:shadow-elevated transition-smooth text-center">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Departments Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Healthcare Services</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Book appointments across various medical specialties
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {departments.map((dept) => {
              const Icon = dept.icon;
              return (
                <Card key={dept.name} className="shadow-card hover:shadow-elevated transition-smooth text-center">
                  <CardContent className="pt-6">
                    <Icon className={`h-8 w-8 mx-auto mb-3 ${dept.color}`} />
                    <p className="font-medium">{dept.name}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Thousands</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join our growing community of patients and healthcare providers
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.value}</div>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      
      {/* Floating WhatsApp Button */}
      <a
        href={
          `https://wa.me/918738030604?text=${encodeURIComponent(
            'Hi, I would like to upload my report and get real-time suggestions.'
          )}`
        }
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-xl transition-transform hover:scale-105"
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
      </a>

    </div>
  );
};

export default Index;
