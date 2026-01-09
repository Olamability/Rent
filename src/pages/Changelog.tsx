import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Sparkles, Bug, Zap } from "lucide-react";

const Changelog = () => {
  const updates = [
    {
      version: "2.5.0",
      date: "December 8, 2024",
      type: "feature",
      items: [
        "Added automated rent reminder system with customizable templates",
        "Introduced bulk property import via CSV",
        "New financial dashboard with advanced analytics",
        "Mobile app performance improvements"
      ]
    },
    {
      version: "2.4.1",
      date: "November 30, 2024",
      type: "improvement",
      items: [
        "Enhanced search functionality across all modules",
        "Improved PDF generation for lease agreements",
        "Updated email notification templates",
        "Performance optimizations for large portfolios"
      ]
    },
    {
      version: "2.4.0",
      date: "November 15, 2024",
      type: "feature",
      items: [
        "Launched tenant screening integration",
        "Added maintenance request photo uploads",
        "New role-based access control system",
        "Integration with QuickBooks and Xero"
      ]
    },
    {
      version: "2.3.2",
      date: "November 1, 2024",
      type: "fix",
      items: [
        "Fixed issue with payment receipt generation",
        "Resolved timezone issues in rent reminders",
        "Fixed export functionality for reports",
        "Corrected calculation errors in financial summaries"
      ]
    },
    {
      version: "2.3.0",
      date: "October 15, 2024",
      type: "feature",
      items: [
        "Introduced automated late payment fees",
        "Added multi-language support (English, French, Portuguese)",
        "New mobile-responsive tenant portal",
        "Enhanced document management system"
      ]
    },
    {
      version: "2.2.0",
      date: "October 1, 2024",
      type: "feature",
      items: [
        "Launched automated lease renewal reminders",
        "Added custom fields for properties and tenants",
        "New reporting engine with customizable reports",
        "Integration with Stripe for international payments"
      ]
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case "feature": return <Sparkles className="w-5 h-5 text-accent" />;
      case "improvement": return <Zap className="w-5 h-5 text-info" />;
      case "fix": return <Bug className="w-5 h-5 text-warning" />;
      default: return <Calendar className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "feature": return "New Features";
      case "improvement": return "Improvements";
      case "fix": return "Bug Fixes";
      default: return "Update";
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "feature": return "bg-accent/10 text-accent";
      case "improvement": return "bg-info/10 text-info";
      case "fix": return "bg-warning/10 text-warning";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Changelog
            </h1>
            <p className="text-xl text-muted-foreground">
              Stay updated with the latest features, improvements, and fixes
            </p>
          </div>
        </div>
      </section>

      {/* Changelog */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {updates.map((update, idx) => (
                <Card key={idx} className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      {getIcon(update.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-foreground">
                          Version {update.version}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeBadgeClass(update.type)}`}>
                          {getTypeLabel(update.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{update.date}</span>
                      </div>
                    </div>
                  </div>
                  
                  <ul className="space-y-3">
                    {update.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-2" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Subscribe Section */}
      <section className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Stay Updated
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Subscribe to our newsletter to get notified about new features and updates
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1"
              />
              <Button className="whitespace-nowrap">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Changelog;
