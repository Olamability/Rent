import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Home, CreditCard, Wrench, FileText, Settings, Search, User, Download, FileSignature
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DocumentViewerDialog } from "@/components/tenant/DocumentViewerDialog";
import { useAuth } from "@/contexts/AuthContext";
import { tenantNavLinks } from "@/config/navigation";
import { formatCurrency } from "@/lib/utils";
import { fetchActiveTenancyAgreement, fetchPendingAgreementForTenant, type TenancyAgreement } from "@/services/agreementService";
import { 
  signAgreementSecure, 
  getAgreementSigningStatus 
} from "@/services/agreementServiceSecure";

const Agreements = () => {
  const { user } = useAuth();
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const [agreement, setAgreement] = useState<TenancyAgreement | null>(null);
  const [signingStatus, setSigningStatus] = useState<{
    tenantSigned: boolean;
    landlordSigned: boolean;
    tenantSignatureTimestamp?: string;
    landlordSignatureTimestamp?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active agreement and signing status
  useEffect(() => {
    let isMounted = true;

    const loadAgreement = async () => {
      if (!user?.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        setError(null);
        setLoading(true);
        
        // First try to fetch pending agreement (draft/sent status)
        // This is for agreements that need tenant review and acceptance
        let data = await fetchPendingAgreementForTenant(user.id);
        
        // If no pending agreement, try to fetch active agreement
        if (!data) {
          data = await fetchActiveTenancyAgreement(user.id);
        }
        
        if (isMounted) {
          setAgreement(data);
          
          // If agreement exists, fetch signing status
          if (data?.id) {
            const status = await getAgreementSigningStatus(data.id);
            if (isMounted && status.success) {
              setSigningStatus({
                tenantSigned: status.tenantSigned,
                landlordSigned: status.landlordSigned,
                tenantSignatureTimestamp: status.tenantSignatureTimestamp,
                landlordSignatureTimestamp: status.landlordSignatureTimestamp,
              });
            }
          }
        }
      } catch (err) {
        console.error('Error loading agreement:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          code: (err as any)?.code,
          details: (err as any)?.details,
          hint: (err as any)?.hint
        });
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          if (errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
            setError('You do not have permission to view agreements. Please contact support.');
          } else if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
            setError('The agreement database has not been set up. Please contact your administrator.');
          } else {
            setError(`Failed to load agreement: ${errorMessage}`);
          }
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
  }, [user?.id]);

  // Handle agreement signing
  const handleSignAgreement = async () => {
    if (!agreement?.id) return;

    setSigning(true);
    try {
      const result = await signAgreementSecure(agreement.id);
      
      if (result.success) {
        toast.success(result.message || 'Agreement signed successfully!');
        
        // Refresh signing status
        const status = await getAgreementSigningStatus(agreement.id);
        if (status.success) {
          setSigningStatus({
            tenantSigned: status.tenantSigned,
            landlordSigned: status.landlordSigned,
            tenantSignatureTimestamp: status.tenantSignatureTimestamp,
            landlordSignatureTimestamp: status.landlordSignatureTimestamp,
          });
        }
        
        // Reload agreement if both parties signed
        if (result.data?.bothPartiesSigned) {
          const updatedAgreement = await fetchActiveTenancyAgreement(user?.id || '');
          setAgreement(updatedAgreement);
        }
      } else {
        toast.error(result.error || 'Failed to sign agreement');
      }
    } catch (err) {
      console.error('Error signing agreement:', err);
      toast.error('Failed to sign agreement. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  return (
    <DashboardLayout
      navLinks={tenantNavLinks}
      userName={user?.name || "User"}
      pageTitle="Tenancy Agreements"
      pageDescription="View and manage your lease agreements"
    >
      <DocumentViewerDialog
        open={isDocumentViewerOpen}
        onOpenChange={setIsDocumentViewerOpen}
        agreement={agreement}
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

      {!loading && !error && agreement && (
        <Card className="p-8 max-w-4xl mx-auto">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Current Lease Agreement</h2>
              <p className="text-muted-foreground">
                {agreement.property?.name || 'Property'} - Unit {agreement.unit?.unitNumber || 'N/A'}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              agreement.status === 'active' || agreement.status === 'signed' ? 'bg-success/10 text-success' :
              agreement.status === 'sent' || agreement.status === 'generated' ? 'bg-info/10 text-info' :
              agreement.status === 'expired' ? 'bg-warning/10 text-warning' :
              'bg-secondary text-secondary-foreground'
            }`}>
              {agreement.status}
            </span>
          </div>

          {/* Signing Status */}
          {signingStatus && (
            <div className="mb-6 p-4 bg-secondary/30 rounded-lg">
              <h3 className="font-semibold text-foreground mb-3">Signature Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  {signingStatus.tenantSigned ? (
                    <Badge className="bg-success text-success-foreground">✓ Tenant Signed</Badge>
                  ) : (
                    <Badge variant="outline">Tenant Pending</Badge>
                  )}
                  {signingStatus.tenantSignatureTimestamp && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(signingStatus.tenantSignatureTimestamp).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {signingStatus.landlordSigned ? (
                    <Badge className="bg-success text-success-foreground">✓ Landlord Signed</Badge>
                  ) : (
                    <Badge variant="outline">Landlord Pending</Badge>
                  )}
                  {signingStatus.landlordSignatureTimestamp && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(signingStatus.landlordSignatureTimestamp).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Start Date</div>
              <div className="text-lg font-semibold text-foreground">
                {new Date(agreement.startDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">End Date</div>
              <div className="text-lg font-semibold text-foreground">
                {new Date(agreement.endDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Annual Rent</div>
              <div className="text-lg font-semibold text-foreground">{formatCurrency(agreement.rentAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Security Deposit</div>
              <div className="text-lg font-semibold text-foreground">{formatCurrency(agreement.depositAmount)}</div>
            </div>
          </div>

          {agreement.terms && (
            <div className="border-t border-border pt-6 mb-6">
              <h3 className="font-semibold text-foreground mb-4">Lease Terms</h3>
              <div className="text-foreground whitespace-pre-wrap">{agreement.terms}</div>
            </div>
          )}

          {!agreement.terms && (
            <div className="border-t border-border pt-6 mb-6">
              <h3 className="font-semibold text-foreground mb-4">Lease Terms</h3>
              <ul className="space-y-2 text-foreground">
                <li>• Rent due on 1st of each month</li>
                <li>• Late fee of $50 after 5 days</li>
                <li>• No smoking inside the unit</li>
                <li>• 30 days notice required for move-out</li>
                <li>• Pets allowed with additional deposit</li>
              </ul>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {/* Show sign button if tenant hasn't signed yet */}
            {signingStatus && !signingStatus.tenantSigned && (
              <Button 
                className="flex-1 bg-accent hover:bg-accent/90"
                onClick={handleSignAgreement}
                disabled={signing}
              >
                <FileSignature className="w-4 h-4 mr-2" />
                {signing ? 'Signing...' : 'Sign Agreement'}
              </Button>
            )}
            
            <Button 
              className={signingStatus && !signingStatus.tenantSigned ? '' : 'flex-1'}
              onClick={() => {
                if (agreement.documentUrl) {
                  window.open(agreement.documentUrl, '_blank');
                } else {
                  toast.success("Agreement downloaded successfully!");
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Agreement
            </Button>
            <Button 
              variant="outline" 
              className={signingStatus && !signingStatus.tenantSigned ? '' : 'flex-1'}
              onClick={() => setIsDocumentViewerOpen(true)}
            >
              View Full Document
            </Button>
          </div>
        </Card>
      )}

      {!loading && !error && !agreement && (
        <Card className="p-8 max-w-4xl mx-auto">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Active Agreement</h2>
            <p className="text-muted-foreground mb-6">
              You don't have an active tenancy agreement at the moment.
            </p>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default Agreements;
