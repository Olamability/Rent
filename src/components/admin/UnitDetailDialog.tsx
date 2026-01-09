import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Home, MapPin, DollarSign, User, Calendar, Bed, Bath, Maximize } from "lucide-react";
import { format } from "date-fns";

interface Unit {
  id: string;
  unit_number: string;
  property_id: string;
  property_name?: string;
  property_address?: string;
  landlord_name?: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  rent_amount: number;
  is_occupied: boolean;
  current_tenant_id?: string;
  tenant_name?: string;
  available_date?: string;
  listing_status?: string;
}

interface UnitDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit | null;
}

export const UnitDetailDialog = ({ 
  open, 
  onOpenChange, 
  unit
}: UnitDetailDialogProps) => {
  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">Unit {unit.unit_number}</div>
              <div className="text-sm text-muted-foreground">{unit.property_name}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {unit.is_occupied ? (
              <Badge variant="default" className="bg-success">
                Occupied
              </Badge>
            ) : (
              <Badge variant="secondary">
                Vacant
              </Badge>
            )}
            {unit.listing_status && (
              <Badge variant="outline" className="capitalize">
                {unit.listing_status}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Unit Specifications */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Unit Specifications</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-3 bg-secondary/30 rounded-lg">
                <Bed className="w-5 h-5 text-muted-foreground mb-1" />
                <div className="text-2xl font-bold text-foreground">{unit.bedrooms}</div>
                <div className="text-xs text-muted-foreground">Bedrooms</div>
              </div>
              <div className="flex flex-col items-center p-3 bg-secondary/30 rounded-lg">
                <Bath className="w-5 h-5 text-muted-foreground mb-1" />
                <div className="text-2xl font-bold text-foreground">{unit.bathrooms}</div>
                <div className="text-xs text-muted-foreground">Bathrooms</div>
              </div>
              <div className="flex flex-col items-center p-3 bg-secondary/30 rounded-lg">
                <Maximize className="w-5 h-5 text-muted-foreground mb-1" />
                <div className="text-2xl font-bold text-foreground">{unit.square_feet}</div>
                <div className="text-xs text-muted-foreground">Sq. Ft.</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Rent Information */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Rent Information</h4>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-success" />
              <div>
                <div className="text-2xl font-bold text-foreground">${unit.rent_amount.toLocaleString()}</div>
                <div className="text-muted-foreground">per month</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Property Information */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Property Information</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <Home className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">{unit.property_name}</div>
                  <div className="text-muted-foreground">{unit.property_address}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Landlord: </span>
                  <span className="text-foreground">{unit.landlord_name || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tenant Information */}
          {unit.is_occupied && unit.tenant_name && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Current Tenant</h4>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground font-medium">{unit.tenant_name}</span>
                </div>
              </div>
            </>
          )}

          {/* Availability Date */}
          {!unit.is_occupied && unit.available_date && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Availability</h4>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Available from: </span>
                    <span className="text-foreground font-medium">
                      {format(new Date(unit.available_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Unit Details */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Unit Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Unit ID:</span>
                <div className="font-mono text-foreground text-xs">{unit.id}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Unit Number:</span>
                <div className="text-foreground">{unit.unit_number}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
