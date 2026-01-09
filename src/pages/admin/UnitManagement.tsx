import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  Search,
  Eye,
  Filter,
  Home as HomeIcon,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UnitDetailDialog } from "@/components/admin/UnitDetailDialog";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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

interface DbUnit {
  id: string;
  unit_number: string;
  property_id: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  rent_amount: number;
  available_date?: string;
  listing_status: string;
  property?: {
    name?: string;
    address?: string;
    landlord_id?: string;
    landlord?: {
      name?: string;
    };
  };
}

const AdminUnitManagement = () => {
  const navLinks = useAdminNavigation();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Fetch units with property and tenant information
  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('units')
        .select(`
          id,
          unit_number,
          property_id,
          bedrooms,
          bathrooms,
          square_feet,
          rent_amount,
          available_date,
          listing_status,
          property:properties(
            name,
            address,
            landlord_id,
            landlord:users(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const transformedData = (data || []).map((unit: DbUnit): Unit => ({
        ...unit,
        property_name: unit.property?.name || 'Unknown Property',
        property_address: unit.property?.address || '',
        landlord_name: unit.property?.landlord?.name || 'Unknown',
        tenant_name: null, // Will be populated from tenancy_agreements if needed
        is_occupied: unit.listing_status === 'rented',
        current_tenant_id: null,
      }));

      setUnits(transformedData);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error('Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  // Filter units based on search and status
  const filteredUnits = units.filter((unit) => {
    const matchesSearch =
      unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.landlord_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "occupied" && unit.is_occupied) ||
      (statusFilter === "vacant" && !unit.is_occupied);

    return matchesSearch && matchesStatus;
  });

  const occupancyRate =
    units.length > 0
      ? ((units.filter((u) => u.is_occupied).length / units.length) * 100).toFixed(1)
      : "0";

  const totalRevenue = units
    .filter((u) => u.is_occupied)
    .reduce((sum, u) => sum + u.rent_amount, 0);

  const handleViewUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsDetailDialogOpen(true);
  };

  return (
    <DashboardLayout
      navLinks={navLinks}
      pageTitle="Unit Management"
      pageDescription="Manage all units across the platform"
    >
      {selectedUnit && (
        <UnitDetailDialog
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          unit={selectedUnit}
        />
      )}
      {/* Search and Filter Section */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search units, properties, landlords, or tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-input bg-background rounded-md"
          >
            <option value="all">All Status</option>
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <HomeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{units.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {units.filter((u) => u.is_occupied).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Units Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : filteredUnits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HomeIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No units found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Units will appear here once landlords add them"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Units ({filteredUnits.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Landlord</TableHead>
                    <TableHead>Specs</TableHead>
                    <TableHead>Rent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnits.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.unit_number}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium truncate">{unit.property_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {unit.property_address}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{unit.landlord_name}</TableCell>
                      <TableCell className="text-sm">
                        {unit.bedrooms} bed, {unit.bathrooms} bath
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {unit.square_feet} sq ft
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${unit.rent_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {unit.is_occupied ? (
                          <Badge variant="default" className="bg-success">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Occupied
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="w-3 h-3 mr-1" />
                            Vacant
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {unit.tenant_name ? (
                          <span className="text-sm">{unit.tenant_name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUnit(unit)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default AdminUnitManagement;
