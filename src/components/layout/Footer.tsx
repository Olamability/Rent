import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-10 sm:py-12 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 mb-8 sm:mb-10 lg:mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent flex items-center justify-center">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
              </div>
              <span className="text-lg sm:text-xl font-semibold">RentFlow</span>
            </Link>
            <p className="text-primary-foreground/60 text-sm leading-relaxed max-w-xs">
              The modern way to manage properties, collect rent, and keep tenants happy.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Product</h4>
            <ul className="space-y-2 sm:space-y-3 text-sm">
              <li><Link to="/features" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors inline-block py-1">Features</Link></li>
              <li><Link to="/pricing" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors inline-block py-1">Pricing</Link></li>
              <li><Link to="/integrations" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors inline-block py-1">Integrations</Link></li>
              <li><Link to="/changelog" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors inline-block py-1">Changelog</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Company</h4>
            <ul className="space-y-2 sm:space-y-3 text-sm">
              <li><Link to="/about" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors inline-block py-1">About Us</Link></li>
              <li><Link to="/careers" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors inline-block py-1">Careers</Link></li>
              <li><Link to="/blog" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors inline-block py-1">Blog</Link></li>
              <li><Link to="/contact" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors inline-block py-1">Contact</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Support</h4>
            <ul className="space-y-2 sm:space-y-3 text-sm">
              <li><Link to="/help" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors inline-block py-1">Help Center</Link></li>
              <li><Link to="/privacy" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors inline-block py-1">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors inline-block py-1">Terms of Service</Link></li>
              <li><Link to="/security" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors inline-block py-1">Security</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 sm:pt-8 border-t border-primary-foreground/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs sm:text-sm text-primary-foreground/60 text-center sm:text-left">
            © {new Date().getFullYear()} RentFlow. All rights reserved.
          </p>
          <div className="flex gap-4 sm:gap-6">
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors text-xs sm:text-sm touch-target">Twitter</a>
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors text-xs sm:text-sm touch-target">LinkedIn</a>
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors text-xs sm:text-sm touch-target">Facebook</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
