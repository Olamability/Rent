import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";

const TermsOfService = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-foreground mb-6">Terms of Service</h1>
            <p className="text-muted-foreground mb-8">Last updated: December 8, 2024</p>
            
            <Card className="p-8">
              <div className="prose prose-lg max-w-none space-y-6">
                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Agreement to Terms</h2>
                  <p className="text-muted-foreground">
                    By accessing or using RentFlow, you agree to be bound by these Terms of Service. 
                    If you disagree with any part of the terms, you may not access the service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Use License</h2>
                  <p className="text-muted-foreground mb-3">
                    Permission is granted to temporarily use RentFlow for personal or commercial property 
                    management purposes. This is the grant of a license, not a transfer of title, and under 
                    this license you may not:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Modify or copy the materials</li>
                    <li>Use the materials for any commercial purpose without authorization</li>
                    <li>Attempt to reverse engineer any software</li>
                    <li>Remove any copyright or proprietary notations</li>
                    <li>Transfer the materials to another person or "mirror" on any other server</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Account Responsibilities</h2>
                  <p className="text-muted-foreground mb-3">You are responsible for:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Maintaining the security of your account credentials</li>
                    <li>All activities that occur under your account</li>
                    <li>Ensuring all information provided is accurate and up-to-date</li>
                    <li>Complying with all applicable laws and regulations</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Payment Terms</h2>
                  <p className="text-muted-foreground">
                    Subscription fees are billed in advance on a monthly or annual basis. You agree to pay 
                    all fees associated with your account. We reserve the right to change our pricing with 
                    30 days notice to existing subscribers.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Service Availability</h2>
                  <p className="text-muted-foreground">
                    We strive to maintain 99.9% uptime but do not guarantee uninterrupted access to the 
                    service. We may perform scheduled maintenance and updates that could temporarily affect 
                    availability.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Limitation of Liability</h2>
                  <p className="text-muted-foreground">
                    RentFlow shall not be liable for any indirect, incidental, special, consequential, or 
                    punitive damages resulting from your use or inability to use the service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Termination</h2>
                  <p className="text-muted-foreground">
                    We may terminate or suspend your account immediately, without prior notice, for any 
                    breach of these Terms. You may cancel your subscription at any time through your 
                    account settings.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Changes to Terms</h2>
                  <p className="text-muted-foreground">
                    We reserve the right to modify these terms at any time. We will provide notice of 
                    significant changes via email or through the service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Information</h2>
                  <p className="text-muted-foreground">
                    Questions about the Terms of Service should be sent to:{" "}
                    <a href="mailto:legal@rentflow.com" className="text-accent hover:underline">
                      legal@rentflow.com
                    </a>
                  </p>
                </section>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TermsOfService;
