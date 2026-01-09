import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, User, Briefcase, Phone, Home, Users, PawPrint, Car, FileCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ApplicationReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: {
    id: string;
    tenantName: string;
    tenantEmail?: string;
    tenantPhone?: string;
    propertyName?: string;
    unitNumber: string;
    moveInDate: string;
    // Personal Info
    personalInfo?: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      phone?: string;
      email?: string;
      nationalId?: string;
    };
    // Current Address
    currentAddress?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      duration?: string;
    };
    // Employment
    employer: string;
    position: string;
    income: number;
    employmentDuration?: string;
    employerPhone?: string;
    // Emergency Contact
    emergencyContact?: {
      name?: string;
      relationship?: string;
      phone?: string;
      email?: string;
    };
    // References
    references?: Array<{
      name: string;
      phone: string;
      email?: string;
      relationship: string;
    }>;
    referenceName?: string;
    referencePhone?: string;
    // Previous Landlord
    previousLandlord?: {
      name?: string;
      phone?: string;
      address?: string;
      rentalDuration?: string;
    };
    // Pets
    pets?: {
      hasPets?: boolean;
      petDetails?: string;
    };
    // Vehicle
    vehicles?: {
      hasVehicle?: boolean;
      vehicleDetails?: string;
    };
    // Occupants
    occupants?: {
      numberOfOccupants?: number;
      occupantDetails?: string;
    };
    // Consents
    creditCheckConsent?: boolean;
    backgroundCheckConsent?: boolean;
    // Notes
    notes?: string;
    status: string;
    submittedAt?: string;
  };
  onApprove?: () => void;
  onReject?: () => void;
}

export const ApplicationReviewDialog = ({ 
  open, 
  onOpenChange, 
  application,
  onApprove,
  onReject 
}: ApplicationReviewDialogProps) => {
  const handleApprove = () => {
    toast.success(`Application approved for ${application.tenantName}`);
    onApprove?.();
    onOpenChange(false);
  };

  const handleReject = () => {
    toast.error(`Application rejected for ${application.tenantName}`);
    onReject?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Application Review - {application.tenantName}
          </DialogTitle>
          <DialogDescription>
            Comprehensive tenant application for {application.propertyName || 'Property'} - Unit {application.unitNumber}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="references">References</TabsTrigger>
            <TabsTrigger value="additional">Additional</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Application Summary */}
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Application Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Applicant Name</div>
                  <div className="font-medium text-foreground">{application.tenantName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant={
                    application.status === 'pending' ? 'secondary' :
                    application.status === 'approved' ? 'default' : 'destructive'
                  }>
                    {application.status}
                  </Badge>
                </div>
                {application.tenantEmail && (
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium text-foreground">{application.tenantEmail}</div>
                  </div>
                )}
                {application.tenantPhone && (
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium text-foreground">{application.tenantPhone}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-muted-foreground">Move-in Date</div>
                  <div className="font-medium text-foreground">{application.moveInDate}</div>
                </div>
                {application.submittedAt && (
                  <div>
                    <div className="text-sm text-muted-foreground">Submitted</div>
                    <div className="font-medium text-foreground">{application.submittedAt}</div>
                  </div>
                )}
              </div>
            </Card>

            {/* Personal Information */}
            {application.personalInfo && (
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-3">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {application.personalInfo.firstName && (
                    <div>
                      <div className="text-sm text-muted-foreground">First Name</div>
                      <div className="font-medium text-foreground">{application.personalInfo.firstName}</div>
                    </div>
                  )}
                  {application.personalInfo.lastName && (
                    <div>
                      <div className="text-sm text-muted-foreground">Last Name</div>
                      <div className="font-medium text-foreground">{application.personalInfo.lastName}</div>
                    </div>
                  )}
                  {application.personalInfo.dateOfBirth && (
                    <div>
                      <div className="text-sm text-muted-foreground">Date of Birth</div>
                      <div className="font-medium text-foreground">{application.personalInfo.dateOfBirth}</div>
                    </div>
                  )}
                  {application.personalInfo.nationalId && (
                    <div>
                      <div className="text-sm text-muted-foreground">National ID</div>
                      <div className="font-medium text-foreground">{application.personalInfo.nationalId}</div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Current Address */}
            {application.currentAddress && (
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Current Address
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {application.currentAddress.street && (
                    <div className="col-span-2">
                      <div className="text-sm text-muted-foreground">Street</div>
                      <div className="font-medium text-foreground">{application.currentAddress.street}</div>
                    </div>
                  )}
                  {application.currentAddress.city && (
                    <div>
                      <div className="text-sm text-muted-foreground">City</div>
                      <div className="font-medium text-foreground">{application.currentAddress.city}</div>
                    </div>
                  )}
                  {application.currentAddress.state && (
                    <div>
                      <div className="text-sm text-muted-foreground">State</div>
                      <div className="font-medium text-foreground">{application.currentAddress.state}</div>
                    </div>
                  )}
                  {application.currentAddress.zipCode && (
                    <div>
                      <div className="text-sm text-muted-foreground">Zip Code</div>
                      <div className="font-medium text-foreground">{application.currentAddress.zipCode}</div>
                    </div>
                  )}
                  {application.currentAddress.duration && (
                    <div>
                      <div className="text-sm text-muted-foreground">Duration</div>
                      <div className="font-medium text-foreground">{application.currentAddress.duration}</div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="employment" className="space-y-4 mt-4">
            {/* Employment Information */}
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Employment Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Employer</div>
                  <div className="font-medium text-foreground">{application.employer}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Position</div>
                  <div className="font-medium text-foreground">{application.position}</div>
                </div>
                {application.income && (
                  <div>
                    <div className="text-sm text-muted-foreground">Annual Income</div>
                    <div className="font-medium text-foreground text-lg text-success">${application.income.toLocaleString()}</div>
                  </div>
                )}
                {application.employmentDuration && (
                  <div>
                    <div className="text-sm text-muted-foreground">Employment Duration</div>
                    <div className="font-medium text-foreground">{application.employmentDuration}</div>
                  </div>
                )}
                {application.employerPhone && (
                  <div className="col-span-2">
                    <div className="text-sm text-muted-foreground">Employer Phone</div>
                    <div className="font-medium text-foreground">{application.employerPhone}</div>
                  </div>
                )}
              </div>
            </Card>

            {/* Emergency Contact */}
            {application.emergencyContact && application.emergencyContact.name && (
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Name</div>
                    <div className="font-medium text-foreground">{application.emergencyContact.name}</div>
                  </div>
                  {application.emergencyContact.relationship && (
                    <div>
                      <div className="text-sm text-muted-foreground">Relationship</div>
                      <div className="font-medium text-foreground">{application.emergencyContact.relationship}</div>
                    </div>
                  )}
                  {application.emergencyContact.phone && (
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="font-medium text-foreground">{application.emergencyContact.phone}</div>
                    </div>
                  )}
                  {application.emergencyContact.email && (
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="font-medium text-foreground">{application.emergencyContact.email}</div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="references" className="space-y-4 mt-4">
            {/* References */}
            {application.references && application.references.length > 0 ? (
              application.references.map((ref, index) => (
                <Card key={index} className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">Reference {index + 1}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="font-medium text-foreground">{ref.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Relationship</div>
                      <div className="font-medium text-foreground">{ref.relationship}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="font-medium text-foreground">{ref.phone}</div>
                    </div>
                    {ref.email && (
                      <div>
                        <div className="text-sm text-muted-foreground">Email</div>
                        <div className="font-medium text-foreground">{ref.email}</div>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            ) : application.referenceName ? (
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-3">Reference</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Name</div>
                    <div className="font-medium text-foreground">{application.referenceName}</div>
                  </div>
                  {application.referencePhone && (
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="font-medium text-foreground">{application.referencePhone}</div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No references provided
              </div>
            )}

            {/* Previous Landlord */}
            {application.previousLandlord && application.previousLandlord.name && (
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-3">Previous Landlord</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Name</div>
                    <div className="font-medium text-foreground">{application.previousLandlord.name}</div>
                  </div>
                  {application.previousLandlord.phone && (
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="font-medium text-foreground">{application.previousLandlord.phone}</div>
                    </div>
                  )}
                  {application.previousLandlord.address && (
                    <div className="col-span-2">
                      <div className="text-sm text-muted-foreground">Address</div>
                      <div className="font-medium text-foreground">{application.previousLandlord.address}</div>
                    </div>
                  )}
                  {application.previousLandlord.rentalDuration && (
                    <div className="col-span-2">
                      <div className="text-sm text-muted-foreground">Rental Duration</div>
                      <div className="font-medium text-foreground">{application.previousLandlord.rentalDuration}</div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="additional" className="space-y-4 mt-4">
            {/* Occupants */}
            {application.occupants && (
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Occupants
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {application.occupants.numberOfOccupants && (
                    <div>
                      <div className="text-sm text-muted-foreground">Number of Occupants</div>
                      <div className="font-medium text-foreground">{application.occupants.numberOfOccupants}</div>
                    </div>
                  )}
                  {application.occupants.occupantDetails && (
                    <div className="col-span-2">
                      <div className="text-sm text-muted-foreground">Details</div>
                      <div className="font-medium text-foreground">{application.occupants.occupantDetails}</div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Pets */}
            {application.pets && (
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <PawPrint className="w-4 h-4" />
                  Pets
                </h3>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Has Pets</div>
                    <Badge variant={application.pets.hasPets ? "default" : "secondary"}>
                      {application.pets.hasPets ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {application.pets.hasPets && application.pets.petDetails && (
                    <div>
                      <div className="text-sm text-muted-foreground">Pet Details</div>
                      <div className="font-medium text-foreground">{application.pets.petDetails}</div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Vehicle */}
            {application.vehicles && (
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Vehicle
                </h3>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Has Vehicle</div>
                    <Badge variant={application.vehicles.hasVehicle ? "default" : "secondary"}>
                      {application.vehicles.hasVehicle ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {application.vehicles.hasVehicle && application.vehicles.vehicleDetails && (
                    <div>
                      <div className="text-sm text-muted-foreground">Vehicle Details</div>
                      <div className="font-medium text-foreground">{application.vehicles.vehicleDetails}</div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Consents */}
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Consents & Authorization
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={application.creditCheckConsent ? "default" : "secondary"}>
                    {application.creditCheckConsent ? "✓" : "✗"}
                  </Badge>
                  <span className="text-sm">Credit Check Consent</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={application.backgroundCheckConsent ? "default" : "secondary"}>
                    {application.backgroundCheckConsent ? "✓" : "✗"}
                  </Badge>
                  <span className="text-sm">Background Check Consent</span>
                </div>
              </div>
            </Card>

            {/* Additional Notes */}
            {application.notes && (
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-3">Additional Notes</h3>
                <p className="text-foreground whitespace-pre-wrap">{application.notes}</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {application.status === 'pending' && (
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleReject}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button 
              onClick={handleApprove}
              className="flex-1"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
