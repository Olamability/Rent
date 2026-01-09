import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Shield, Lock, Eye, Server, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

const Security = () => {
  const securityFeatures = [
    {
      icon: Lock,
      title: "Bank-Level Encryption",
      description: "All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption."
    },
    {
      icon: Shield,
      title: "PCI DSS Compliant",
      description: "Our payment processing is fully PCI DSS compliant, ensuring your financial data is protected."
    },
    {
      icon: Eye,
      title: "GDPR Ready",
      description: "We follow GDPR guidelines to protect user privacy and give you control over your data."
    },
    {
      icon: Server,
      title: "Secure Infrastructure",
      description: "Hosted on enterprise-grade cloud infrastructure with automatic backups and disaster recovery."
    }
  ];

  const practices = [
    "Regular security audits and penetration testing",
    "Multi-factor authentication (MFA) support",
    "Role-based access control (RBAC)",
    "Automated threat detection and monitoring",
    "Regular security patches and updates",
    "Employee security training and background checks",
    "Data retention and deletion policies",
    "Incident response and recovery procedures"
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Security & Compliance
            </h1>
            <p className="text-xl text-muted-foreground">
              Your data security and privacy are our top priorities. Learn how we protect your information.
            </p>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
              Enterprise-Grade Security
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {securityFeatures.map((feature, idx) => (
                <Card key={idx} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Security Practices */}
      <section className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
              Our Security Practices
            </h2>
            
            <Card className="p-8">
              <div className="grid md:grid-cols-2 gap-4">
                {practices.map((practice, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">{practice}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Certifications & Compliance
            </h2>
            <p className="text-xl text-muted-foreground mb-12">
              We maintain industry-standard certifications and comply with international regulations
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="p-6">
                <div className="text-4xl font-bold text-accent mb-2">ISO</div>
                <div className="text-lg font-semibold text-foreground mb-2">27001</div>
                <p className="text-sm text-muted-foreground">Information Security</p>
              </Card>
              
              <Card className="p-6">
                <div className="text-4xl font-bold text-accent mb-2">SOC</div>
                <div className="text-lg font-semibold text-foreground mb-2">Type 2</div>
                <p className="text-sm text-muted-foreground">Security & Availability</p>
              </Card>
              
              <Card className="p-6">
                <div className="text-4xl font-bold text-accent mb-2">GDPR</div>
                <div className="text-lg font-semibold text-foreground mb-2">Compliant</div>
                <p className="text-sm text-muted-foreground">Data Protection</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Report Section */}
      <section className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Report a Security Issue
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              If you discover a security vulnerability, please report it to our security team immediately.
            </p>
            <a 
              href="mailto:security@rentflow.com" 
              className="inline-flex items-center justify-center px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Contact Security Team
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Security;
