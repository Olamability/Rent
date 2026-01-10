import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { TenancyAgreement } from "@/services/agreementService";

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreement: TenancyAgreement | null;
}

export const DocumentViewerDialog = ({ open, onOpenChange, agreement }: DocumentViewerDialogProps) => {
  if (!agreement) return null;

  const handleDownload = () => {
    toast.success("Agreement downloaded successfully!");
  };

  // Helper function to format property address
  const formatPropertyAddress = () => {
    if (agreement.property?.address) {
      const parts = [
        agreement.property.address,
        agreement.property.city,
        agreement.property.state
      ].filter(Boolean); // Remove empty/undefined values
      return parts.join(', ');
    }
    return agreement.property?.name || 'Property Address';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Tenancy Agreement - Full Document
          </DialogTitle>
          <DialogDescription>
            {agreement.property?.name || 'Property'} | Agreement ID: {agreement.id}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Document Header */}
          <div className="bg-secondary/30 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-foreground mb-2">Residential Lease Agreement</h2>
            <p className="text-muted-foreground">This agreement is made and entered into on {agreement.startDate}</p>
          </div>

          <Separator />

          {/* Parties Section */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-3">1. Parties</h3>
            <div className="space-y-2 text-foreground">
              <p><strong>Landlord:</strong> {agreement.landlord?.name || 'RentFlow Property Management LLC'}</p>
              <p><strong>Tenant:</strong> {agreement.tenant?.name || 'Tenant'}</p>
              <p><strong>Property Address:</strong> {formatPropertyAddress()}</p>
            </div>
          </section>

          <Separator />

          {/* Lease Terms Section */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-3">2. Lease Terms</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium text-foreground">{agreement.startDate}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium text-foreground">{agreement.endDate}</p>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Financial Terms Section */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-3">3. Financial Terms</h3>
            <div className="space-y-3 text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Rent:</span>
                <span className="font-semibold">${agreement.rentAmount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Security Deposit:</span>
                <span className="font-semibold">${agreement.depositAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Due Date:</span>
                <span className="font-semibold">1st of each month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Late Fee:</span>
                <span className="font-semibold">$50 after 5 days</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Rules and Regulations Section */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-3">4. Rules and Regulations</h3>
            <ul className="space-y-2 text-foreground list-disc list-inside">
              <li>No smoking inside the unit</li>
              <li>Quiet hours: 10:00 PM to 8:00 AM</li>
              <li>Pets allowed with additional deposit of $500</li>
              <li>Tenant responsible for minor repairs under $100</li>
              <li>No subletting without written consent from landlord</li>
              <li>Tenant must maintain renter's insurance</li>
            </ul>
          </section>

          <Separator />

          {/* Maintenance and Repairs Section */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-3">5. Maintenance and Repairs</h3>
            <p className="text-foreground mb-2">
              The landlord shall be responsible for maintaining the structural integrity of the property 
              and all major systems (HVAC, plumbing, electrical). The tenant agrees to:
            </p>
            <ul className="space-y-2 text-foreground list-disc list-inside ml-4">
              <li>Report any maintenance issues promptly</li>
              <li>Keep the property clean and sanitary</li>
              <li>Replace light bulbs and batteries in smoke detectors</li>
              <li>Prevent damage from negligence or misuse</li>
            </ul>
          </section>

          <Separator />

          {/* Termination Section */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-3">6. Termination</h3>
            <p className="text-foreground">
              Either party may terminate this agreement with 30 days written notice. The tenant must 
              leave the property in good condition, normal wear and tear excepted. The security deposit 
              will be returned within 30 days after move-out, minus any deductions for damages or unpaid rent.
            </p>
          </section>

          <Separator />

          {/* Signatures Section */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-3">7. Signatures</h3>
            <div className="grid md:grid-cols-2 gap-6 mt-4">
              <div className="border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">Landlord Signature</p>
                <div className="h-20 flex items-center">
                  <p className="font-signature text-2xl text-foreground">{agreement.landlord?.name || 'RentFlow Management'}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Date: {agreement.signedAt || agreement.startDate}</p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">Tenant Signature</p>
                <div className="h-20 flex items-center">
                  <p className="font-signature text-2xl text-foreground">{agreement.tenant?.name || 'Tenant'}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Date: {agreement.signedAt || agreement.startDate}</p>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
