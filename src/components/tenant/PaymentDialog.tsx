import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Building2, Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { paystackService } from "@/services/paystack";
import { initializePayment, pollPaymentStatus } from "@/services/paymentServiceSecure";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  property: string;
  paymentId?: string;
  tenantId: string;
  landlordId: string;
  unitId: string;
  agreementId?: string;
  onPaymentSuccess?: () => void;
}

export const PaymentDialog = ({ 
  open, 
  onOpenChange, 
  amount, 
  property, 
  paymentId,
  tenantId,
  landlordId,
  unitId,
  agreementId,
  onPaymentSuccess 
}: PaymentDialogProps) => {
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [processing, setProcessing] = useState(false);

  /**
   * Handle Paystack payment
   * Uses the secure paymentServiceSecure for backend integration
   */
  const handlePaystackPayment = async () => {
    if (!user?.email) {
      toast.error("User email is required for payment");
      return;
    }

    setProcessing(true);
    
    try {
      // Step 1: Initialize payment record in database (creates pending payment)
      const initResult = await initializePayment({
        tenantId,
        landlordId,
        unitId,
        amount,
        dueDate: new Date().toISOString(),
        agreementId,
      });

      if (!initResult.success || !initResult.reference || !initResult.paymentId) {
        throw new Error(initResult.error || 'Failed to initialize payment');
      }

      const { reference, paymentId: newPaymentId } = initResult;
      
      // Step 2: Open Paystack payment popup
      await paystackService.initializePayment({
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
        email: user.email,
        amount,
        reference,
        currency: 'NGN',
        metadata: {
          paymentId: newPaymentId,
          tenantId,
          landlordId,
          unitId,
          property,
          paymentType: 'rent',
        },
        channels: ['card', 'bank', 'ussd'],
        onSuccess: async (response) => {
          console.log('Paystack payment success:', response);
          toast.loading('Confirming payment...');
          
          // Step 3: Poll for webhook confirmation
          // The webhook updates payment status, we just wait for it
          const confirmResult = await pollPaymentStatus(newPaymentId, 30, 2000);
          
          if (confirmResult.success && confirmResult.status === 'paid') {
            toast.dismiss();
            toast.success("Payment successful! 🎉");
            onPaymentSuccess?.();
            onOpenChange(false);
          } else {
            toast.dismiss();
            toast.error("Payment confirmation pending. Check back shortly.");
          }
          
          setProcessing(false);
        },
        onClose: () => {
          toast.info("Payment cancelled");
          setProcessing(false);
        },
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
      setProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentMethod === 'card') {
      handlePaystackPayment();
    } else {
      // For other payment methods, show mock behavior
      toast.info("Feature coming soon! Please use card payment.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Rent</DialogTitle>
          <DialogDescription>
            Complete your rent payment of ${amount.toLocaleString()} for {property}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2">
              <div className="flex items-center space-x-2 border border-border rounded-lg p-3">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="w-4 h-4" />
                  <span>Card Payment (Paystack)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border border-border rounded-lg p-3 opacity-50">
                <RadioGroupItem value="transfer" id="transfer" disabled />
                <Label htmlFor="transfer" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Building2 className="w-4 h-4" />
                  <span>Bank Transfer (Coming Soon)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border border-border rounded-lg p-3 opacity-50">
                <RadioGroupItem value="ussd" id="ussd" disabled />
                <Label htmlFor="ussd" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Smartphone className="w-4 h-4" />
                  <span>USSD (Coming Soon)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {paymentMethod === "card" && (
            <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-foreground font-medium">Secure Payment with Paystack</p>
              <p className="text-xs text-muted-foreground">
                Click "Pay Now" to open the secure Paystack payment window. 
                Your payment will be processed securely and confirmed automatically.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay $${amount.toLocaleString()}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
