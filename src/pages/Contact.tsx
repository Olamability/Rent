import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const Contact = () => {
  const contactMethods = [
    {
      icon: Mail,
      title: "Email",
      details: "support@rentflow.com",
      description: "We'll respond within 24 hours"
    },
    {
      icon: Phone,
      title: "Phone",
      details: "+234 (800) 123-4567",
      description: "Mon-Fri, 9am-5pm WAT"
    },
    {
      icon: MapPin,
      title: "Office",
      details: "Lagos, Nigeria",
      description: "Visit us by appointment"
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
              Get in Touch
            </h1>
            <p className="text-xl text-muted-foreground">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            {contactMethods.map((method, idx) => (
              <Card key={idx} className="p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <method.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {method.title}
                </h3>
                <p className="text-foreground font-medium mb-1">
                  {method.details}
                </p>
                <p className="text-sm text-muted-foreground">
                  {method.description}
                </p>
              </Card>
            ))}
          </div>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Send us a Message
              </h2>
              
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      placeholder="John" 
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      placeholder="Doe" 
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="john@example.com" 
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="+234 800 123 4567" 
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input 
                    id="subject" 
                    placeholder="How can we help?" 
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    rows={6}
                    placeholder="Tell us more about your inquiry..."
                    className="mt-2"
                  />
                </div>

                <Button className="w-full" size="lg">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
              Common Questions
            </h2>
            
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  How quickly will I get a response?
                </h3>
                <p className="text-muted-foreground">
                  We aim to respond to all inquiries within 24 hours during business days. For urgent matters, please call our support line.
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Can I schedule a demo?
                </h3>
                <p className="text-muted-foreground">
                  Absolutely! Mention that you'd like a demo in your message, and our team will reach out to schedule a convenient time.
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Do you offer enterprise solutions?
                </h3>
                <p className="text-muted-foreground">
                  Yes! We provide custom enterprise solutions for property management companies. Contact our sales team to discuss your needs.
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

export default Contact;
