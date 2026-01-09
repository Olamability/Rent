import { useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Home, Building2, Users, CreditCard, Wrench, FileText, Settings,
  BarChart3, Crown, Bell as BellIcon, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const navLinks = [
  { icon: Home, label: "Dashboard", href: "/landlord/dashboard" },
  { icon: Building2, label: "Properties", href: "/landlord/properties" },
  { icon: Users, label: "Tenants", href: "/landlord/units" },
  { icon: CreditCard, label: "Rent Collection", href: "/landlord/rent-collection" },
  { icon: Wrench, label: "Maintenance", href: "/landlord/maintenance" },
  { icon: FileText, label: "Agreements", href: "/landlord/agreements" },
  { icon: BellIcon, label: "Reminders", href: "/landlord/reminders" },
  { icon: BarChart3, label: "Reports", href: "/landlord/reports" },
  { icon: Crown, label: "Subscription", href: "/landlord/subscription" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

const Subscription = () => {
  const [currentPlan, setCurrentPlan] = useState('pro');

  const handleUpgrade = () => {
    setCurrentPlan('pro');
    toast.success("Successfully upgraded to Pro plan!");
  };

  const handleDowngrade = () => {
    setCurrentPlan('free');
    toast.info("Downgraded to Free plan");
  };

  const features = {
    free: ['1 Property', 'Basic rent collection', 'Email support'],
    pro: ['Unlimited properties', 'Auto tenancy agreements', 'Analytics & reports', 'Priority support', 'Maintenance workflow', 'Automated reminders'],
  };

  return (
    <DashboardLayout
      navLinks={navLinks}
      userName="James Wilson"
      pageTitle="Subscription"
      pageDescription="Manage your subscription plan"
    >
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <Card className={`p-6 ${currentPlan === 'free' ? 'border-accent border-2' : ''}`}>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-foreground">Free</h3>
              <div className="text-4xl font-bold text-foreground my-4">₦0</div>
              <p className="text-muted-foreground">Per month</p>
            </div>
            <ul className="space-y-3 mb-6">
              {features.free.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            {currentPlan === 'free' ? (
              <Button variant="outline" className="w-full" disabled>Current Plan</Button>
            ) : (
              <Button variant="outline" className="w-full" onClick={handleDowngrade}>Downgrade</Button>
            )}
          </Card>

          {/* Pro Plan */}
          <Card className={`p-6 ${currentPlan === 'pro' ? 'border-accent border-2' : ''}`}>
            <div className="text-center mb-6">
              <div className="inline-block px-3 py-1 bg-accent text-accent-foreground rounded-full text-xs font-semibold mb-2">
                RECOMMENDED
              </div>
              <h3 className="text-2xl font-bold text-foreground">Pro</h3>
              <div className="text-4xl font-bold text-foreground my-4">₦3,000</div>
              <p className="text-muted-foreground">Per month</p>
              <p className="text-sm text-muted-foreground mt-2">or ₦20,000/year (save 44%)</p>
            </div>
            <ul className="space-y-3 mb-6">
              {features.pro.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            {currentPlan === 'pro' ? (
              <Button className="w-full" disabled>Current Plan</Button>
            ) : (
              <Button className="w-full" onClick={handleUpgrade}>Upgrade to Pro</Button>
            )}
          </Card>
        </div>

        {currentPlan === 'pro' && (
          <Card className="p-6 mt-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Billing Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Plan:</span>
                <span className="text-foreground font-medium">Pro (Monthly)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Billing Date:</span>
                <span className="text-foreground font-medium">January 1, 2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="text-foreground font-medium">₦3,000</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Subscription;
