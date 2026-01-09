import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Pricing = () => {
  const plans = [
    {
      name: "Free",
      price: "₦0",
      period: "forever",
      description: "Perfect for getting started",
      features: [
        { text: "Up to 5 units", included: true },
        { text: "Basic rent collection", included: true },
        { text: "Tenant portal", included: true },
        { text: "Email support", included: true },
        { text: "Automated reminders", included: false },
        { text: "Financial reports", included: false },
        { text: "Priority support", included: false },
        { text: "Custom branding", included: false }
      ],
      cta: "Get Started",
      href: "/register",
      popular: false
    },
    {
      name: "Pro",
      price: "₦3,000",
      period: "per month",
      description: "For serious landlords",
      features: [
        { text: "Unlimited units", included: true },
        { text: "Advanced rent collection", included: true },
        { text: "Tenant portal", included: true },
        { text: "Email & phone support", included: true },
        { text: "Automated reminders", included: true },
        { text: "Financial reports", included: true },
        { text: "Maintenance tracking", included: true },
        { text: "Document storage", included: true }
      ],
      cta: "Start Free Trial",
      href: "/register",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      description: "For property management companies",
      features: [
        { text: "Everything in Pro", included: true },
        { text: "Dedicated account manager", included: true },
        { text: "Custom integrations", included: true },
        { text: "White-label options", included: true },
        { text: "API access", included: true },
        { text: "SLA guarantee", included: true },
        { text: "Training & onboarding", included: true },
        { text: "Priority support 24/7", included: true }
      ],
      cta: "Contact Sales",
      href: "/contact",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground">
              Choose the plan that's right for you. All plans include a 14-day free trial.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, idx) => (
              <Card 
                key={idx} 
                className={`p-8 relative ${plan.popular ? 'border-2 border-accent shadow-lg' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.period !== "contact us" && (
                      <span className="text-muted-foreground">
                        /{plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? 'text-foreground' : 'text-muted-foreground'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <a href={plan.href}>{plan.cta}</a>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Is there a free trial?
                </h3>
                <p className="text-muted-foreground">
                  Yes! All paid plans come with a 14-day free trial. No credit card required to start.
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Can I change plans later?
                </h3>
                <p className="text-muted-foreground">
                  Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  What payment methods do you accept?
                </h3>
                <p className="text-muted-foreground">
                  We accept credit/debit cards, bank transfers, and mobile money payments.
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Is there a setup fee?
                </h3>
                <p className="text-muted-foreground">
                  No setup fees. The price you see is the price you pay. No hidden charges.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
