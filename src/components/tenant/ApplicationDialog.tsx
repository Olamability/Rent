import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { submitApplication } from "@/services/applicationService";
import { safeParseInt } from "@/lib/utils";

interface ApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyName: string;
  propertyId: string;
  unitId: string;
}

export const ApplicationDialog = ({ open, onOpenChange, propertyName, propertyId, unitId }: ApplicationDialogProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    // Basic Info
    moveInDate: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phone: user?.phone || "",
    email: user?.email || "",
    nationalId: "",
    
    // Current Address
    currentStreet: "",
    currentCity: "",
    currentState: "",
    currentZipCode: "",
    currentDuration: "",
    
    // Employment
    employer: "",
    position: "",
    employerPhone: "",
    
    // Emergency Contact
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    emergencyEmail: "",
    
    // References (2 references)
    ref1Name: "",
    ref1Phone: "",
    ref1Email: "",
    ref1Relationship: "",
    ref2Name: "",
    ref2Phone: "",
    ref2Email: "",
    ref2Relationship: "",
    
    // Previous Landlord
    prevLandlordName: "",
    prevLandlordPhone: "",
    prevLandlordAddress: "",
    prevLandlordDuration: "",
    
    // Pets
    hasPets: false,
    petDetails: "",
    
    // Vehicle
    hasVehicle: false,
    vehicleDetails: "",
    
    // Occupants
    numberOfOccupants: "1",
    occupantDetails: "",
    
    // Additional Notes
    notes: "",
  });
  
  const [consents, setConsents] = useState({
    creditCheck: false,
    backgroundCheck: false,
  });
  
  const [documents, setDocuments] = useState<{ [key: string]: File | null }>({
    idCard: null,
    previousLease: null,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation - check all required fields
    if (
      !formData.moveInDate || 
      !formData.firstName || 
      !formData.lastName || 
      !formData.employer || 
      !formData.phone
    ) {
      toast.error("Please fill in all required fields marked with *");
      return;
    }

    // Validate number of occupants
    const numberOfOccupants = safeParseInt(formData.numberOfOccupants, { allowZero: false });
    if (!numberOfOccupants) {
      toast.error("Number of occupants must be at least 1");
      return;
    }

    if (!formData.ref1Name || !formData.ref1Phone) {
      toast.error("At least one reference is required");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to submit an application");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare references array
      const refs = [];
      if (formData.ref1Name && formData.ref1Phone) {
        refs.push({
          name: formData.ref1Name,
          phone: formData.ref1Phone,
          email: formData.ref1Email,
          relationship: formData.ref1Relationship,
        });
      }
      if (formData.ref2Name && formData.ref2Phone) {
        refs.push({
          name: formData.ref2Name,
          phone: formData.ref2Phone,
          email: formData.ref2Email,
          relationship: formData.ref2Relationship,
        });
      }

      // Prepare application data
      const applicationData = {
        tenantId: user.id,
        propertyId,
        unitId,
        moveInDate: formData.moveInDate,
        personalInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
          phone: formData.phone,
          email: formData.email,
          nationalId: formData.nationalId,
        },
        currentAddress: formData.currentStreet ? {
          street: formData.currentStreet,
          city: formData.currentCity,
          state: formData.currentState,
          zipCode: formData.currentZipCode,
          duration: formData.currentDuration,
        } : undefined,
        employmentInfo: {
          employer: formData.employer,
          position: formData.position,
          employerPhone: formData.employerPhone,
        },
        emergencyContact: formData.emergencyName ? {
          name: formData.emergencyName,
          relationship: formData.emergencyRelationship,
          phone: formData.emergencyPhone,
          email: formData.emergencyEmail,
        } : undefined,
        refs,
        previousLandlord: formData.prevLandlordName ? {
          name: formData.prevLandlordName,
          phone: formData.prevLandlordPhone,
          address: formData.prevLandlordAddress,
          rentalDuration: formData.prevLandlordDuration,
        } : undefined,
        pets: {
          hasPets: formData.hasPets,
          petDetails: formData.petDetails,
        },
        vehicles: {
          hasVehicle: formData.hasVehicle,
          vehicleDetails: formData.vehicleDetails,
        },
        occupants: {
          numberOfOccupants,
          occupantDetails: formData.occupantDetails,
        },
        creditCheckConsent: consents.creditCheck,
        backgroundCheckConsent: consents.backgroundCheck,
        documents: {
          // NOTE: File upload to Supabase Storage is not yet implemented
          // For now, only file names are stored as placeholders
          idCard: documents.idCard?.name,
          previousLeaseAgreement: documents.previousLease?.name,
        },
        notes: formData.notes,
      };

      await submitApplication(applicationData);
      
      toast.success("Application submitted successfully! The landlord will review it shortly.");
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit application:', error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (type: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocuments({ ...documents, [type]: e.target.files[0] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for {propertyName}</DialogTitle>
          <DialogDescription>
            Complete this comprehensive application form. Fields marked with * are required.
            Providing complete information helps expedite your application review.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground border-b pb-2">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  required
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="nationalId">NIN</Label>
                <Input
                  id="nationalId"
                  value={formData.nationalId}
                  onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  placeholder="12345678901"
                />
              </div>
            </div>
          </div>

          {/* Move-in Date */}
          <div>
            <Label htmlFor="moveInDate">Desired Move-in Date *</Label>
            <Input
              id="moveInDate"
              type="date"
              value={formData.moveInDate}
              onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
              required
            />
          </div>

          {/* Current Address */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground border-b pb-2">Current Address</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="currentStreet">Street Address</Label>
                <Input
                  id="currentStreet"
                  value={formData.currentStreet}
                  onChange={(e) => setFormData({ ...formData, currentStreet: e.target.value })}
                  placeholder="123 Main St, Apt 4B"
                />
              </div>
              <div>
                <Label htmlFor="currentCity">City</Label>
                <Input
                  id="currentCity"
                  value={formData.currentCity}
                  onChange={(e) => setFormData({ ...formData, currentCity: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="currentState">State</Label>
                <Input
                  id="currentState"
                  value={formData.currentState}
                  onChange={(e) => setFormData({ ...formData, currentState: e.target.value })}
                  placeholder="State"
                />
              </div>
              <div>
                <Label htmlFor="currentZipCode">Zip Code</Label>
                <Input
                  id="currentZipCode"
                  value={formData.currentZipCode}
                  onChange={(e) => setFormData({ ...formData, currentZipCode: e.target.value })}
                  placeholder="12345"
                />
              </div>
              <div>
                <Label htmlFor="currentDuration">How long have you lived here?</Label>
                <Input
                  id="currentDuration"
                  value={formData.currentDuration}
                  onChange={(e) => setFormData({ ...formData, currentDuration: e.target.value })}
                  placeholder="e.g., 2 years"
                />
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground border-b pb-2">Employment Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employer">Employer *</Label>
                <Input
                  id="employer"
                  value={formData.employer}
                  onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                  placeholder="Company name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="position">Occupation *</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Job title"
                  required
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="employerPhone">Employer Phone Number</Label>
                <Input
                  id="employerPhone"
                  type="tel"
                  value={formData.employerPhone}
                  onChange={(e) => setFormData({ ...formData, employerPhone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground border-b pb-2">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyName">Full Name</Label>
                <Input
                  id="emergencyName"
                  value={formData.emergencyName}
                  onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <Label htmlFor="emergencyRelationship">Relationship</Label>
                <Input
                  id="emergencyRelationship"
                  value={formData.emergencyRelationship}
                  onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })}
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
              </div>
              <div>
                <Label htmlFor="emergencyPhone">Phone Number</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <Label htmlFor="emergencyEmail">Email</Label>
                <Input
                  id="emergencyEmail"
                  type="email"
                  value={formData.emergencyEmail}
                  onChange={(e) => setFormData({ ...formData, emergencyEmail: e.target.value })}
                  placeholder="emergency@example.com"
                />
              </div>
            </div>
          </div>

          {/* References */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground border-b pb-2">References (At least 1 required)</h3>
            
            {/* Reference 1 */}
            <div className="space-y-3 p-4 bg-secondary/20 rounded-lg">
              <h4 className="font-medium text-foreground">Reference 1 *</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ref1Name">Name *</Label>
                  <Input
                    id="ref1Name"
                    value={formData.ref1Name}
                    onChange={(e) => setFormData({ ...formData, ref1Name: e.target.value })}
                    placeholder="Reference name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ref1Phone">Phone *</Label>
                  <Input
                    id="ref1Phone"
                    type="tel"
                    value={formData.ref1Phone}
                    onChange={(e) => setFormData({ ...formData, ref1Phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ref1Email">Email</Label>
                  <Input
                    id="ref1Email"
                    type="email"
                    value={formData.ref1Email}
                    onChange={(e) => setFormData({ ...formData, ref1Email: e.target.value })}
                    placeholder="reference@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="ref1Relationship">Relationship</Label>
                  <Input
                    id="ref1Relationship"
                    value={formData.ref1Relationship}
                    onChange={(e) => setFormData({ ...formData, ref1Relationship: e.target.value })}
                    placeholder="e.g., Former employer, Friend"
                  />
                </div>
              </div>
            </div>

            {/* Reference 2 */}
            <div className="space-y-3 p-4 bg-secondary/20 rounded-lg">
              <h4 className="font-medium text-foreground">Reference 2 (Optional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ref2Name">Name</Label>
                  <Input
                    id="ref2Name"
                    value={formData.ref2Name}
                    onChange={(e) => setFormData({ ...formData, ref2Name: e.target.value })}
                    placeholder="Reference name"
                  />
                </div>
                <div>
                  <Label htmlFor="ref2Phone">Phone</Label>
                  <Input
                    id="ref2Phone"
                    type="tel"
                    value={formData.ref2Phone}
                    onChange={(e) => setFormData({ ...formData, ref2Phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="ref2Email">Email</Label>
                  <Input
                    id="ref2Email"
                    type="email"
                    value={formData.ref2Email}
                    onChange={(e) => setFormData({ ...formData, ref2Email: e.target.value })}
                    placeholder="reference@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="ref2Relationship">Relationship</Label>
                  <Input
                    id="ref2Relationship"
                    value={formData.ref2Relationship}
                    onChange={(e) => setFormData({ ...formData, ref2Relationship: e.target.value })}
                    placeholder="e.g., Former employer, Friend"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Previous Landlord */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground border-b pb-2">Previous Landlord Reference</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prevLandlordName">Landlord Name</Label>
                <Input
                  id="prevLandlordName"
                  value={formData.prevLandlordName}
                  onChange={(e) => setFormData({ ...formData, prevLandlordName: e.target.value })}
                  placeholder="Previous landlord"
                />
              </div>
              <div>
                <Label htmlFor="prevLandlordPhone">Phone Number</Label>
                <Input
                  id="prevLandlordPhone"
                  type="tel"
                  value={formData.prevLandlordPhone}
                  onChange={(e) => setFormData({ ...formData, prevLandlordPhone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="prevLandlordAddress">Previous Rental Address</Label>
                <Input
                  id="prevLandlordAddress"
                  value={formData.prevLandlordAddress}
                  onChange={(e) => setFormData({ ...formData, prevLandlordAddress: e.target.value })}
                  placeholder="123 Previous St, City, State"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="prevLandlordDuration">Rental Duration</Label>
                <Input
                  id="prevLandlordDuration"
                  value={formData.prevLandlordDuration}
                  onChange={(e) => setFormData({ ...formData, prevLandlordDuration: e.target.value })}
                  placeholder="e.g., 2 years (Jan 2020 - Jan 2022)"
                />
              </div>
            </div>
          </div>

          {/* Pets */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground border-b pb-2">Pets</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasPets"
                checked={formData.hasPets}
                onCheckedChange={(checked) => setFormData({ ...formData, hasPets: checked as boolean })}
              />
              <Label htmlFor="hasPets" className="cursor-pointer">I have pets</Label>
            </div>
            {formData.hasPets && (
              <div>
                <Label htmlFor="petDetails">Pet Details</Label>
                <Textarea
                  id="petDetails"
                  value={formData.petDetails}
                  onChange={(e) => setFormData({ ...formData, petDetails: e.target.value })}
                  placeholder="e.g., 1 dog (Golden Retriever, 3 years old, 60 lbs)"
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* Vehicle */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground border-b pb-2">Vehicle Information</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasVehicle"
                checked={formData.hasVehicle}
                onCheckedChange={(checked) => setFormData({ ...formData, hasVehicle: checked as boolean })}
              />
              <Label htmlFor="hasVehicle" className="cursor-pointer">I have a vehicle</Label>
            </div>
            {formData.hasVehicle && (
              <div>
                <Label htmlFor="vehicleDetails">Vehicle Details</Label>
                <Input
                  id="vehicleDetails"
                  value={formData.vehicleDetails}
                  onChange={(e) => setFormData({ ...formData, vehicleDetails: e.target.value })}
                  placeholder="e.g., 2020 Toyota Camry, License: ABC-1234"
                />
              </div>
            )}
          </div>

          {/* Occupants */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground border-b pb-2">Occupants</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numberOfOccupants">Number of Occupants (including you)</Label>
                <Input
                  id="numberOfOccupants"
                  type="number"
                  min="1"
                  value={formData.numberOfOccupants}
                  onChange={(e) => setFormData({ ...formData, numberOfOccupants: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="occupantDetails">Occupant Details</Label>
                <Textarea
                  id="occupantDetails"
                  value={formData.occupantDetails}
                  onChange={(e) => setFormData({ ...formData, occupantDetails: e.target.value })}
                  placeholder="e.g., Spouse (35), Child (8), Child (5)"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground border-b pb-2">Required Documents</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="idCard">ID Card / Driver's License</Label>
                <div className="mt-2 border-2 border-dashed border-border rounded-lg p-4">
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <Input
                    id="idCard"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange("idCard", e)}
                    className="hidden"
                  />
                  <label htmlFor="idCard" className="cursor-pointer text-center block">
                    <span className="text-sm text-muted-foreground">
                      {documents.idCard ? documents.idCard.name : "Click to upload"}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="previousLease">Previous Lease Agreement (Optional)</Label>
                <div className="mt-2 border-2 border-dashed border-border rounded-lg p-4">
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <Input
                    id="previousLease"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange("previousLease", e)}
                    className="hidden"
                  />
                  <label htmlFor="previousLease" className="cursor-pointer text-center block">
                    <span className="text-sm text-muted-foreground">
                      {documents.previousLease ? documents.previousLease.name : "Click to upload"}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Consents */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground border-b pb-2">Consent & Authorization</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="creditCheck"
                  checked={consents.creditCheck}
                  onCheckedChange={(checked) => setConsents({ ...consents, creditCheck: checked as boolean })}
                />
                <Label htmlFor="creditCheck" className="cursor-pointer text-sm leading-relaxed">
                  I authorize the landlord to conduct a credit check as part of the application process
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="backgroundCheck"
                  checked={consents.backgroundCheck}
                  onCheckedChange={(checked) => setConsents({ ...consents, backgroundCheck: checked as boolean })}
                />
                <Label htmlFor="backgroundCheck" className="cursor-pointer text-sm leading-relaxed">
                  I authorize the landlord to conduct a background check as part of the application process
                </Label>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information you'd like the landlord to know..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
