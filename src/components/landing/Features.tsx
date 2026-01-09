import { 
  CreditCard, 
  FileSignature, 
  Bell, 
  Shield, 
  BarChart3, 
  Wrench,
  Users,
  CloudUpload
} from "lucide-react";

const features = [
  {
    icon: CreditCard,
    title: "Automated Rent Collection",
    description: "Accept payments via cards, bank transfers, or mobile money. Automatic reminders ensure you never miss a payment.",
  },
  {
    icon: FileSignature,
    title: "Digital Lease Agreements",
    description: "Create, send, and e-sign lease agreements in minutes. All documents securely stored and easily accessible.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Automated reminders for rent due dates, lease renewals, and maintenance updates via email, SMS, or push.",
  },
  {
    icon: Shield,
    title: "Secure & Compliant",
    description: "Bank-level encryption, PCI-compliant payments, and GDPR-ready data protection for peace of mind.",
  },
  {
    icon: BarChart3,
    title: "Financial Insights",
    description: "Track income, expenses, and occupancy rates. Generate reports and understand your portfolio performance.",
  },
  {
    icon: Wrench,
    title: "Maintenance Management",
    description: "Tenants submit requests with photos. Track progress, assign contractors, and keep everyone informed.",
  },
  {
    icon: Users,
    title: "Tenant Portal",
    description: "Tenants can pay rent, view documents, submit requests, and communicate — all from their own dashboard.",
  },
  {
    icon: CloudUpload,
    title: "Document Storage",
    description: "Securely store leases, IDs, inspection reports, and more. Access everything from anywhere, anytime.",
  },
];

const Features = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 lg:mb-16">
          <span className="text-accent font-medium text-xs sm:text-sm uppercase tracking-wider">Features</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mt-2 sm:mt-3 mb-3 sm:mb-4 px-4 sm:px-0">
            Everything You Need to Manage Properties
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg px-4 sm:px-0">
            From rent collection to maintenance tracking, we've got every aspect of property management covered.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-5 sm:p-6 rounded-xl sm:rounded-2xl bg-card border border-border hover:border-accent/30 hover:shadow-elevated transition-all duration-300 hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-accent/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-accent/20 transition-colors flex-shrink-0">
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5 sm:mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm sm:text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
