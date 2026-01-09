import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateUnit } from "@/services/propertyService";
import { safeParseFloat, safeParseInt } from "@/lib/utils";

// Constants
const MIN_BATHROOMS = 0.5; // Minimum number of bathrooms allowed

interface EditUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: {
    id: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
    rentAmount: number;
    squareFeet?: number;
    listingStatus: string;
  } | null;
  onUnitUpdated?: () => void;
}

export const EditUnitDialog = ({ open, onOpenChange, unit, onUnitUpdated }: EditUnitDialogProps) => {
  const [formData, setFormData] = useState({
    unitNumber: "",
    bedrooms: "2",
    bathrooms: "2",
    rentAmount: "",
    squareFeet: "",
    listingStatus: "available" as 'available' | 'applied' | 'rented' | 'unlisted',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when unit changes
  useEffect(() => {
    if (unit) {
      setFormData({
        unitNumber: unit.unitNumber,
        bedrooms: unit.bedrooms.toString(),
        bathrooms: unit.bathrooms.toString(),
        rentAmount: unit.rentAmount.toString(),
        squareFeet: unit.squareFeet ? unit.squareFeet.toString() : "",
        listingStatus: unit.listingStatus as 'available' | 'applied' | 'rented' | 'unlisted',
      });
    }
  }, [unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!unit) return;

    // Validation for required fields
    if (!formData.unitNumber || !formData.rentAmount) {
      toast.error("Please fill in unit number and rent amount");
      return;
    }

    // Validate rent amount is a valid positive number
    const rentAmount = safeParseFloat(formData.rentAmount, { allowZero: false });
    if (!rentAmount) {
      toast.error("Please provide a valid rent amount (must be greater than 0)");
      return;
    }

    // Validate bedrooms
    const bedrooms = safeParseInt(formData.bedrooms, { allowZero: true });
    if (bedrooms === undefined || bedrooms < 0) {
      toast.error("Please provide a valid number of bedrooms (0 or more)");
      return;
    }

    // Validate bathrooms
    const bathrooms = safeParseFloat(formData.bathrooms, { allowZero: true });
    if (bathrooms === undefined || bathrooms < MIN_BATHROOMS) {
      toast.error(`Please provide a valid number of bathrooms (at least ${MIN_BATHROOMS})`);
      return;
    }

    // Validate square feet if provided
    let squareFeet: number | undefined;
    if (formData.squareFeet) {
      squareFeet = safeParseInt(formData.squareFeet, { allowZero: false });
      if (!squareFeet) {
        toast.error("Please provide a valid square footage (must be greater than 0)");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await updateUnit(unit.id, {
        unitNumber: formData.unitNumber,
        bedrooms,
        bathrooms,
        rentAmount,
        squareFeet,
        listingStatus: formData.listingStatus,
      });

      toast.success("Unit updated successfully!");
      
      onUnitUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update unit:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update unit");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Unit Details</DialogTitle>
          <DialogDescription>
            Update the unit information. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-unitNumber">Unit Number *</Label>
              <Input
                id="edit-unitNumber"
                value={formData.unitNumber}
                onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                placeholder="1 or A"
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-rentAmount">Monthly Rent * (NGN)</Label>
              <Input
                id="edit-rentAmount"
                type="number"
                min="0"
                value={formData.rentAmount}
                onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                placeholder="150000"
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-bedrooms">Bedrooms</Label>
              <Input
                id="edit-bedrooms"
                type="number"
                min="0"
                max="20"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-bathrooms">Bathrooms</Label>
              <Input
                id="edit-bathrooms"
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-squareFeet">Square Feet (optional)</Label>
              <Input
                id="edit-squareFeet"
                type="number"
                min="0"
                value={formData.squareFeet}
                onChange={(e) => setFormData({ ...formData, squareFeet: e.target.value })}
                placeholder="1200"
              />
            </div>

            <div>
              <Label htmlFor="edit-listingStatus">Listing Status</Label>
              <Select 
                value={formData.listingStatus} 
                onValueChange={(value) => setFormData({ ...formData, listingStatus: value as 'available' | 'applied' | 'rented' | 'unlisted' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
