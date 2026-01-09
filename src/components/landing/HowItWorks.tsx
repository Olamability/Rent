import { Building2, UserPlus, Receipt, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Building2,
    step: "01",
    title: "List Your Properties",
    description: "Add your properties and units with photos, amenities, and rental terms. Set up rent amounts and deposit requirements.",
  },
  {
    icon: UserPlus,
    step: "02",
    title: "Onboard Tenants",
    description: "Invite tenants to apply, screen applicants, and send digital lease agreements for e-signature.",
  },
  {
    icon: Receipt,
    step: "03",
    title: "Automate Billing",
    description: "Set up recurring rent invoices with automatic reminders. Accept payments online and track everything.",
  },
  {
    icon: CheckCircle2,
    step: "04",
    title: "Manage & Grow",
    description: "Handle maintenance requests, access reports, and scale your portfolio with confidence.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 lg:mb-16">
          <span className="text-accent font-medium text-xs sm:text-sm uppercase tracking-wider">How It Works</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mt-2 sm:mt-3 mb-3 sm:mb-4 px-4 sm:px-0">
            Get Started in Minutes
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg px-4 sm:px-0">
            Simple setup, powerful results. Here's how RentFlow transforms your property management.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {/* Connector line - Hidden on mobile and tablet */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-accent/50 to-accent/10 -translate-y-1/2" />
              )}
              
              <div className="text-center">
                {/* Step number & icon */}
                <div className="relative inline-flex mb-4 sm:mb-6">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl bg-card border border-border flex items-center justify-center shadow-soft">
                    <step.icon className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
                  </div>
                  <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-bold flex items-center justify-center">
                    {step.step}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3 px-2">{step.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed px-2">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
