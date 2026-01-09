import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Building2 } from "lucide-react";
import { toast } from "sonner";

interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentMethodAdded?: () => void;
}

export const AddPaymentMethodDialog = ({ open, onOpenChange, onPaymentMethodAdded }: AddPaymentMethodDialogProps) => {
  const [methodType, setMethodType] = useState("card");
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  });
  const [bankDetails, setBankDetails] = useState({
    accountName: "",
    accountNumber: "",
    bankName: "",
    routingNumber: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast.loading("Adding payment method...");
    
    // TODO: Replace with actual API call
    // This is a mock implementation for demonstration purposes
    setTimeout(() => {
      toast.dismiss();
      toast.success("Payment method added successfully!");
      
      // Reset form
      setCardDetails({
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        cardholderName: "",
      });
      setBankDetails({
        accountName: "",
        accountNumber: "",
        bankName: "",
        routingNumber: "",
      });
      
      onPaymentMethodAdded?.();
      onOpenChange(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Add a new payment method for rent payments
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Payment Method Type</Label>
            <RadioGroup value={methodType} onValueChange={setMethodType} className="mt-2">
              <div className="flex items-center space-x-2 border border-border rounded-lg p-3">
                <RadioGroupItem value="card" id="method-card" />
                <Label htmlFor="method-card" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="w-4 h-4" />
                  <span>Credit/Debit Card</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border border-border rounded-lg p-3">
                <RadioGroupItem value="bank" id="method-bank" />
                <Label htmlFor="method-bank" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Building2 className="w-4 h-4" />
                  <span>Bank Account</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {methodType === "card" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="add-cardholderName">Cardholder Name</Label>
                <Input
                  id="add-cardholderName"
                  value={cardDetails.cardholderName}
                  onChange={(e) => setCardDetails({ ...cardDetails, cardholderName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <Label htmlFor="add-cardNumber">Card Number</Label>
                <Input
                  id="add-cardNumber"
                  value={cardDetails.cardNumber}
                  onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="add-expiryDate">Expiry Date</Label>
                  <Input
                    id="add-expiryDate"
                    value={cardDetails.expiryDate}
                    onChange={(e) => setCardDetails({ ...cardDetails, expiryDate: e.target.value })}
                    placeholder="MM/YY"
                    maxLength={5}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="add-cvv">CVV</Label>
                  <Input
                    id="add-cvv"
                    type="password"
                    pattern="[0-9]{3,4}"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                    placeholder="123"
                    maxLength={4}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {methodType === "bank" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="accountName">Account Holder Name</Label>
                <Input
                  id="accountName"
                  value={bankDetails.accountName}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                  placeholder="Bank of America"
                  required
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                  placeholder="1234567890"
                  required
                />
              </div>
              <div>
                <Label htmlFor="routingNumber">Routing Number</Label>
                <Input
                  id="routingNumber"
                  value={bankDetails.routingNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, routingNumber: e.target.value })}
                  placeholder="021000021"
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Payment Method</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
