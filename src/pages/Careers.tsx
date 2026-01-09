import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { MapPin, Briefcase, Clock, Users } from "lucide-react";

const Careers = () => {
  const positions = [
    {
      title: "Senior Full-Stack Engineer",
      department: "Engineering",
      location: "Lagos, Nigeria (Remote)",
      type: "Full-time",
      description: "Help us build the future of property management software. We're looking for an experienced engineer passionate about creating delightful user experiences."
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "Remote",
      type: "Full-time",
      description: "Design intuitive interfaces that make property management simple. You'll work closely with our engineering and product teams."
    },
    {
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "Lagos, Nigeria",
      type: "Full-time",
      description: "Help our customers succeed with RentFlow. You'll onboard new users, provide training, and ensure customer satisfaction."
    },
    {
      title: "Marketing Manager",
      department: "Marketing",
      location: "Remote",
      type: "Full-time",
      description: "Drive growth through creative marketing campaigns. You'll manage our brand, content strategy, and customer acquisition."
    }
  ];

  const benefits = [
    "Competitive salary and equity",
    "Flexible remote work options",
    "Health insurance coverage",
    "Professional development budget",
    "Generous vacation policy",
    "Latest tech equipment",
    "Team retreats and events",
    "Collaborative culture"
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Join Our Team
            </h1>
            <p className="text-xl text-muted-foreground">
              Help us transform property management for landlords everywhere
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
              Why Work at RentFlow?
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                  <p className="text-muted-foreground">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
              Open Positions
            </h2>
            
            <div className="space-y-6">
              {positions.map((position, idx) => (
                <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {position.title}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          <span>{position.department}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{position.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{position.type}</span>
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground">
                        {position.description}
                      </p>
                    </div>
                    
                    <button className="px-6 py-2 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap self-start md:self-center">
                      Apply Now
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Users className="w-16 h-16 text-accent mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Don't See the Right Role?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              We're always looking for talented people. Send us your resume and we'll keep you in mind for future opportunities.
            </p>
            <a 
              href="mailto:careers@rentflow.com" 
              className="inline-flex items-center justify-center px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Send Your Resume
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Careers;
