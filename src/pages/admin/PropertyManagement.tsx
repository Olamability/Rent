import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Plus,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  MapPin,
  Building,
  Home as HomeIcon,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PropertyDetailDialog } from "@/components/admin/PropertyDetailDialog";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  type: string;
  total_units: number;
  landlord_id: string;
  landlord_name?: string;
  landlord_email?: string;
  images?: string[];
  created_at: string;
}

// TypeScript interface for Supabase property query result
interface PropertyQueryResult {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  property_type: string;
  total_units: number;
  landlord_id: string;
  images?: string[] | null;
  created_at: string;
  landlord?: Array<{
    name?: string;
    email?: string;
  }> | {
    name?: string;
    email?: string;
  } | null;
}

const AdminPropertyManagement = () => {
  const navLinks = useAdminNavigation();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'grouped'>('all');
  const [selectedLandlord, setSelectedLandlord] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (propertyId: string) => {
    setImageErrors(prev => new Set(prev).add(propertyId));
  };

  // Fetch properties with landlord information
  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          address,
          city,
          state,
          property_type,
          total_units,
          landlord_id,
          images,
          created_at,
          landlord:users!properties_landlord_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include landlord info at root level
      const transformedData = (data || []).map((prop: PropertyQueryResult) => {
        // Handle landlord (could be array or object)
        const landlordData = Array.isArray(prop.landlord) ? prop.landlord[0] : prop.landlord;
        
        return {
          id: prop.id,
          name: prop.name,
          address: prop.address,
          city: prop.city,
          state: prop.state,
          type: prop.property_type,
          total_units: prop.total_units,
          landlord_id: prop.landlord_id,
          images: prop.images || [],
          created_at: prop.created_at,
          landlord_name: landlordData?.name || 'Unknown',
          landlord_email: landlordData?.email || '',
        };
      });

      setProperties(transformedData);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  // Filter properties based on search and type
  const filteredProperties = properties.filter((property) => {
    const matchesSearch = 
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.landlord_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === "all" || property.type === selectedType;

    return matchesSearch && matchesType;
  });

  // Group properties by landlord
  const propertiesByLandlord = filteredProperties.reduce((acc, property) => {
    const landlordId = property.landlord_id;
    if (!acc[landlordId]) {
      acc[landlordId] = {
        landlord_id: landlordId,
        landlord_name: property.landlord_name || 'Unknown',
        landlord_email: property.landlord_email || '',
        properties: [],
      };
    }
    acc[landlordId].properties.push(property);
    return acc;
  }, {} as Record<string, {
    landlord_id: string;
    landlord_name: string;
    landlord_email: string;
    properties: Property[];
  }>);

  const landlordGroups = Object.values(propertiesByLandlord);

  const propertyTypes = ["all", "apartment", "house", "condo", "townhouse"];

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    setIsDetailDialogOpen(true);
  };

  const handleViewUnits = (propertyId: string) => {
    setIsDetailDialogOpen(false);
    navigate(`/admin/units?property=${propertyId}`);
  };

  return (
    <DashboardLayout
      navLinks={navLinks}
      pageTitle="Property Management"
      pageDescription="Manage all properties across the platform"
    >
      {selectedProperty && (
        <PropertyDetailDialog
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          property={selectedProperty}
          onViewUnits={() => handleViewUnits(selectedProperty.id)}
        />
      )}
      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search properties, addresses, or landlords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-input bg-background rounded-md"
            >
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All Types" : type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setViewMode('all');
              setSelectedLandlord(null);
            }}
          >
            All Properties
          </Button>
          <Button
            variant={viewMode === 'grouped' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grouped')}
          >
            Group by Landlord
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <HomeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {properties.reduce((sum, p) => sum + p.total_units, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Landlords</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(properties.map(p => p.landlord_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Apartments</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {properties.filter(p => p.type === 'apartment').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : filteredProperties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || selectedType !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Properties will appear here once landlords add them"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grouped' ? (
        /* Grouped by Landlord View */
        <div className="space-y-6">
          {landlordGroups.map((group) => (
            <Card key={group.landlord_id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {group.landlord_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.properties.length} propert{group.properties.length > 1 ? 'ies' : 'y'} • {group.landlord_email}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedLandlord(selectedLandlord === group.landlord_id ? null : group.landlord_id);
                    }}
                  >
                    {selectedLandlord === group.landlord_id ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </CardHeader>
              {(selectedLandlord === group.landlord_id || selectedLandlord === null) && (
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.properties.map((property) => (
                      <Card key={property.id} className="overflow-hidden">
                        {property.images && property.images.length > 0 && (
                          <div className="h-40 overflow-hidden bg-secondary">
                            {imageErrors.has(property.id) ? (
                              <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground text-xs">
                                Image unavailable
                              </div>
                            ) : (
                              <img
                                src={property.images[0]}
                                alt={property.name}
                                className="w-full h-full object-cover"
                                onError={() => handleImageError(property.id)}
                              />
                            )}
                          </div>
                        )}
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{property.name}</CardTitle>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 mr-1" />
                            {property.city}, {property.state}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between text-xs mb-3">
                            <span className="text-muted-foreground">Units: {property.total_units}</span>
                            <Badge variant="secondary" className="capitalize text-xs">
                              {property.type}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleViewProperty(property)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        /* All Properties View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {property.images && property.images.length > 0 && (
                <div className="h-48 overflow-hidden bg-secondary">
                  {imageErrors.has(property.id) ? (
                    <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground">
                      Image unavailable
                    </div>
                  ) : (
                    <img
                      src={property.images[0]}
                      alt={property.name}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(property.id)}
                    />
                  )}
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{property.name}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      {property.city}, {property.state}
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {property.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{property.address}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Units</p>
                    <p className="text-lg font-semibold">{property.total_units}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Landlord</p>
                    <p className="text-sm font-medium truncate">{property.landlord_name}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewProperty(property)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewUnits(property.id)}
                  >
                    <HomeIcon className="w-4 h-4 mr-1" />
                    Units
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminPropertyManagement;
