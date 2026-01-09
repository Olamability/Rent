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
import { AlertCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { withdrawApplication } from "@/services/applicationService";
import { toast } from "sonner";

interface WithdrawApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  propertyName: string;
  unitNumber: string;
  onSuccess?: () => void;
}

export const WithdrawApplicationDialog = ({
  open,
  onOpenChange,
  applicationId,
  propertyName,
  unitNumber,
  onSuccess,
}: WithdrawApplicationDialogProps) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleWithdraw = async () => {
    if (!confirmed) {
      toast.error("Please confirm you want to withdraw your application");
      return;
    }

    try {
      setLoading(true);
      await withdrawApplication(applicationId, reason || "No reason provided");
      
      toast.success("Your application has been withdrawn successfully");
      onOpenChange(false);
      
      // Reset state
      setReason("");
      setConfirmed(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error withdrawing application:", error);
      toast.error("Failed to withdraw application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setReason("");
    setConfirmed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            Withdraw Application
          </DialogTitle>
          <DialogDescription>
            You are about to withdraw your application for {propertyName} - Unit {unitNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Withdrawing your application is permanent and cannot be undone. You will need to submit a new application if you change your mind.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for withdrawal (optional)</Label>
            <Textarea
              id="reason"
              placeholder="E.g., Found another place, changed plans, etc."
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
              I understand that withdrawing my application is permanent and I will need to reapply if I change my mind.
            </label>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg space-y-1">
            <p className="text-sm font-medium">What happens next:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Your application will be marked as withdrawn</li>
              <li>The landlord will be notified</li>
              <li>The unit will become available for other applicants</li>
              <li>You can apply for other properties</li>
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
            onClick={handleWithdraw}
            disabled={loading || !confirmed}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Withdrawing...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Withdraw Application
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
