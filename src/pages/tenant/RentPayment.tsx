/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Home, CreditCard, Wrench, FileText, Settings, Search, User, Calendar, CheckCircle2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PaymentDialog } from "@/components/tenant/PaymentDialog";
import { AddPaymentMethodDialog } from "@/components/tenant/AddPaymentMethodDialog";
import { useAuth } from "@/contexts/AuthContext";
import { tenantNavLinks } from "@/config/navigation";
import { fetchPaymentHistory, fetchUpcomingPayment, type PaymentHistory } from "@/services/paymentService";
import { fetchActiveTenancyAgreement } from "@/services/agreementService";
import { fetchApplicationsByTenant } from "@/services/applicationService";
import { fetchApplicationPayment } from "@/services/tenancyFlowService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const RentPayment = () => {
  const { user } = useAuth();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isAddPaymentMethodDialogOpen, setIsAddPaymentMethodDialogOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [upcomingPayment, setUpcomingPayment] = useState<any>(null);
  const [propertyName, setPropertyName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingApplicationPayment, setPendingApplicationPayment] = useState<any>(null);

  // Fetch payment data
  useEffect(() => {
    let isMounted = true;

    const loadPaymentData = async () => {
      if (!user?.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        setError(null);
        setLoading(true);
        
        // Check for approved applications with pending payments
        const applications = await fetchApplicationsByTenant(user.id);
        const approvedApps = applications.filter(app => app.status === 'approved');
        
        // Check if there's a pending payment for approved application
        if (approvedApps.length > 0) {
          for (const app of approvedApps) {
            const payment = await fetchApplicationPayment(app.id);
            if (payment && payment.status === 'pending') {
              setPendingApplicationPayment({
                ...payment,
                propertyName: app.properties?.name,
                unitNumber: app.units?.unit_number,
                applicationId: app.id,
              });
              break; // Only show one at a time
            }
          }
        }
        
        // Fetch payment history
        const history = await fetchPaymentHistory(user.id);
        if (!isMounted) return;
        setPaymentHistory(history);

        // Fetch upcoming payment
        const upcoming = await fetchUpcomingPayment(user.id);
        if (!isMounted) return;
        setUpcomingPayment(upcoming);

        // Fetch active lease to get property name
        const lease = await fetchActiveTenancyAgreement(user.id);
        if (!isMounted) return;
        if (lease && lease.property && lease.unit) {
          setPropertyName(`${lease.property.name} - Unit ${lease.unit.unitNumber}`);
        }
      } catch (err) {
        console.error('Error loading payment data:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          code: (err as any)?.code,
          details: (err as any)?.details,
          hint: (err as any)?.hint
        });
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          if (errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
            setError('You do not have permission to view payment data. Please contact support.');
          } else if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
            setError('The payment database has not been set up. Please contact your administrator.');
          } else {
            setError(`Failed to load payment data: ${errorMessage}`);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPaymentData();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const currentRent = upcomingPayment ? {
    amount: upcomingPayment.amount,
    dueDate: new Date(upcomingPayment.dueDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }),
    status: 'upcoming',
    property: propertyName || 'Your Property',
  } : null;

  return (
    <DashboardLayout
      navLinks={tenantNavLinks}
      userName={user?.name || "User"}
      pageTitle="Rent Payment"
      pageDescription="Manage your rent payments"
    >
      <PaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        amount={pendingApplicationPayment?.amount || currentRent?.amount || 0}
        property={pendingApplicationPayment?.propertyName ? 
          `${pendingApplicationPayment.propertyName} - Unit ${pendingApplicationPayment.unitNumber}` : 
          currentRent?.property || ''}
        paymentId={pendingApplicationPayment?.id || upcomingPayment?.id}
        tenantId={user?.id || ''}
        landlordId={pendingApplicationPayment?.landlordId || upcomingPayment?.landlordId || ''}
        unitId={pendingApplicationPayment?.unitId || upcomingPayment?.unitId || ''}
        agreementId={pendingApplicationPayment?.applicationId}
        onPaymentSuccess={() => {
          // Reload payment data after successful payment
          if (user?.id) {
            fetchPaymentHistory(user.id).then(setPaymentHistory);
            fetchUpcomingPayment(user.id).then(setUpcomingPayment);
            setPendingApplicationPayment(null); // Clear pending payment
          }
        }}
      />

      <AddPaymentMethodDialog
        open={isAddPaymentMethodDialogOpen}
        onOpenChange={setIsAddPaymentMethodDialogOpen}
        onPaymentMethodAdded={() => {/* Payment method added */}}
      />
      
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      )}

      {error && !loading && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="max-w-4xl mx-auto">
          {/* Application Payment (Security Deposit + First Month Rent) - Priority Display */}
          {pendingApplicationPayment && (
            <Card className="p-8 mb-6 bg-gradient-to-r from-accent/10 to-accent/5 border-accent/50">
              <Alert className="mb-6 bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Action Required:</strong> Complete your application payment to proceed with your tenancy.
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <Badge className="mb-2">Application Payment</Badge>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Initial Payment Required</h2>
                  <p className="text-muted-foreground">
                    {pendingApplicationPayment.propertyName} - Unit {pendingApplicationPayment.unitNumber}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Includes: Security Deposit + First Month Rent
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-accent">
                    ${pendingApplicationPayment.amount.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Due: {new Date(pendingApplicationPayment.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  className="flex-1" 
                  onClick={() => setIsPaymentDialogOpen(true)}
                  size="lg"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay with Card
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setIsPaymentDialogOpen(true)}
                  size="lg"
                >
                  Pay with Transfer
                </Button>
              </div>
              
              <div className="mt-4 p-4 bg-background/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  ℹ️ After payment, your tenancy agreement will be automatically generated for signature.
                </p>
              </div>
            </Card>
          )}

          {/* Current Rent Due */}
          {currentRent && (
            <Card className="p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Current Rent Due</h2>
                  <p className="text-muted-foreground">{currentRent.property}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-foreground">${currentRent.amount}</div>
                  <div className="text-sm text-muted-foreground mt-1">Due: {currentRent.dueDate}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => setIsPaymentDialogOpen(true)}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay with Card
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsPaymentDialogOpen(true)}>
                  Pay with Transfer
                </Button>
                <Button variant="outline" onClick={() => setIsPaymentDialogOpen(true)}>Setup Autopay</Button>
              </div>
            </Card>
          )}

          {!currentRent && (
            <Card className="p-8 mb-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">No Upcoming Payments</h2>
                <p className="text-muted-foreground">You don't have any pending rent payments at the moment.</p>
              </div>
            </Card>
          )}

          {/* Payment Methods */}
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Payment Methods</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-foreground">Visa ending in 4242</div>
                    <div className="text-sm text-muted-foreground">Expires 12/25</div>
                  </div>
                </div>
                <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">Default</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => setIsAddPaymentMethodDialogOpen(true)}>Add Payment Method</Button>
          </Card>

          {/* Payment History */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Payment History</h3>
            {paymentHistory.length > 0 ? (
              <div className="space-y-4">
                {paymentHistory.map((payment, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        payment.status === 'Paid' ? 'bg-success/10' : 'bg-warning/10'
                      }`}>
                        <CheckCircle2 className={`w-5 h-5 ${
                          payment.status === 'Paid' ? 'text-success' : 'text-warning'
                        }`} />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{payment.month}</div>
                        <div className="text-sm text-muted-foreground">
                          {payment.status === 'Paid' ? 'Paid' : 'Due'} on {payment.date}
                          {payment.method && ` via ${payment.method}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">${payment.amount}</div>
                      {payment.receiptUrl && (
                        <Button variant="ghost" size="sm" className="mt-1">Download Receipt</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No payment history available</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default RentPayment;
