import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  MessageSquare,
  Calendar,
  Download,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { tenantNavLinks } from "@/config/navigation";
import { FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { fetchTenantDashboardData, type TenantDashboardData } from "@/services/tenantDashboardService";
import { fetchLatestAlert, type Notification } from "@/services/notificationService";
import { ApplicationStatusCard } from "@/components/tenant/ApplicationStatusCard";
import { EndTenancyDialog } from "@/components/tenant/EndTenancyDialog";
import { fetchActiveTenancyAgreement } from "@/services/agreementService";

const TenantDashboard = () => {
  const { user, getProfileCompleteness } = useAuth();
  // Calculate completeness dynamically based on current user state
  const completeness = user ? getProfileCompleteness() : 0;
  const [dashboardData, setDashboardData] = useState<TenantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestAlert, setLatestAlert] = useState<Notification | null>(null);
  const [isEndTenancyOpen, setIsEndTenancyOpen] = useState(false);
  const [agreementId, setAgreementId] = useState<string | null>(null);

  // Fetch dashboard data on mount
  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      if (!user?.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }
      
      try {
        setError(null);
        setLoading(true);
        const [data, alert, agreement] = await Promise.all([
          fetchTenantDashboardData(user.id),
          fetchLatestAlert(user.id),
          fetchActiveTenancyAgreement(user.id)
        ]);
        if (isMounted) {
          setDashboardData(data);
          setLatestAlert(alert);
          setAgreementId(agreement?.id || null);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        if (isMounted) {
          setError('Failed to load dashboard data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const paymentHistory = dashboardData?.payments || [];
  const maintenanceRequests = dashboardData?.maintenanceRequests || [];
  const documents = dashboardData?.documents || [];
  const applications = dashboardData?.applications || [];
  const currentLease = dashboardData?.currentLease;

  return (
    <DashboardLayout
      navLinks={tenantNavLinks}
      userName={user?.name || "User"}
      pageTitle="Tenant Portal"
      pageDescription={`Welcome back, ${user?.name?.split(' ')[0] || 'User'}`}
    >
          {/* Profile Completion Banner */}
          <ProfileCompletionBanner
            completeness={completeness}
            profileUrl="/tenant/profile"
            className="mb-6"
          />

          {/* Application Status Card - Shows pending applications and payment requirements */}
          <ApplicationStatusCard />

          {/* Lease Overview Card */}
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            ) : currentLease ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <img 
                    src={currentLease.propertyImage || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&h=150&fit=crop"}
                    alt="Property"
                    className="w-24 h-20 rounded-lg object-cover"
                  />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{currentLease.propertyName} - {currentLease.unitNumber}</h2>
                    <p className="text-muted-foreground">{currentLease.propertyAddress}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Lease ends: {new Date(currentLease.leaseEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-foreground">{formatCurrency(currentLease.rentAmount)}</div>
                  <div className="text-muted-foreground">/annum</div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="accent" asChild>
                      <Link to="/tenant/rent">Pay Rent</Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEndTenancyOpen(true)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      End Tenancy
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">No active lease found</p>
                {applications.length > 0 ? (
                  <p className="text-sm text-muted-foreground mb-4">
                    You have {applications.length} pending application{applications.length > 1 ? 's' : ''}. 
                    Check the Application Status card above for details.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">
                    Browse available properties to find your perfect home
                  </p>
                )}
                <Button variant="outline" asChild>
                  <Link to="/tenant/search">Browse Properties</Link>
                </Button>
              </div>
            )}
          </div>

          {/* End Tenancy Dialog */}
          {currentLease && agreementId && (
            <EndTenancyDialog
              open={isEndTenancyOpen}
              onOpenChange={setIsEndTenancyOpen}
              agreementId={agreementId}
              propertyName={currentLease.propertyName}
              unitNumber={currentLease.unitNumber}
              leaseEndDate={currentLease.leaseEndDate}
              onSuccess={() => {
                // Reload dashboard data after successful termination
                if (user?.id) {
                  fetchTenantDashboardData(user.id).then(data => {
                    setDashboardData(data);
                  });
                }
              }}
            />
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Payment History */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Payment History</h2>
              </div>
              <div className="p-6">
                {paymentHistory.length > 0 ? (
                  <div className="space-y-4">
                    {paymentHistory.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                        <div>
                          <div className="font-medium text-foreground">{payment.month}</div>
                          <div className="text-sm text-muted-foreground">Due: {payment.date}</div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div className="font-semibold text-foreground">{payment.amount}</div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                            payment.status === 'Paid' 
                              ? 'bg-success/10 text-success' 
                              : payment.status === 'Upcoming'
                              ? 'bg-info/10 text-info'
                              : 'bg-warning/10 text-warning'
                          }`}>
                            {payment.status === 'Paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No payment history available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              {/* Maintenance Requests */}
              <div className="bg-card rounded-xl border border-border">
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Maintenance</h2>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/tenant/maintenance">
                      <Plus className="w-4 h-4 mr-1" />
                      New Request
                    </Link>
                  </Button>
                </div>
                <div className="p-4">
                  {maintenanceRequests.length > 0 ? (
                    <div className="space-y-3">
                      {maintenanceRequests.map((request) => (
                        <div key={request.id} className="p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-start justify-between mb-1">
                            <span className="text-xs text-muted-foreground">{request.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              request.status === 'Completed' 
                                ? 'bg-success/10 text-success' 
                                : 'bg-info/10 text-info'
                            }`}>
                              {request.status}
                            </span>
                          </div>
                          <div className="font-medium text-foreground text-sm">{request.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">{request.date}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No maintenance requests</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="bg-card rounded-xl border border-border">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">Documents</h2>
                </div>
                <div className="p-4">
                  {documents.length > 0 ? (
                    <div className="space-y-2">
                      {documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground text-sm">{doc.name}</div>
                              <div className="text-xs text-muted-foreground">{doc.size}</div>
                            </div>
                          </div>
                          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No documents available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Applications Status - Show All Applications */}
              <div className="bg-card rounded-xl border border-border">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">My Applications</h2>
                  <p className="text-sm text-muted-foreground mt-1">Track all your property applications</p>
                </div>
                <div className="p-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                    </div>
                  ) : applications.length > 0 ? (
                    <div className="space-y-3">
                      {applications.map((app) => (
                        <Link 
                          key={app.id} 
                          to="/tenant/rent"
                          className="block p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium text-foreground text-sm">{app.propertyName}</div>
                              <div className="text-xs text-muted-foreground">Unit {app.unitNumber}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              app.status === 'approved' 
                                ? 'bg-success/10 text-success' 
                                : app.status === 'rejected'
                                ? 'bg-destructive/10 text-destructive'
                                : app.status === 'withdrawn'
                                ? 'bg-muted/50 text-muted-foreground'
                                : 'bg-warning/10 text-warning'
                            }`}>
                              {app.status === 'approved' ? 'Approved - Pay Now' : app.status}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Submitted: {app.submittedAt}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Move-in: {app.moveInDate}
                          </div>
                          {app.status === 'approved' && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <p className="text-xs text-accent font-medium flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                Click to view invoice and make payment
                              </p>
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground mb-2">No applications yet</p>
                      <p className="text-xs text-muted-foreground">Your application history will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {latestAlert && (
            <div className={`mt-6 p-4 rounded-xl flex items-start gap-4 ${
              latestAlert.type === 'warning' ? 'bg-warning/5 border border-warning/20' :
              latestAlert.type === 'error' ? 'bg-destructive/5 border border-destructive/20' :
              'bg-info/5 border border-info/20'
            }`}>
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                latestAlert.type === 'warning' ? 'text-warning' :
                latestAlert.type === 'error' ? 'text-destructive' :
                'text-info'
              }`} />
              <div>
                <div className="font-medium text-foreground">{latestAlert.title}</div>
                <p className="text-sm text-muted-foreground">{latestAlert.message}</p>
                {latestAlert.actionUrl && (
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link to={latestAlert.actionUrl}>View Details</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
    </DashboardLayout>
  );
};

export default TenantDashboard;
