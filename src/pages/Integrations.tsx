import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

const Integrations = () => {
  const integrations = [
    {
      name: "Paystack",
      category: "Payments",
      description: "Accept payments via cards, bank transfers, and mobile money",
      logo: "💳"
    },
    {
      name: "Flutterwave",
      category: "Payments",
      description: "Alternative payment gateway for seamless transactions",
      logo: "💸"
    },
    {
      name: "Stripe",
      category: "Payments",
      description: "International payment processing for global landlords",
      logo: "💰"
    },
    {
      name: "QuickBooks",
      category: "Accounting",
      description: "Sync your financial data with QuickBooks automatically",
      logo: "📊"
    },
    {
      name: "Xero",
      category: "Accounting",
      description: "Beautiful accounting software integration",
      logo: "📈"
    },
    {
      name: "Mailgun",
      category: "Communication",
      description: "Reliable email delivery for notifications and reminders",
      logo: "📧"
    },
    {
      name: "Twilio",
      category: "Communication",
      description: "SMS notifications and two-factor authentication",
      logo: "📱"
    },
    {
      name: "Slack",
      category: "Communication",
      description: "Get notified about important events in your Slack workspace",
      logo: "💬"
    },
    {
      name: "Google Calendar",
      category: "Productivity",
      description: "Sync maintenance schedules and rent due dates",
      logo: "📅"
    },
    {
      name: "Zapier",
      category: "Automation",
      description: "Connect RentFlow with 3,000+ apps",
      logo: "⚡"
    },
    {
      name: "DocuSign",
      category: "Documents",
      description: "E-signature integration for lease agreements",
      logo: "✍️"
    },
    {
      name: "Google Drive",
      category: "Storage",
      description: "Store and sync documents with Google Drive",
      logo: "📁"
    }
  ];

  const categories = [...new Set(integrations.map(i => i.category))];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Integrations
            </h1>
            <p className="text-xl text-muted-foreground">
              Connect RentFlow with your favorite tools and services
            </p>
          </div>
        </div>
      </section>

      {/* Integrations by Category */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {categories.map((category) => (
              <div key={category} className="mb-16 last:mb-0">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {category}
                </h2>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {integrations
                    .filter(integration => integration.category === category)
                    .map((integration, idx) => (
                      <Card key={idx} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div className="text-4xl">{integration.logo}</div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                              {integration.name}
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {integration.description}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Section */}
      <section className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Need a Custom Integration?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Our REST API makes it easy to build custom integrations. Contact our sales team 
              to learn about our Enterprise plan with full API access.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/contact" 
                className="inline-flex items-center justify-center px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Contact Sales
              </a>
              <a 
                href="#" 
                className="inline-flex items-center justify-center px-6 py-3 border-2 border-border bg-background text-foreground font-semibold rounded-lg hover:bg-accent/5 transition-colors"
              >
                View API Docs
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Integrations;
