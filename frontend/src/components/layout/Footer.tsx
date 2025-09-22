import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary/50 border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">Zarvo</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Simplifying appointment booking for healthcare professionals and patients. 
              Book, manage, and track your appointments seamlessly.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/about" className="block text-sm text-muted-foreground hover:text-primary transition-smooth">
                About Us
              </Link>
              <Link to="/services" className="block text-sm text-muted-foreground hover:text-primary transition-smooth">
                Services
              </Link>
              <Link to="/contact" className="block text-sm text-muted-foreground hover:text-primary transition-smooth">
                Contact
              </Link>
              <Link to="/help" className="block text-sm text-muted-foreground hover:text-primary transition-smooth">
                Help Center
              </Link>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Services</h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Heart Checkup</p>
              <p className="text-sm text-muted-foreground">General Checkup</p>
              <p className="text-sm text-muted-foreground">Dental Care</p>
              <p className="text-sm text-muted-foreground">Eye Care</p>
              <p className="text-sm text-muted-foreground">Dermatology</p>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                support@zarvo.com
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                +1 (555) 123-4567
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                123 Healthcare Ave, Medical District
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Zarvo. All rights reserved. | 
            <Link to="/privacy" className="hover:text-primary transition-smooth ml-1">
              Privacy Policy
            </Link> | 
            <Link to="/terms" className="hover:text-primary transition-smooth ml-1">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;