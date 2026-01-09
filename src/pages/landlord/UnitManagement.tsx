import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Home, Building2, Users, CreditCard, Wrench, FileText, Settings,
  BarChart3, Crown, Bell as BellIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicationReviewDialog } from "@/components/landlord/ApplicationReviewDialog";
import { EditUnitDialog } from "@/components/landlord/EditUnitDialog";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchAvailableProperties } from '@/services/propertyService';
import { fetchApplicationsByLandlord, updateApplicationStatus } from '@/services/applicationService';
import type { PropertyApplication } from '@/types';
import { supabase } from '@/lib/supabase';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Application {
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
  employer?: string;
  position?: string;
  income?: number;
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
}

interface Unit {
  id: string;
  property: string;
  unit: string;
  tenant: string | null;
  rent: number;
  status: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  listingStatus?: string;
}

const navLinks = [
  { icon: Home, label: "Dashboard", href: "/landlord/dashboard" },
  { icon: Building2, label: "Properties", href: "/landlord/properties" },
  { icon: Users, label: "Tenants", href: "/landlord/units" },
  { icon: CreditCard, label: "Rent Collection", href: "/landlord/rent-collection" },
  { icon: Wrench, label: "Maintenance", href: "/landlord/maintenance" },
  { icon: FileText, label: "Agreements", href: "/landlord/agreements" },
  { icon: BellIcon, label: "Reminders", href: "/landlord/reminders" },
  { icon: BarChart3, label: "Reports", href: "/landlord/reports" },
  { icon: Crown, label: "Subscription", href: "/landlord/subscription" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

const UnitManagement = () => {
  const { user, isLoading: userLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isManageUnitOpen, setIsManageUnitOpen] = useState(false);
  const [isEditUnitOpen, setIsEditUnitOpen] = useState(false);

  const [applications, setApplications] = useState<Application[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);

  // Fetch applications from the database
  const fetchApplications = useCallback(async () => {
    if (!user?.id) return;
    
    setApplicationsLoading(true);
    try {
      const apps = await fetchApplicationsByLandlord(user.id);
      
      // Transform to display format - data is already included from the query
      const displayApps: Application[] = apps.map((app) => {
        // The related data is attached by the service via ApplicationWithRelations type
        
        return {
          id: app.id,
          tenantName: app.users?.name || 'Unknown',
          tenantEmail: app.users?.email,
          tenantPhone: app.users?.phone,
          propertyName: app.properties?.name || 'Unknown Property',
          unitNumber: app.units?.unit_number || 'N/A',
          moveInDate: app.moveInDate ? app.moveInDate.toLocaleDateString() : 'Not specified',
          personalInfo: app.personalInfo,
          currentAddress: app.currentAddress,
          employer: app.employmentInfo?.employer || '',
          position: app.employmentInfo?.position || '',
          income: app.employmentInfo?.income || 0,
          employmentDuration: app.employmentInfo?.employmentDuration,
          employerPhone: app.employmentInfo?.employerPhone,
          emergencyContact: app.emergencyContact,
          references: app.refs || [],
          referenceName: app.refs?.[0]?.name,
          referencePhone: app.refs?.[0]?.phone,
          previousLandlord: app.previousLandlord,
          pets: app.pets,
          vehicles: app.vehicles,
          occupants: app.occupants,
          creditCheckConsent: app.creditCheckConsent,
          backgroundCheckConsent: app.backgroundCheckConsent,
          notes: app.notes,
          status: app.status,
          submittedAt: app.submittedAt ? app.submittedAt.toLocaleDateString() : 'Unknown',
        };
      });

      setApplications(displayApps);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setApplicationsLoading(false);
    }
  }, [user?.id]);

  // Fetch units and tenants from Supabase
  const fetchUnitsAndTenants = useCallback(async () => {
    setLoading(true);
    try {
      const properties = await fetchAvailableProperties();
      // For each unit, fetch tenant if occupied
      const unitPromises = properties.map(async (p) => {
        let tenantName: string | null = null;
        if (p.listingStatus !== 'available' && p.unitId) {
          // Find current tenant for this unit
          const { data: agreement } = await supabase
            .from('tenancy_agreements')
            .select('tenant_id')
            .eq('unit_id', p.unitId)
            .eq('agreement_status', 'active')
            .maybeSingle();
          if (agreement?.tenant_id) {
            const { data: tenantUser } = await supabase
              .from('users')
              .select('name')
              .eq('id', agreement.tenant_id)
              .maybeSingle();
            tenantName = tenantUser?.name || null;
          }
        }
        return {
          id: p.unitId,
          property: p.name,
          unit: p.unitNumber,
          tenant: tenantName,
          rent: p.rentAmount,
          status: p.listingStatus === 'available' ? 'vacant' : 'occupied',
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          squareFeet: p.squareFeet,
          listingStatus: p.listingStatus,
        };
      });
      const realUnits = await Promise.all(unitPromises);
      setUnits(realUnits);
    } catch (err) {
      console.error('Failed to fetch units:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnitsAndTenants();
    fetchApplications();
  }, [fetchUnitsAndTenants, fetchApplications]);

  const handleApplicationAction = async (applicationId: string, action: 'approve' | 'reject') => {
    if (!user?.id) return;
    
    try {
      await updateApplicationStatus(applicationId, action === 'approve' ? 'approved' : 'rejected', user.id);
      
      // Refresh both applications and units
      await Promise.all([
        fetchApplications(),
        fetchUnitsAndTenants()
      ]);
      
      if (action === 'approve') {
        toast.success("Application approved! The tenant has been notified.");
      } else {
        toast.info("Application rejected. The tenant has been notified.");
      }
    } catch (error) {
      console.error('Failed to update application:', error);
      toast.error('Failed to update application status');
    }
  };

  const handleUnitUpdated = async () => {
    // Refresh units after update
    await fetchUnitsAndTenants();
  };

  return (
    <DashboardLayout
      navLinks={navLinks}
      userName={userLoading ? '' : (user?.name || '')}
      pageTitle="Unit & Tenant Management"
      pageDescription="Manage units and tenant assignments"
    >
      {selectedApplication && (
        <ApplicationReviewDialog
          open={isReviewDialogOpen}
          onOpenChange={setIsReviewDialogOpen}
          application={selectedApplication}
          onApprove={() => {
            if (selectedApplication?.id) {
              handleApplicationAction(selectedApplication.id, 'approve');
            }
          }}
          onReject={() => {
            if (selectedApplication?.id) {
              handleApplicationAction(selectedApplication.id, 'reject');
            }
          }}
        />
      )}

      {/* Edit Unit Dialog */}
      <EditUnitDialog
        open={isEditUnitOpen}
        onOpenChange={setIsEditUnitOpen}
        unit={selectedUnit ? {
          id: selectedUnit.id,
          unitNumber: selectedUnit.unit,
          bedrooms: selectedUnit.bedrooms || 0,
          bathrooms: selectedUnit.bathrooms || 0,
          rentAmount: selectedUnit.rent,
          squareFeet: selectedUnit.squareFeet,
          listingStatus: selectedUnit.listingStatus || 'available',
        } : null}
        onUnitUpdated={handleUnitUpdated}
      />

      {/* Manage Unit Dialog */}
      <Dialog open={isManageUnitOpen} onOpenChange={setIsManageUnitOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Unit</DialogTitle>
            <DialogDescription>
              View and manage unit details
            </DialogDescription>
          </DialogHeader>
          {selectedUnit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Property</Label>
                  <p className="text-foreground font-medium">{selectedUnit.property}</p>
                </div>
                <div>
                  <Label>Unit Number</Label>
                  <p className="text-foreground font-medium">{selectedUnit.unit}</p>
                </div>
                <div>
                  <Label>Current Tenant</Label>
                  <p className="text-foreground font-medium">{selectedUnit.tenant || 'Vacant'}</p>
                </div>
                <div>
                  <Label>Monthly Rent</Label>
                  <p className="text-foreground font-medium">${selectedUnit.rent}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedUnit.status === 'occupied' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  }`}>
                    {selectedUnit.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsManageUnitOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  toast.success("Unit settings updated");
                  setIsManageUnitOpen(false);
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="units" className="space-y-4">
        <TabsList>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="applications">
            Applications
            {applications.filter(a => a.status === 'pending').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-warning/20 text-warning rounded-full text-xs">
                {applications.filter(a => a.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="units">
          <div className="bg-card rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="p-4 font-semibold text-foreground">Property</th>
                <th className="p-4 font-semibold text-foreground">Unit</th>
                <th className="p-4 font-semibold text-foreground">Tenant</th>
                <th className="p-4 font-semibold text-foreground">Rent</th>
                <th className="p-4 font-semibold text-foreground">Status</th>
                <th className="p-4 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/50">
                  <td className="p-4 text-foreground">{unit.property}</td>
                  <td className="p-4 text-foreground font-medium">{unit.unit}</td>
                  <td className="p-4 text-foreground">{unit.tenant || '-'}</td>
                  <td className="p-4 text-foreground">${unit.rent}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      unit.status === 'occupied' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      {unit.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button 
                      className="text-accent hover:underline text-sm"
                      onClick={() => {
                        setSelectedUnit(unit);
                        setIsEditUnitOpen(true);
                      }}
                    >
                      Edit Unit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="applications">
          <div className="bg-card rounded-xl border border-border">
            {applicationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No applications yet</p>
                <p className="text-sm mt-2">Applications from tenants will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr className="text-left">
                      <th className="p-4 font-semibold text-foreground">Applicant</th>
                      <th className="p-4 font-semibold text-foreground">Property</th>
                      <th className="p-4 font-semibold text-foreground">Unit</th>
                      <th className="p-4 font-semibold text-foreground">Move-in Date</th>
                      <th className="p-4 font-semibold text-foreground">Status</th>
                      <th className="p-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/50">
                        <td className="p-4 text-foreground">{app.tenantName}</td>
                        <td className="p-4 text-foreground">{app.propertyName}</td>
                        <td className="p-4 text-foreground font-medium">{app.unitNumber}</td>
                        <td className="p-4 text-foreground">{app.moveInDate}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            app.status === 'pending' ? 'bg-warning/10 text-warning' :
                            app.status === 'approved' ? 'bg-success/10 text-success' :
                            'bg-destructive/10 text-destructive'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(app);
                              setIsReviewDialogOpen(true);
                            }}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default UnitManagement;
