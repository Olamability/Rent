import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { 
  CreditCard, FileText, Bell, Shield, BarChart3, Wrench, 
  Users, Archive, Smartphone, Clock, CheckCircle, Zap 
} from "lucide-react";
import { Card } from "@/components/ui/card";

const Features = () => {
  const features = [
    {
      icon: CreditCard,
      title: "Automated Rent Collection",
      description: "Accept payments via cards, bank transfers, or mobile money. Automatic reminders ensure you never miss a payment."
    },
    {
      icon: FileText,
      title: "Digital Lease Agreements",
      description: "Create, send, and e-sign lease agreements in minutes. All documents securely stored and easily accessible."
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Automated reminders for rent due dates, lease renewals, and maintenance updates via email, SMS, or push."
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "Bank-level encryption, PCI-compliant payments, and GDPR-ready data protection for peace of mind."
    },
    {
      icon: BarChart3,
      title: "Financial Insights",
      description: "Track income, expenses, and occupancy rates. Generate reports and understand your portfolio performance."
    },
    {
      icon: Wrench,
      title: "Maintenance Management",
      description: "Tenants submit requests with photos. Track progress, assign contractors, and keep everyone informed."
    },
    {
      icon: Users,
      title: "Tenant Portal",
      description: "Tenants can pay rent, view documents, submit requests, and communicate — all from their own dashboard."
    },
    {
      icon: Archive,
      title: "Document Storage",
      description: "Securely store leases, IDs, inspection reports, and more. Access everything from anywhere, anytime."
    },
    {
      icon: Smartphone,
      title: "Mobile Access",
      description: "Manage your properties on the go with our responsive design. Works seamlessly on any device."
    },
    {
      icon: Clock,
      title: "Time-Saving Automation",
      description: "Automate recurring tasks, invoicing, and reminders. Spend less time on admin and more on growing your portfolio."
    },
    {
      icon: CheckCircle,
      title: "Applicant Screening",
      description: "Screen potential tenants with background checks, credit reports, and reference verification tools."
    },
    {
      icon: Zap,
      title: "Quick Setup",
      description: "Get started in minutes with our intuitive onboarding process. Import existing data with ease."
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
              Everything You Need to Manage Properties
            </h1>
            <p className="text-xl text-muted-foreground">
              From rent collection to maintenance tracking, we've got every aspect of property management covered.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of landlords who've streamlined their operations with RentFlow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/register" 
                className="inline-flex items-center justify-center px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Start Free Trial
              </a>
              <a 
                href="/pricing" 
                className="inline-flex items-center justify-center px-6 py-3 border-2 border-border bg-background text-foreground font-semibold rounded-lg hover:bg-accent/5 transition-colors"
              >
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Features;
