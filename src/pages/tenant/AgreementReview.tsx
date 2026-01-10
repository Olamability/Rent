import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  FileText, 
  Home, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  Download,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { tenantNavLinks } from "@/config/navigation";
import { formatCurrency } from "@/lib/utils";
import { 
  getAgreementForReview, 
  acceptAgreementAsTenant,
  type TenancyAgreement 
} from "@/services/agreementService";

const AgreementReview = () => {
  const { agreementId } = useParams<{ agreementId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [agreement, setAgreement] = useState<TenancyAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Load agreement data
  useEffect(() => {
    let isMounted = true;

    const loadAgreement = async () => {
      if (!user?.id || !agreementId) {
        if (isMounted) {
          setLoading(false);
          setError('Missing required information');
        }
        return;
      }

      try {
        setError(null);
        setLoading(true);
        const data = await getAgreementForReview(agreementId, user.id);
        if (isMounted) {
          if (!data) {
            setError('Agreement not found or you do not have permission to view it');
          } else {
            setAgreement(data);
          }
        }
      } catch (err) {
        console.error('Error loading agreement:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load agreement');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAgreement();

    return () => {
      isMounted = false;
    };
  }, [user?.id, agreementId]);

  // Handle agreement acceptance
  const handleAcceptAgreement = async () => {
    if (!agreement?.id || !user?.id) return;

    if (!termsAccepted) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    try {
      setAccepting(true);
      await acceptAgreementAsTenant(agreement.id, user.id);
      
      toast.success('Agreement Accepted!', {
        description: 'You can now proceed with payment to complete your tenancy.',
      });

      // Navigate to payment page after short delay
      setTimeout(() => {
        navigate('/tenant/rent');
      }, 1500);
    } catch (err) {
      console.error('Error accepting agreement:', err);
      toast.error('Failed to accept agreement', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setAccepting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout pageTitle="Review Agreement" navLinks={tenantNavLinks}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading agreement...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error || !agreement) {
    return (
      <DashboardLayout pageTitle="Review Agreement" navLinks={tenantNavLinks}>
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Loading Agreement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error || 'Agreement not found'}</p>
            <Button variant="outline" onClick={() => navigate('/tenant/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Format dates
  const startDate = new Date(agreement.startDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const endDate = new Date(agreement.endDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  // Calculate lease duration
  const durationMonths = Math.round(
    (new Date(agreement.endDate).getTime() - new Date(agreement.startDate).getTime()) / 
    (1000 * 60 * 60 * 24 * 30)
  );

  return (
    <DashboardLayout pageTitle="Review Lease Agreement" navLinks={tenantNavLinks}>
      <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto pb-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/tenant/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Header Alert */}
        <Alert className="border-primary bg-primary/5">
          <FileText className="h-4 w-4" />
          <AlertDescription className="text-sm md:text-base">
            <strong>Important:</strong> Please review your lease agreement carefully. 
            Once accepted, you can proceed with payment to complete your tenancy.
          </AlertDescription>
        </Alert>

        {/* Property Information Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Home className="h-5 w-5 md:h-6 md:w-6" />
              Property Details
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              {agreement.property?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Property Image - Responsive */}
            {agreement.property?.images && agreement.property.images.length > 0 && (
              <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden">
                <img 
                  src={agreement.property.images[0]} 
                  alt={agreement.property.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Property Info Grid - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm md:text-base">
              <div>
                <p className="text-muted-foreground text-xs md:text-sm">Address</p>
                <p className="font-medium">
                  {agreement.property?.address}, {agreement.property?.city}, {agreement.property?.state}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs md:text-sm">Unit Number</p>
                <p className="font-medium">{agreement.unit?.unitNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6" />
              Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2 p-4 bg-secondary/30 rounded-lg">
                <p className="text-xs md:text-sm text-muted-foreground">Monthly Rent</p>
                <p className="text-2xl md:text-3xl font-bold text-primary">
                  {formatCurrency(agreement.rentAmount)}
                </p>
              </div>
              <div className="space-y-2 p-4 bg-secondary/30 rounded-lg">
                <p className="text-xs md:text-sm text-muted-foreground">Security Deposit</p>
                <p className="text-2xl md:text-3xl font-bold">
                  {formatCurrency(agreement.depositAmount)}
                </p>
              </div>
              <div className="sm:col-span-2 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Initial Payment</p>
                <p className="text-2xl md:text-3xl font-bold text-primary">
                  {formatCurrency(agreement.rentAmount + agreement.depositAmount)}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mt-2">
                  First month's rent + Security deposit
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lease Period Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5 md:h-6 md:w-6" />
              Lease Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <p className="text-xs md:text-sm text-muted-foreground">Start Date</p>
                <p className="text-base md:text-lg font-medium">{startDate}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs md:text-sm text-muted-foreground">End Date</p>
                <p className="text-base md:text-lg font-medium">{endDate}</p>
              </div>
              <div className="sm:col-span-2 p-4 bg-secondary/30 rounded-lg">
                <p className="text-xs md:text-sm text-muted-foreground">Lease Duration</p>
                <p className="text-base md:text-lg font-medium">
                  {durationMonths} {durationMonths === 1 ? 'month' : 'months'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms and Conditions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 md:h-6 md:w-6" />
              Terms and Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm md:prose-base max-w-none">
              <p className="text-sm md:text-base text-muted-foreground">
                {agreement.terms || 'Standard residential lease agreement'}
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-3 p-4 bg-secondary/30 rounded-lg text-xs md:text-sm">
              <h4 className="font-semibold text-sm md:text-base">Key Terms:</h4>
              <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                <li>Monthly rent payment due on the 1st of each month</li>
                <li>Security deposit refundable upon lease end (subject to property condition)</li>
                <li>Tenant responsible for utilities as specified in agreement</li>
                <li>30 days notice required for lease termination</li>
                <li>Property to be maintained in good condition</li>
              </ul>
            </div>

            {agreement.documentUrl && (
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => window.open(agreement.documentUrl, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Full Agreement (PDF)
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Landlord Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Landlord Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm md:text-base">
              <div>
                <p className="text-muted-foreground text-xs md:text-sm">Name</p>
                <p className="font-medium">{agreement.landlord?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs md:text-sm">Email</p>
                <p className="font-medium break-all">{agreement.landlord?.email}</p>
              </div>
              {agreement.landlord?.phone && (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground text-xs md:text-sm">Phone</p>
                  <p className="font-medium">{agreement.landlord.phone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Acceptance Section */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg md:text-xl">Accept Agreement</CardTitle>
            <CardDescription className="text-sm md:text-base">
              Review and accept the terms to proceed with payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Terms Checkbox */}
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Checkbox 
                id="terms" 
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className="mt-1"
              />
              <label 
                htmlFor="terms" 
                className="text-sm md:text-base leading-relaxed cursor-pointer flex-1"
              >
                I have read and agree to the terms and conditions of this lease agreement. 
                I understand that by accepting this agreement, I am entering into a legally 
                binding contract and will be responsible for the payment of rent and 
                maintaining the property as outlined in the agreement.
              </label>
            </div>

            {/* Action Buttons - Responsive */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/tenant/dashboard')}
                className="w-full sm:w-auto sm:flex-1"
                disabled={accepting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAcceptAgreement}
                disabled={!termsAccepted || accepting}
                className="w-full sm:w-auto sm:flex-1 bg-primary hover:bg-primary/90"
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept Agreement & Continue to Payment
                  </>
                )}
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs md:text-sm">
                After accepting, you will be redirected to the payment page to complete 
                your initial payment of {formatCurrency(agreement.rentAmount + agreement.depositAmount)}.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AgreementReview;
