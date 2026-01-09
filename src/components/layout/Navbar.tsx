import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Menu, X } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" onClick={handleLinkClick}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary flex items-center justify-center group-hover:shadow-glow transition-all duration-300 group-hover:scale-105">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-semibold text-foreground">RentFlow</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link to="/features" className="text-sm lg:text-base text-muted-foreground hover:text-foreground transition-colors font-medium">
              Features
            </Link>
            <Link to="/pricing" className="text-sm lg:text-base text-muted-foreground hover:text-foreground transition-colors font-medium">
              Pricing
            </Link>
            <Link to="/about" className="text-sm lg:text-base text-muted-foreground hover:text-foreground transition-colors font-medium">
              About
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="default" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button variant="accent" size="default" asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 touch-target text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-border/50 animate-slide-up bg-background">
            <div className="flex flex-col gap-1 pt-4">
              <Link 
                to="/features" 
                className="text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors py-3 px-4 rounded-lg font-medium touch-target"
                onClick={handleLinkClick}
              >
                Features
              </Link>
              <Link 
                to="/pricing" 
                className="text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors py-3 px-4 rounded-lg font-medium touch-target"
                onClick={handleLinkClick}
              >
                Pricing
              </Link>
              <Link 
                to="/about" 
                className="text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors py-3 px-4 rounded-lg font-medium touch-target"
                onClick={handleLinkClick}
              >
                About
              </Link>
              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-border/50">
                <Button variant="outline" asChild className="w-full touch-target">
                  <Link to="/login" onClick={handleLinkClick}>Sign In</Link>
                </Button>
                <Button variant="accent" asChild className="w-full touch-target">
                  <Link to="/register" onClick={handleLinkClick}>Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
