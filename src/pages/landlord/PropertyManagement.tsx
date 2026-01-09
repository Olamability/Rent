import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Home, 
  Building2, 
  Users, 
  CreditCard, 
  Wrench, 
  FileText, 
  Settings,
  BarChart3,
  Crown,
  Bell as BellIcon,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddPropertyDialog } from "@/components/landlord/AddPropertyDialog";
import { EditPropertyDialog } from "@/components/landlord/EditPropertyDialog";
import { EditUnitDialog } from "@/components/landlord/EditUnitDialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { fetchLandlordProperties, PropertyWithUnit, updateProperty, updateUnit } from "@/services/propertyService";


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

const PropertyManagement = () => {
  const navigate = useNavigate();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditUnitDialogOpen, setIsEditUnitDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithUnit | null>(null);

  const [properties, setProperties] = useState<PropertyWithUnit[]>([]);  
  const [loading, setLoading] = useState(true);

  const { user, isLoading: userLoading } = useAuth();

  
  useEffect(() => {
    const loadProperties = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const data = await fetchLandlordProperties(user.id);
        setProperties(data);
      } catch (error) {
        console.error("Failed to fetch properties:", error);
        toast.error("Failed to load properties");
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, [user?.id]);

  // Handle refresh after property is added
  const handlePropertyAdded = async () => {
    if (!user?.id) return;
    
    try {
      const data = await fetchLandlordProperties(user.id);
      setProperties(data);
    } catch (error) {
      console.error("Failed to refresh properties:", error);
    }
  };

  // Handle click on a property to view details
  const handleViewDetails = (property: PropertyWithUnit) => {
    setSelectedProperty(property);
    setIsViewDetailsOpen(true);
  };

  // Handle edit property
  const handleEditProperty = (property: PropertyWithUnit) => {
    setSelectedProperty(property);
    setIsEditDialogOpen(true);
  };

  // Handle property updated
  const handlePropertyUpdated = async () => {
    if (!user?.id) return;
    
    try {
      const data = await fetchLandlordProperties(user.id);
      setProperties(data);
    } catch (error) {
      console.error("Failed to refresh properties:", error);
    }
  };
  // Handle add property
  const handleAddProperty = () => {
    setIsAddDialogOpen(true);
  };

  return (
    <DashboardLayout
      navLinks={navLinks}
      userName={userLoading ? '' : (user?.name || '')}
      pageTitle="Property Management"
      pageDescription="Manage your properties and units"
      headerActions={
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      }
    >
      <AddPropertyDialog 
  open={isAddDialogOpen} 
  onOpenChange={setIsAddDialogOpen}
  onPropertyAdded={handlePropertyAdded}
/>

{/* Edit Property Dialog */}
<EditPropertyDialog
  open={isEditDialogOpen}
  onOpenChange={setIsEditDialogOpen}
  property={selectedProperty}
  onPropertyUpdated={handlePropertyUpdated}
/>

{/* Edit Unit Dialog */}
<EditUnitDialog
  open={isEditUnitDialogOpen}
  onOpenChange={setIsEditUnitDialogOpen}
  unit={selectedProperty ? {
    id: selectedProperty.unitId,
    unitNumber: selectedProperty.unitNumber,
    bedrooms: selectedProperty.bedrooms,
    bathrooms: selectedProperty.bathrooms,
    rentAmount: selectedProperty.rentAmount,
    squareFeet: selectedProperty.squareFeet,
    listingStatus: selectedProperty.listingStatus,
  } : null}
  onUnitUpdated={handlePropertyUpdated}
/>

{/* View Details Dialog */}
<Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Property Details</DialogTitle>
      <DialogDescription>
        View detailed information about this property
      </DialogDescription>
    </DialogHeader>
    {selectedProperty && (
      <div className="space-y-4">
        {/* Image Gallery */}
        {selectedProperty.images && selectedProperty.images.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {selectedProperty.images.map((img, idx) => (
                <img 
                  key={idx}
                  src={img} 
                  alt={`${selectedProperty.name} ${idx + 1}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        ) : (
          <div>
            <img 
              src={selectedProperty.image || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop'} 
              alt={selectedProperty.name}
              className="w-full h-64 object-cover rounded-lg"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Property Name</Label>
            <p className="text-foreground font-medium">{selectedProperty.name}</p>
          </div>
          <div>
            <Label>Address</Label>
            <p className="text-foreground font-medium">{selectedProperty.address}</p>
          </div>
          <div>
            <Label>Unit Number</Label>
            <p className="text-foreground font-medium">{selectedProperty.unitNumber}</p>
          </div>
          <div>
            <Label>Bedrooms</Label>
            <p className="text-foreground font-medium">{selectedProperty.bedrooms}</p>
          </div>
          <div>
            <Label>Bathrooms</Label>
            <p className="text-foreground font-medium">{selectedProperty.bathrooms}</p>
          </div>
          <div>
            <Label>Rent Amount</Label>
            <p className="text-foreground font-medium">{formatCurrency(selectedProperty.rentAmount)}</p>
          </div>
          {selectedProperty.description && (
            <div className="col-span-2">
              <Label>Description</Label>
              <p className="text-foreground">{selectedProperty.description}</p>
            </div>
          )}
          {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
            <div className="col-span-2">
              <Label>Amenities</Label>
              <p className="text-foreground">{selectedProperty.amenities.join(", ")}</p>
            </div>
          )}
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>

      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading properties...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <div key={`property-${property.id}-unit-${property.unitId}`} className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
              <img 
                src={property.image} 
                alt={property.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">{property.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{property.address}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{property.unitNumber}</div>
                    <div className="text-xs text-muted-foreground">Unit Number</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {property.rentAmount > 0 ? formatCurrency(property.rentAmount) : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">Rent Amount</div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(property);
                      setIsViewDetailsOpen(true);
                    }}
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(property);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    Edit Property
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(property);
                      setIsEditUnitDialogOpen(true);
                    }}
                  >
                    Edit Unit
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Add Property Card */}
          <button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-card rounded-xl border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 transition-colors flex flex-col items-center justify-center p-12 min-h-[400px]"
          >
            <Plus className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Add New Property</h3>
            <p className="text-sm text-muted-foreground">Click to create a new property</p>
          </button>
        </div>
      )}

    </DashboardLayout>
  );
};

export default PropertyManagement;
