import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  FileText, 
  Home,
  AlertCircle,
  MapPin
} from "lucide-react";
import { Link } from "react-router-dom";
import { fetchApplicationsByTenant } from "@/services/applicationService";
import { fetchApplicationPayment } from "@/services/tenancyFlowService";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WithdrawApplicationDialog } from "@/components/tenant/WithdrawApplicationDialog";

const DEFAULT_PROPERTY_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&h=150&fit=crop';

interface ApplicationWithPayment {
  id: string;
  propertyName?: string;
  unitNumber?: string;
  propertyAddress?: string;
  propertyImage?: string;
  rentAmount?: number;
  depositAmount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'cancelled';
  moveInDate: Date;
  submittedAt: Date;
  payment?: {
    id: string;
    amount: number;
    status: 'pending' | 'paid' | 'failed';
    dueDate: string;
  };
  agreement?: {
    id: string;
    status: string;
  };
}

export const ApplicationStatusCard = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithPayment | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadApplications = async () => {
      try {
        setLoading(true);
        const apps = await fetchApplicationsByTenant(user.id);
        
        // Get only applications that need action (pending or approved with payment pending)
        const activeApps = apps.filter(app => 
          app.status === 'pending' || app.status === 'approved'
        );

        // Fetch payment status for approved applications
        const appsWithPayments = await Promise.all(
          activeApps.map(async (app) => {
            // Extract property details
            const propertyName = app.properties?.name || 'Unknown Property';
            const unitNumber = app.units?.unit_number || 'N/A';
            const propertyAddress = app.properties 
              ? `${app.properties.address || ''}, ${app.properties.city || ''}`.trim()
              : '';
            const propertyImage = (app.properties as any)?.images?.[0];
            const rentAmount = app.units?.rent_amount;
            const depositAmount = app.units?.deposit;
            
            if (app.status === 'approved') {
              try {
                const payment = await fetchApplicationPayment(app.id);
                return {
                  ...app,
                  propertyName,
                  unitNumber,
                  propertyAddress,
                  propertyImage,
                  rentAmount,
                  depositAmount,
                  payment: payment ? {
                    id: payment.id,
                    amount: payment.amount,
                    status: payment.status as 'pending' | 'paid' | 'failed',
                    dueDate: payment.dueDate,
                  } : undefined,
                };
              } catch (err) {
                console.error('Error fetching payment for application:', app.id, err);
                return {
                  ...app,
                  propertyName,
                  unitNumber,
                  propertyAddress,
                  propertyImage,
                  rentAmount,
                  depositAmount,
                };
              }
            }
            return {
              ...app,
              propertyName,
              unitNumber,
              propertyAddress,
              propertyImage,
              rentAmount,
              depositAmount,
            };
          })
        );

        setApplications(appsWithPayments);
        setError(null);
      } catch (err) {
        console.error('Error loading applications:', err);
        setError('Failed to load application status');
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, [user?.id]);

  const handleWithdrawSuccess = () => {
    // Reload applications after successful withdrawal
    if (user?.id) {
      fetchApplicationsByTenant(user.id).then(apps => {
        // Filter to only show active applications (pending or approved)
        // Withdrawn and rejected applications should not appear in the status card
        const activeApps = apps.filter(app => 
          app.status === 'pending' || app.status === 'approved'
        );
        
        // Fetch payment info for approved applications
        Promise.all(
          activeApps.map(async (app) => {
            // Extract property details
            const propertyName = app.properties?.name || 'Unknown Property';
            const unitNumber = app.units?.unit_number || 'N/A';
            const propertyAddress = app.properties 
              ? `${app.properties.address || ''}, ${app.properties.city || ''}`.trim()
              : '';
            const propertyImage = (app.properties as any)?.images?.[0];
            const rentAmount = app.units?.rent_amount;
            const depositAmount = app.units?.deposit;
            
            if (app.status === 'approved') {
              try {
                const payment = await fetchApplicationPayment(app.id);
                return {
                  ...app,
                  propertyName,
                  unitNumber,
                  propertyAddress,
                  propertyImage,
                  rentAmount,
                  depositAmount,
                  payment: payment ? {
                    id: payment.id,
                    amount: payment.amount,
                    status: payment.status as 'pending' | 'paid' | 'failed',
                    dueDate: payment.dueDate,
                  } : undefined,
                };
              } catch (err) {
                console.error('Error fetching payment for application:', app.id, err);
                return {
                  ...app,
                  propertyName,
                  unitNumber,
                  propertyAddress,
                  propertyImage,
                  rentAmount,
                  depositAmount,
                };
              }
            }
            return {
              ...app,
              propertyName,
              unitNumber,
              propertyAddress,
              propertyImage,
              rentAmount,
              depositAmount,
            };
          })
        ).then(appsWithPayments => {
          setApplications(appsWithPayments);
        });
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (applications.length === 0) {
    return null; // Don't show card if no active applications
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Under Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-500 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getNextStepMessage = (app: ApplicationWithPayment) => {
    if (app.status === 'pending') {
      return 'Your application is being reviewed by the landlord.';
    }
    
    if (app.status === 'approved') {
      if (!app.payment) {
        return 'Payment details are being prepared. Please check back shortly.';
      }
      
      if (app.payment.status === 'pending') {
        const depositText = app.depositAmount ? ` + ₦${app.depositAmount.toLocaleString()} deposit` : '';
        const rentText = app.rentAmount ? `₦${app.rentAmount.toLocaleString()}` : '$' + app.payment.amount.toLocaleString();
        return `Your application has been approved! Please complete your payment of ${rentText}${depositText} to proceed with your tenancy.`;
      }
      
      if (app.payment.status === 'paid') {
        return 'Your payment has been received! Your tenancy agreement is being prepared.';
      }
    }
    
    return '';
  };

  const getNextStepAction = (app: ApplicationWithPayment) => {
    if (app.status === 'approved' && app.payment?.status === 'pending') {
      return (
        <div className="flex gap-2 mt-3">
          <Button asChild variant="default">
            <Link to="/tenant/rent">
              <CreditCard className="w-4 h-4 mr-2" />
              Make Payment
            </Link>
          </Button>
          <Button 
            variant="outline"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => {
              setSelectedApplication(app);
              setIsWithdrawDialogOpen(true);
            }}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Withdraw
          </Button>
        </div>
      );
    }
    
    if (app.status === 'approved' && app.payment?.status === 'paid') {
      return (
        <Button asChild variant="outline" className="mt-3">
          <Link to="/tenant/agreements">
            <FileText className="w-4 h-4 mr-2" />
            View Agreement
          </Link>
        </Button>
      );
    }
    
    if (app.status === 'pending') {
      return (
        <Button 
          variant="outline"
          className="text-destructive hover:bg-destructive/10 mt-3"
          onClick={() => {
            setSelectedApplication(app);
            setIsWithdrawDialogOpen(true);
          }}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Withdraw Application
        </Button>
      );
    }
    
    return null;
  };

  return (
    <Card className="p-6 mb-6 bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-accent/20">
          <Home className="w-6 h-6 text-accent" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Application Status
          </h3>
          
          {applications.map((app) => (
            <div key={app.id} className="mb-4 last:mb-0">
              {/* Property Details with Image */}
              <div className="flex gap-4 mb-3">
                <img 
                  src={app.propertyImage || DEFAULT_PROPERTY_IMAGE} 
                  alt={app.propertyName || 'Property'}
                  className="w-24 h-20 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_PROPERTY_IMAGE;
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-base">
                        {app.propertyName || 'Property'} - Unit {app.unitNumber || 'N/A'}
                      </p>
                      {app.propertyAddress && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {app.propertyAddress}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Move-in date: {new Date(app.moveInDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-2">
                      {getStatusBadge(app.status)}
                    </div>
                  </div>
                </div>
              </div>
              
              <Alert className="mt-2">
                <AlertDescription>
                  {getNextStepMessage(app)}
                </AlertDescription>
              </Alert>
              
              {getNextStepAction(app)}
            </div>
          ))}
        </div>
      </div>

      {/* Withdraw Application Dialog */}
      {selectedApplication && (
        <WithdrawApplicationDialog
          open={isWithdrawDialogOpen}
          onOpenChange={setIsWithdrawDialogOpen}
          applicationId={selectedApplication.id}
          propertyName={selectedApplication.propertyName || 'Property'}
          unitNumber={selectedApplication.unitNumber || 'N/A'}
          onSuccess={handleWithdrawSuccess}
        />
      )}
    </Card>
  );
};
