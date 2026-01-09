import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, LogOut } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { terminateTenancyAgreement } from "@/services/agreementService";
import { toast } from "sonner";

// Constants
const DAYS_UNTIL_LEASE_END_WARNING = 30; // Days before lease end to show warning
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24; // Milliseconds in one day

interface EndTenancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreementId: string;
  propertyName: string;
  unitNumber: string;
  leaseEndDate: string;
  onSuccess?: () => void;
}

export const EndTenancyDialog = ({
  open,
  onOpenChange,
  agreementId,
  propertyName,
  unitNumber,
  leaseEndDate,
  onSuccess,
}: EndTenancyDialogProps) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleEndTenancy = async () => {
    if (!confirmed) {
      toast.error("Please confirm you want to end your tenancy");
      return;
    }

    try {
      setLoading(true);
      await terminateTenancyAgreement(agreementId, reason || "Tenant initiated checkout");
      
      toast.success("Your tenancy has been ended successfully");
      onOpenChange(false);
      
      // Reset state
      setReason("");
      setConfirmed(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error ending tenancy:", error);
      toast.error("Failed to end tenancy. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setReason("");
    setConfirmed(false);
    onOpenChange(false);
  };

  // Check if lease is ending soon (within DAYS_UNTIL_LEASE_END_WARNING days)
  const leaseEndingsSoon = () => {
    const endDate = new Date(leaseEndDate);
    const today = new Date();
    const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / MILLISECONDS_PER_DAY);
    return daysUntilEnd <= DAYS_UNTIL_LEASE_END_WARNING && daysUntilEnd >= 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5 text-destructive" />
            End Tenancy
          </DialogTitle>
          <DialogDescription>
            You are about to end your tenancy at {propertyName} - Unit {unitNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant={leaseEndingsSoon() ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {leaseEndingsSoon() 
                ? `Your lease ends on ${new Date(leaseEndDate).toLocaleDateString()}. You can checkout anytime.`
                : `Your lease ends on ${new Date(leaseEndDate).toLocaleDateString()}. Ending early may have consequences. Please review your lease agreement.`
              }
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for ending tenancy (optional)</Label>
            <Textarea
              id="reason"
              placeholder="E.g., Moving to a new city, found a new place, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex items-start space-x-2 rounded-lg border border-border p-3 bg-secondary/50">
            <input
              type="checkbox"
              id="confirm"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={loading}
              className="mt-1"
            />
            <label htmlFor="confirm" className="text-sm text-muted-foreground cursor-pointer">
              I understand that ending my tenancy will make the unit available for new tenants and I will need to vacate the property.
            </label>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg space-y-1">
            <p className="text-sm font-medium">What happens next:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Your tenancy agreement will be terminated</li>
              <li>The landlord will be notified</li>
              <li>The unit will become available for new tenants</li>
              <li>You should coordinate move-out details with your landlord</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleEndTenancy}
            disabled={loading || !confirmed}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Ending Tenancy...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                End Tenancy
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
