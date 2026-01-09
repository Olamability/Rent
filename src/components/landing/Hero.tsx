import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, CreditCard, FileText, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] sm:min-h-screen flex items-center justify-center overflow-hidden pt-16 sm:pt-20">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 -z-10"
        style={{ background: 'var(--gradient-hero)' }}
      />
      
      {/* Decorative elements - Hidden on small screens for performance */}
      <div className="hidden sm:block absolute top-1/4 left-10 w-48 h-48 sm:w-72 sm:h-72 bg-accent/10 rounded-full blur-3xl animate-pulse-soft" />
      <div className="hidden sm:block absolute bottom-1/4 right-10 w-64 h-64 sm:w-96 sm:h-96 bg-info/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />

      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 mb-6 sm:mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs sm:text-sm text-primary-foreground/80">Trusted by 5,000+ landlords worldwide</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 sm:mb-6 leading-tight animate-slide-up px-4 sm:px-0">
            Property Management{" "}
            <span className="gradient-text block sm:inline mt-2 sm:mt-0">Made Simple</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg lg:text-xl text-primary-foreground/70 mb-8 sm:mb-10 max-w-2xl mx-auto animate-slide-up px-2 sm:px-0" style={{ animationDelay: '0.1s' }}>
            Automate rent collection, manage tenants, handle maintenance requests, and grow your portfolio — all in one powerful platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16 animate-slide-up px-4 sm:px-0" style={{ animationDelay: '0.2s' }}>
            <Button variant="accent" size="xl" asChild className="group w-full sm:w-auto touch-target">
              <Link to="/register" className="flex items-center justify-center">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild className="bg-primary-foreground/5 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground w-full sm:w-auto touch-target">
              <Link to="/demo" className="flex items-center justify-center">Watch Demo</Link>
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-slide-up px-2 sm:px-0" style={{ animationDelay: '0.3s' }}>
            {[
              { icon: Building2, label: "Property Listings" },
              { icon: CreditCard, label: "Online Payments" },
              { icon: FileText, label: "Digital Leases" },
              { icon: Wrench, label: "Maintenance" },
            ].map((item) => (
              <div 
                key={item.label}
                className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 hover:bg-primary-foreground/10 transition-all hover:scale-105"
              >
                <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent flex-shrink-0" />
                <span className="text-xs sm:text-sm text-primary-foreground/80 text-center">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--background))"/>
        </svg>
      </div>
    </section>
  );
};

export default Hero;
