import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const benefits = [
  "14-day free trial",
  "No credit card required",
  "Cancel anytime",
];

const CTA = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-24 relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 -z-10"
        style={{ background: 'var(--gradient-hero)' }}
      />
      
      {/* Decorative elements - Hidden on small screens */}
      <div className="hidden sm:block absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="hidden sm:block absolute bottom-0 left-0 w-48 h-48 sm:w-72 sm:h-72 bg-info/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 relative">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-primary-foreground mb-4 sm:mb-6 px-4 sm:px-0">
            Ready to Simplify Your Property Management?
          </h2>
          <p className="text-base sm:text-lg text-primary-foreground/70 mb-6 sm:mb-8 max-w-xl mx-auto px-4 sm:px-0">
            Join thousands of landlords who've streamlined their operations with RentFlow. Start your free trial today.
          </p>

          {/* Benefits */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-6 mb-8 sm:mb-10 px-4 sm:px-0">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center justify-center gap-2 text-primary-foreground/80">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-accent flex-shrink-0" />
                <span className="text-sm sm:text-base">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="px-4 sm:px-0">
            <Button variant="accent" size="xl" asChild className="group w-full sm:w-auto touch-target">
              <Link to="/register" className="flex items-center justify-center">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
