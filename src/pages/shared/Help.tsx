import { Link } from "react-router-dom";
import { Building2, Search, HelpCircle, Mail, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const Help = () => {
  const faqs = [
    { q: 'How do I pay my rent?', a: 'You can pay your rent through the Rent Payment page using card, bank transfer, or USSD. Simply navigate to the payment section and follow the prompts.' },
    { q: 'How do I submit a maintenance request?', a: 'Go to the Maintenance section in your dashboard, click "New Request", describe the issue, and optionally upload photos or videos.' },
    { q: 'How can I download my lease agreement?', a: 'Visit the Agreements section in your dashboard and click the "Download" button next to your active lease agreement.' },
    { q: 'What payment methods are accepted?', a: 'We accept credit/debit cards, bank transfers, and USSD payments through our integrated payment gateways.' },
    { q: 'How do I update my contact information?', a: 'Go to Settings or your Profile page to update your email, phone number, and other personal information.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Building2 className="w-6 h-6 text-accent-foreground" />
          </div>
          <span className="text-xl font-semibold">RentFlow</span>
        </Link>
        <div className="ml-auto">
          <Link to="/tenant/dashboard">
            <Button variant="ghost">Back to Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">How can we help?</h1>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search for help..." className="pl-12 py-6 text-lg" />
          </div>
        </div>

        {/* Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Email Support</h3>
            <p className="text-sm text-muted-foreground mb-4">We'll respond within 24 hours</p>
            <Button variant="outline" className="w-full">Send Email</Button>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Phone className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Phone Support</h3>
            <p className="text-sm text-muted-foreground mb-4">Mon-Fri, 9am-5pm</p>
            <Button variant="outline" className="w-full">Call Us</Button>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Live Chat</h3>
            <p className="text-sm text-muted-foreground mb-4">Get instant answers</p>
            <Button variant="outline" className="w-full">Start Chat</Button>
          </Card>
        </div>

        {/* FAQs */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span>{faq.q}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pl-8">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>
    </div>
  );
};

export default Help;
