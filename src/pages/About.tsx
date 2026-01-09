import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Target, Users, Zap, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";

const About = () => {
  const values = [
    {
      icon: Target,
      title: "Our Mission",
      description: "To simplify property management for landlords worldwide, making it easier to grow and manage rental portfolios efficiently."
    },
    {
      icon: Users,
      title: "Customer First",
      description: "We put our customers at the heart of everything we do, constantly iterating based on feedback to deliver the best experience."
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "We embrace new technologies and ideas to stay ahead of the curve and provide cutting-edge solutions."
    },
    {
      icon: Heart,
      title: "Reliability",
      description: "We build trust through consistent, reliable service that landlords and tenants can depend on every day."
    }
  ];

  const team = [
    {
      name: "Sarah Mitchell",
      role: "CEO & Co-founder",
      description: "Former property manager with 15+ years of experience in real estate."
    },
    {
      name: "James Chen",
      role: "CTO & Co-founder",
      description: "Tech entrepreneur passionate about solving real-world problems with software."
    },
    {
      name: "Emily Rodriguez",
      role: "Head of Product",
      description: "Product leader focused on creating intuitive user experiences."
    },
    {
      name: "Michael Brown",
      role: "Head of Customer Success",
      description: "Dedicated to ensuring every customer achieves their goals with RentFlow."
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
              Transforming Property Management
            </h1>
            <p className="text-xl text-muted-foreground">
              We're on a mission to make property management simple, efficient, and accessible to everyone.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-6">Our Story</h2>
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
              <p>
                RentFlow was born from firsthand experience with the challenges of property management. Our founders, 
                Sarah and James, met while Sarah was struggling to manage her growing portfolio of rental properties 
                using spreadsheets and manual processes.
              </p>
              <p>
                After countless late nights tracking rent payments, chasing tenants, and managing maintenance requests 
                through endless email threads, they knew there had to be a better way. In 2022, they decided to build 
                the solution they wished existed.
              </p>
              <p>
                Today, RentFlow serves over 5,000 landlords worldwide, managing billions in rental payments and helping 
                property owners save time, reduce stress, and grow their portfolios with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Values</h2>
            <p className="text-xl text-muted-foreground">
              The principles that guide everything we do
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {values.map((value, idx) => (
              <Card key={idx} className="p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">
                  {value.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Meet Our Team</h2>
            <p className="text-xl text-muted-foreground">
              Passionate people building the future of property management
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {team.map((member, idx) => (
              <Card key={idx} className="p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {member.name}
                </h3>
                <p className="text-sm text-accent mb-3">
                  {member.role}
                </p>
                <p className="text-sm text-muted-foreground">
                  {member.description}
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
              Join Us on Our Journey
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Whether you're a landlord looking for a better way to manage properties or someone 
              passionate about property tech, we'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/register" 
                className="inline-flex items-center justify-center px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Start Free Trial
              </a>
              <a 
                href="/careers" 
                className="inline-flex items-center justify-center px-6 py-3 border-2 border-border bg-background text-foreground font-semibold rounded-lg hover:bg-accent/5 transition-colors"
              >
                View Careers
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
