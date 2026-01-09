/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, Building2, Smartphone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { paystackService } from '@/services/paystack';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  description: string;
  metadata?: Record<string, unknown>;
  onSuccess?: () => void;
}

export const PaymentDialog = ({ 
  open, 
  onOpenChange, 
  amount, 
  description,
  metadata,
  onSuccess 
}: PaymentDialogProps) => {
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank' | 'ussd'>('card');
  const [email, setEmail] = useState(user?.email || '');
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    if (!email) {
      setError('Email address is required');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      await paystackService.initializePayment({
        email,
        amount,
        channels: [paymentMethod],
        metadata: {
          ...metadata,
          userId: user?.id,
          userName: user?.name,
          description,
        },
        onSuccess: async (response) => {
          /* logged */;
          
          try {
            // Verify payment on backend
            await paystackService.verifyPayment(response.reference);
            
            toast.success('Payment Successful', {
              description: `Your payment of ₦${amount.toLocaleString()} has been processed successfully.`,
            });

            onSuccess?.();
            onOpenChange(false);
          } catch (verifyError) {
            console.error('Payment verification error:', verifyError);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        onClose: () => {
          setIsProcessing(false);
          toast.info('Payment cancelled');
        },
      });
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment initialization failed');
      toast.error('Payment Failed', {
        description: 'Unable to process payment. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Make Payment</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount Display */}
          <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
            <div className="text-sm text-muted-foreground mb-1">Amount to Pay</div>
            <div className="text-3xl font-bold text-foreground">
              ₦{amount.toLocaleString()}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isProcessing}
              required
            />
            <p className="text-xs text-muted-foreground">
              Receipt will be sent to this email
            </p>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} disabled={isProcessing}>
              <div className="flex items-center space-x-2 border border-border rounded-lg p-3 hover:bg-secondary/50 transition-colors">
                <RadioGroupItem value="card" id="method-card" />
                <Label htmlFor="method-card" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="w-4 h-4 text-accent" />
                  <div>
                    <div className="font-medium">Card Payment</div>
                    <div className="text-xs text-muted-foreground">Visa, Mastercard, Verve</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 border border-border rounded-lg p-3 hover:bg-secondary/50 transition-colors">
                <RadioGroupItem value="bank" id="method-bank" />
                <Label htmlFor="method-bank" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Building2 className="w-4 h-4 text-accent" />
                  <div>
                    <div className="font-medium">Bank Transfer</div>
                    <div className="text-xs text-muted-foreground">Direct bank account transfer</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 border border-border rounded-lg p-3 hover:bg-secondary/50 transition-colors">
                <RadioGroupItem value="ussd" id="method-ussd" />
                <Label htmlFor="method-ussd" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Smartphone className="w-4 h-4 text-accent" />
                  <div>
                    <div className="font-medium">USSD</div>
                    <div className="text-xs text-muted-foreground">Dial code on your phone</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Save Payment Method */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="save-method"
              checked={savePaymentMethod}
              onCheckedChange={(checked) => setSavePaymentMethod(checked as boolean)}
              disabled={isProcessing}
            />
            <Label
              htmlFor="save-method"
              className="text-sm font-normal cursor-pointer"
            >
              Save payment method for future transactions
            </Label>
          </div>

          {/* Security Notice */}
          <div className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Secure Payment:</strong> Your payment is processed securely through Paystack. 
                We do not store your card details.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePayment}
            disabled={isProcessing || !email}
          >
            {isProcessing ? 'Processing...' : `Pay ₦${amount.toLocaleString()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
