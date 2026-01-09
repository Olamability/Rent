import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchApplicationsByLandlord, type ApplicationWithRelations } from "@/services/applicationService";
import { fetchLandlordProperties, type PropertyWithUnit } from "@/services/propertyService";
import { createTenancyAgreement } from "@/services/agreementService";
import { AlertCircle } from "lucide-react";
import { safeParseFloat, formatCurrency } from "@/lib/utils";

interface GenerateAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgreementGenerated?: () => void;
}

export const GenerateAgreementDialog = ({ open, onOpenChange, onAgreementGenerated }: GenerateAgreementDialogProps) => {
  const { user } = useAuth();
  const [approvedApplications, setApprovedApplications] = useState<ApplicationWithRelations[]>([]);
  const [units, setUnits] = useState<PropertyWithUnit[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tenantId: "",
    unitId: "",
    propertyId: "",
    startDate: "",
    endDate: "",
    rentAmount: "",
    depositAmount: "",
    additionalTerms: "",
  });

  // Load approved applications and landlord's units when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      loadDialogData();
    }
  }, [open, user?.id]);

  const loadDialogData = async () => {
    if (!user?.id) return;

    try {
      setLoadingData(true);
      
      // Fetch landlord's approved applications (potential tenants)
      const applications = await fetchApplicationsByLandlord(user.id);
      const approved = applications.filter(app => app.status === 'approved');
      setApprovedApplications(approved);
      
      // Fetch landlord's units
      const properties = await fetchLandlordProperties(user.id);
      setUnits(properties);
    } catch (error) {
      console.error('Error loading dialog data:', error);
      toast.error('Failed to load tenants and units');
    } finally {
      setLoadingData(false);
    }
  };

  const handleUnitSelection = (unitId: string) => {
    const selectedUnit = units.find(u => u.unitId === unitId);
    if (selectedUnit) {
      setFormData(prev => ({
        ...prev,
        unitId: unitId,
        propertyId: selectedUnit.id,
        rentAmount: selectedUnit.rentAmount?.toString() || "",
        depositAmount: selectedUnit.rentAmount ? (selectedUnit.rentAmount * 2).toString() : "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tenantId || !formData.unitId || !formData.startDate || !formData.rentAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate rent amount
    const rentAmount = safeParseFloat(formData.rentAmount, { allowZero: false });
    if (!rentAmount) {
      toast.error("Please provide a valid rent amount (must be greater than 0)");
      return;
    }

    // Validate deposit amount if provided
    let depositAmount = 0;
    if (formData.depositAmount) {
      const parsedDeposit = safeParseFloat(formData.depositAmount, { allowZero: true });
      if (parsedDeposit === undefined) {
        toast.error("Please provide a valid deposit amount (0 or more)");
        return;
      }
      depositAmount = parsedDeposit;
    }

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Calculate end date if not provided (1 year lease by default)
      let endDate = formData.endDate;
      if (!endDate && formData.startDate) {
        const start = new Date(formData.startDate);
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        endDate = end.toISOString().split('T')[0];
      }
      
      await createTenancyAgreement({
        tenantId: formData.tenantId,
        landlordId: user.id,
        unitId: formData.unitId,
        startDate: formData.startDate,
        endDate: endDate,
        rentAmount,
        depositAmount,
        terms: formData.additionalTerms,
        status: 'draft',
      });
      
      toast.success("Tenancy agreement generated successfully! Ready for digital signature.");
      
      // Reset form
      setFormData({
        tenantId: "",
        unitId: "",
        propertyId: "",
        startDate: "",
        endDate: "",
        rentAmount: "",
        depositAmount: "",
        additionalTerms: "",
      });
      
      onAgreementGenerated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating agreement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate agreement';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Tenancy Agreement</DialogTitle>
          <DialogDescription>
            Create a new tenancy agreement for a tenant
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {loadingData ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading tenants and units...</p>
            </div>
          ) : (
            <>
              {approvedApplications.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No approved applications found. Tenants must apply for a property first and be approved before you can generate an agreement.
                  </AlertDescription>
                </Alert>
              )}
              
              {units.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No units found. Please add properties and units first.
                  </AlertDescription>
                </Alert>
              )}

              {approvedApplications.length > 0 && units.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tenantId">Tenant *</Label>
                    <Select 
                      value={formData.tenantId} 
                      onValueChange={(value) => setFormData({ ...formData, tenantId: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedApplications.map((app) => (
                          <SelectItem key={app.tenantId} value={app.tenantId}>
                            <div className="flex flex-col">
                              <span className="font-medium">{app.users?.name || 'Unknown'}</span>
                              <span className="text-xs text-muted-foreground">
                                {app.users?.email || ''}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {approvedApplications.length} approved {approvedApplications.length === 1 ? 'applicant' : 'applicants'}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="unitId">Unit *</Label>
                    <Select 
                      value={formData.unitId} 
                      onValueChange={handleUnitSelection}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.unitId} value={unit.unitId}>
                            <div className="flex flex-col">
                              <span className="font-medium">Unit {unit.unitNumber} - {unit.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {unit.city}, {unit.state} • {formatCurrency(unit.rentAmount)}/annum
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {units.length} {units.length === 1 ? 'unit' : 'units'} available
                    </p>
                  </div>

                  <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="rentAmount">Monthly Rent *</Label>
              <Input
                id="rentAmount"
                type="number"
                value={formData.rentAmount}
                onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                placeholder="1500"
                required
              />
            </div>

            <div>
              <Label htmlFor="depositAmount">Security Deposit</Label>
              <Input
                id="depositAmount"
                type="number"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                placeholder="2000"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="additionalTerms">Additional Terms (Optional)</Label>
              <Textarea
                id="additionalTerms"
                value={formData.additionalTerms}
                onChange={(e) => setFormData({ ...formData, additionalTerms: e.target.value })}
                placeholder="Add any additional terms or conditions..."
                rows={4}
              />
            </div>
          </div>
          )}

          <div className="bg-secondary/50 p-4 rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">Standard Terms Included:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Rent due on 1st of each month</li>
              <li>• Late fee of $50 after 5 days</li>
              <li>• No smoking inside the unit</li>
              <li>• 30 days notice required for move-out</li>
              <li>• Tenant responsible for utilities</li>
              <li>• Landlord responsible for major repairs</li>
            </ul>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.tenantId || !formData.unitId}
            >
              {isSubmitting ? 'Generating...' : 'Generate Agreement'}
            </Button>
          </DialogFooter>
        </>
        )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
