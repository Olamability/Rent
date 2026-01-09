/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { paystackService } from '@/services/paystack';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AutopaySetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentAmount: number;
  onSuccess?: () => void;
}

export const AutopaySetupDialog = ({ 
  open, 
  onOpenChange, 
  rentAmount,
  onSuccess 
}: AutopaySetupDialogProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentDay, setPaymentDay] = useState('1');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSetupAutopay = async () => {
    if (!email) {
      setError('Email address is required');
      return;
    }

    if (!agreedToTerms) {
      setError('You must agree to the autopay terms');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Setup recurring payment
      const result = await paystackService.setupRecurringPayment({
        email,
        amount: rentAmount,
        interval,
      });

      toast.success('Autopay Setup Successful', {
        description: `Your rent will be automatically charged on the ${paymentDay}${getOrdinalSuffix(parseInt(paymentDay))} of each month.`,
        duration: 5000,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Autopay setup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to setup autopay');
      toast.error('Autopay Setup Failed', {
        description: 'Unable to setup automatic payments. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getOrdinalSuffix = (day: number): string => {
    const j = day % 10;
    const k = day % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Setup Automatic Payments</DialogTitle>
          <DialogDescription>
            Never miss a rent payment. Setup autopay and we'll handle the rest.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Amount Display */}
          <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
            <div className="text-sm text-muted-foreground mb-1">Monthly Rent</div>
            <div className="text-3xl font-bold text-foreground">
              ₦{rentAmount.toLocaleString()}
            </div>
          </div>

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
          </div>

          {/* Payment Frequency */}
          <div className="space-y-2">
            <Label htmlFor="interval">Payment Frequency</Label>
            <Select value={interval} onValueChange={(v) => setInterval(v as any)} disabled={isProcessing}>
              <SelectTrigger id="interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Day */}
          <div className="space-y-2">
            <Label htmlFor="paymentDay">Payment Day of Month</Label>
            <Select value={paymentDay} onValueChange={setPaymentDay} disabled={isProcessing}>
              <SelectTrigger id="paymentDay">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {day}{getOrdinalSuffix(day)} of the month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Payment will be automatically processed on this day each {interval === 'monthly' ? 'month' : 'year'}
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-2 p-4 bg-success/10 rounded-lg border border-success/20">
            <div className="font-medium text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Autopay Benefits
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Never miss a payment deadline</li>
              <li>• Automatic late fee protection</li>
              <li>• Email confirmation for each payment</li>
              <li>• Cancel anytime without penalty</li>
            </ul>
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              disabled={isProcessing}
            />
            <div className="space-y-1">
              <Label
                htmlFor="terms"
                className="text-sm font-normal cursor-pointer leading-tight"
              >
                I authorize RentFlow to automatically charge my payment method on the{' '}
                {paymentDay}{getOrdinalSuffix(parseInt(paymentDay))} of each month for ₦{rentAmount.toLocaleString()}.
                I understand I can cancel this authorization at any time.
              </Label>
            </div>
          </div>

          {/* Security Notice */}
          <div className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <CreditCard className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                You'll be redirected to add your payment method. Your card details are stored 
                securely with Paystack and are never shared with us.
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
            onClick={handleSetupAutopay}
            disabled={isProcessing || !email || !agreedToTerms}
          >
            {isProcessing ? 'Setting up...' : 'Setup Autopay'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
