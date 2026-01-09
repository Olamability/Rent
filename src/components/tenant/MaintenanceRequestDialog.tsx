import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTenantAgreements, type TenancyAgreement } from "@/services/agreementService";
import { createMaintenanceRequest } from "@/services/maintenanceService";

interface MaintenanceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestSubmitted?: () => void;
}

export const MaintenanceRequestDialog = ({ open, onOpenChange, onRequestSubmitted }: MaintenanceRequestDialogProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    unitId: "",
    landlordId: "",
    title: "",
    description: "",
    priority: "",
    category: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [activeAgreements, setActiveAgreements] = useState<TenancyAgreement[]>([]);
  const [loadingAgreements, setLoadingAgreements] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch tenant's active agreements when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      loadActiveAgreements();
    }
  }, [open, user?.id]);

  const loadActiveAgreements = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingAgreements(true);
      const agreements = await fetchTenantAgreements(user.id);
      // Filter only active agreements
      const active = agreements.filter(a => a.status === 'active');
      setActiveAgreements(active);
      
      // If only one active agreement, pre-select it
      if (active.length === 1) {
        setFormData(prev => ({
          ...prev,
          unitId: active[0].unitId,
          landlordId: active[0].landlordId,
        }));
      }
    } catch (error) {
      console.error('Error loading agreements:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
        toast.error('You do not have permission to view your rental properties. Please contact support.');
      } else if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        toast.error('The rental database has not been set up. Please contact your administrator.');
      } else {
        toast.error(`Failed to load your rental properties: ${errorMessage}`);
      }
    } finally {
      setLoadingAgreements(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.unitId) {
      toast.error("Please select a property/unit");
      return;
    }
    
    if (!formData.title || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create maintenance request
      await createMaintenanceRequest({
        tenantId: user.id,
        landlordId: formData.landlordId,
        unitId: formData.unitId,
        title: formData.title,
        description: formData.description,
        category: formData.category as any,
        priority: formData.priority as any,
        images: [], // TODO: Upload files to storage and get URLs
      });
      
      toast.success("Maintenance request submitted successfully!");
      
      // Reset form
      setFormData({
        unitId: "",
        landlordId: "",
        title: "",
        description: "",
        priority: "",
        category: "",
      });
      setFiles([]);
      
      onRequestSubmitted?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit maintenance request';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnitSelection = (unitId: string) => {
    const selected = activeAgreements.find(a => a.unitId === unitId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        unitId: selected.unitId,
        landlordId: selected.landlordId,
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Maintenance Request</DialogTitle>
          <DialogDescription>
            Describe the issue and attach photos or videos if needed
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property/Unit Selection */}
          {loadingAgreements ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading your properties...</p>
            </div>
          ) : activeAgreements.length === 0 ? (
            <Alert>
              <Home className="h-4 w-4" />
              <AlertDescription>
                You don't have any active rental agreements. Please apply for a property first.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div>
                <Label htmlFor="unit">Property/Unit *</Label>
                <Select 
                  value={formData.unitId} 
                  onValueChange={handleUnitSelection}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property/unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAgreements.map((agreement) => (
                      <SelectItem key={agreement.unitId} value={agreement.unitId}>
                        <div className="flex flex-col">
                          <span className="font-medium">{agreement.property.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Unit {agreement.unit.unitNumber} - {agreement.property.city}, {agreement.property.state}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeAgreements.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    You have {activeAgreements.length} active rental properties
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="title">Issue Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Leaky faucet in bathroom"
                  required
                />
              </div>
            </>
          )}

          {!loadingAgreements && activeAgreements.length > 0 && (
            <>
              <div>
                <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="hvac">HVAC</SelectItem>
                <SelectItem value="appliance">Appliance</SelectItem>
                <SelectItem value="structural">Structural</SelectItem>
                <SelectItem value="pest_control">Pest Control</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="locks_security">Locks & Security</SelectItem>
                <SelectItem value="landscaping">Landscaping</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the issue in detail..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label>Attach Photos/Videos</Label>
            <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <Input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Images and videos up to 10MB
                </p>
              </label>
            </div>
            
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-secondary p-2 rounded">
                    <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.unitId}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
          </>
        )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
