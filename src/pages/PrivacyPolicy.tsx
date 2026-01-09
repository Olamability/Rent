import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-foreground mb-6">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: December 8, 2024</p>
            
            <Card className="p-8">
              <div className="prose prose-lg max-w-none space-y-6">
                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Introduction</h2>
                  <p className="text-muted-foreground">
                    At RentFlow, we take your privacy seriously. This Privacy Policy explains how we collect, 
                    use, disclose, and safeguard your information when you use our property management platform.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Information We Collect</h2>
                  <p className="text-muted-foreground mb-3">We collect information that you provide directly to us, including:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Account information (name, email, phone number)</li>
                    <li>Property and tenant information</li>
                    <li>Payment and billing information</li>
                    <li>Communications with our support team</li>
                    <li>Usage data and analytics</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
                  <p className="text-muted-foreground mb-3">We use the information we collect to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process payments and send transaction notifications</li>
                    <li>Send you technical notices and support messages</li>
                    <li>Respond to your comments and questions</li>
                    <li>Detect, prevent, and address technical issues and fraud</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Data Security</h2>
                  <p className="text-muted-foreground">
                    We implement appropriate technical and organizational measures to protect your personal 
                    data against unauthorized access, alteration, disclosure, or destruction. This includes 
                    encryption, secure servers, and regular security audits.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Data Sharing</h2>
                  <p className="text-muted-foreground">
                    We do not sell your personal information. We may share your information with third-party 
                    service providers who help us operate our platform (e.g., payment processors, cloud hosting), 
                    but only to the extent necessary to provide our services.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Your Rights</h2>
                  <p className="text-muted-foreground mb-3">You have the right to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Access and receive a copy of your personal data</li>
                    <li>Correct inaccurate or incomplete data</li>
                    <li>Request deletion of your data</li>
                    <li>Object to or restrict certain processing activities</li>
                    <li>Data portability</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
                  <p className="text-muted-foreground">
                    If you have any questions about this Privacy Policy, please contact us at:{" "}
                    <a href="mailto:privacy@rentflow.com" className="text-accent hover:underline">
                      privacy@rentflow.com
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

export default PrivacyPolicy;
