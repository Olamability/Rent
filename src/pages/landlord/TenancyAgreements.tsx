/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Home, Building2, Users, CreditCard, Wrench, FileText, Settings,
  BarChart3, Crown, Bell as BellIcon, Download, FileSignature
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenerateAgreementDialog } from "@/components/landlord/GenerateAgreementDialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { fetchLandlordAgreements } from '@/services/agreementService';

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

const TenancyAgreements = () => {
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const { user, isLoading: userLoading } = useAuth();
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetchLandlordAgreements(user.id)
      .then((data) => setAgreements(data))
      .catch(() => setAgreements([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <DashboardLayout
      navLinks={navLinks}
      userName={userLoading ? '' : (user?.name || '')}
      pageTitle="Tenancy Agreements"
      pageDescription="Manage lease agreements and contracts"
      headerActions={
        <Button onClick={() => setIsGenerateDialogOpen(true)}>
          <FileSignature className="w-4 h-4 mr-2" />
          Generate Agreement
        </Button>
      }
    >
      <GenerateAgreementDialog
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        onAgreementGenerated={() => {/* Agreement generated */}}
      />
      
      <div className="bg-card rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="p-4 font-semibold text-foreground">Agreement ID</th>
                <th className="p-4 font-semibold text-foreground">Tenant</th>
                <th className="p-4 font-semibold text-foreground">Unit</th>
                <th className="p-4 font-semibold text-foreground">Start Date</th>
                <th className="p-4 font-semibold text-foreground">End Date</th>
                <th className="p-4 font-semibold text-foreground">Status</th>
                <th className="p-4 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-4 text-center">Loading...</td></tr>
              ) : agreements.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center">No agreements found.</td></tr>
              ) : agreements.map((agreement) => (
                <tr key={agreement.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/50">
                  <td className="p-4 text-foreground font-mono text-sm">{agreement.id}</td>
                  <td className="p-4 text-foreground">{agreement.tenant?.name || '-'}</td>
                  <td className="p-4 text-foreground">{agreement.unit?.unitNumber || '-'}</td>
                  <td className="p-4 text-foreground">{agreement.startDate || agreement.start_date || '-'}</td>
                  <td className="p-4 text-foreground">{agreement.endDate || agreement.end_date || '-'}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                      {agreement.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toast.success("Agreement downloaded successfully!")}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TenancyAgreements;
