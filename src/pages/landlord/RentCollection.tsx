/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Home, Building2, Users, CreditCard, Wrench, FileText, Settings,
  BarChart3, Crown, Bell as BellIcon, CheckCircle2, Clock, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceiptViewer } from "@/components/shared/ReceiptViewer";
import { useAuth } from "@/contexts/AuthContext";
import { fetchLandlordPayments, getLandlordPaymentStatistics } from "@/services/paymentService";

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

const RentCollection = () => {
  const { user } = useAuth();
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptViewerOpen, setIsReceiptViewerOpen] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState([
    { label: 'Collected This Month', value: '$0', icon: CheckCircle2, color: 'text-success' },
    { label: 'Pending', value: '$0', icon: Clock, color: 'text-warning' },
    { label: 'Overdue', value: '$0', icon: AlertCircle, color: 'text-destructive' },
  ]);
  const [loading, setLoading] = useState(true);
  
  // Fetch rent collection data on mount
  useEffect(() => {
    let isMounted = true;

    const loadRentCollectionData = async () => {
      if (!user?.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }
      
      try {
        setLoading(true);
        const [paymentsData, statsData] = await Promise.all([
          fetchLandlordPayments(user.id),
          getLandlordPaymentStatistics(user.id)
        ]);
        
        if (isMounted) {
          // Transform payments data
          const transformedPayments = paymentsData.map((payment: unknown) => {
            const tenancyAgreements = payment.tenancy_agreements as { units?: { unit_number?: string } } | null;
            const users = payment.users as { name?: string } | null;
            
            return {
              id: payment.id,
              tenant: users?.name || 'Unknown Tenant',
              unit: tenancyAgreements?.units?.unit_number ? `Unit ${tenancyAgreements.units.unit_number}` : 'N/A',
              property: 'Property Name', // Would need to fetch from properties table
              amount: payment.amount,
              due: new Date(payment.due_date).toISOString().split('T')[0],
              status: payment.status,
              paidAt: payment.paid_at ? new Date(payment.paid_at).toISOString().split('T')[0] : undefined,
              paymentMethod: payment.payment_method,
              transactionId: payment.transaction_id,
            };
          });
          
          setPayments(transformedPayments);
          
          // Update stats
          setStats([
            { label: 'Collected This Month', value: `$${statsData.collectedThisMonth.toLocaleString()}`, icon: CheckCircle2, color: 'text-success' },
            { label: 'Pending', value: `$${statsData.pending.toLocaleString()}`, icon: Clock, color: 'text-warning' },
            { label: 'Overdue', value: `$${statsData.overdue.toLocaleString()}`, icon: AlertCircle, color: 'text-destructive' },
          ]);
        }
      } catch (err) {
        console.error('Failed to load rent collection data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadRentCollectionData();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return (
    <DashboardLayout
      navLinks={navLinks}
      userName={user?.name || "User"}
      pageTitle="Rent Collection"
      pageDescription="Track and manage rent payments"
    >
      {selectedReceipt && (
        <ReceiptViewer
          open={isReceiptViewerOpen}
          onOpenChange={setIsReceiptViewerOpen}
          receipt={selectedReceipt}
        />
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg bg-secondary flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Payment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="p-4 font-semibold text-foreground">Tenant</th>
                <th className="p-4 font-semibold text-foreground">Unit</th>
                <th className="p-4 font-semibold text-foreground">Amount</th>
                <th className="p-4 font-semibold text-foreground">Due Date</th>
                <th className="p-4 font-semibold text-foreground">Status</th>
                <th className="p-4 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                    </div>
                  </td>
                </tr>
              ) : payments.length > 0 ? (
                payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/50">
                    <td className="p-4 text-foreground">{payment.tenant}</td>
                    <td className="p-4 text-foreground">{payment.unit}</td>
                    <td className="p-4 text-foreground font-semibold">${payment.amount}</td>
                    <td className="p-4 text-foreground">{payment.due}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'paid' ? 'bg-success/10 text-success' : 
                        payment.status === 'pending' ? 'bg-warning/10 text-warning' : 
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (payment.status === 'paid') {
                            setSelectedReceipt({
                              id: `REC-${payment.id}`,
                              date: payment.paidAt || payment.due,
                              tenant: payment.tenant,
                              property: payment.property || 'Sunset Apartments',
                              unit: payment.unit,
                              amount: payment.amount,
                              paymentMethod: payment.paymentMethod || 'Card',
                              transactionId: payment.transactionId || 'N/A',
                            });
                            setIsReceiptViewerOpen(true);
                          }
                        }}
                      >
                        {payment.status === 'paid' ? 'View Receipt' : 'Send Reminder'}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No payments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RentCollection;
