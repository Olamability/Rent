import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  Search,
  Eye,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
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
import { MaintenanceDetailDialog } from "@/components/admin/MaintenanceDetailDialog";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// TypeScript interface for database maintenance request record
interface MaintenanceRequestRecord {
  id: string;
  title: string;
  description: string;
  request_status: string;
  priority: string;
  category: string;
  tenant_id: string;
  landlord_id: string;
  unit_id: string;
  created_at: string;
  estimated_cost?: number;
  actual_cost?: number;
  tenant?: Array<{ name?: string }> | { name?: string } | null;
  landlord?: Array<{ name?: string }> | { name?: string } | null;
  unit?: Array<{
    unit_number?: string;
    property?: Array<{ name?: string }> | { name?: string } | null;
  }> | {
    unit_number?: string;
    property?: Array<{ name?: string }> | { name?: string } | null;
  } | null;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  tenant_id: string;
  tenant_name?: string;
  landlord_id: string;
  landlord_name?: string;
  unit_id: string;
  unit_number?: string;
  property_name?: string;
  created_at: string;
  estimated_cost?: number;
  actual_cost?: number;
}

const AdminMaintenanceManagement = () => {
  const navLinks = useAdminNavigation();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Fetch maintenance requests with related information
  useEffect(() => {
    fetchMaintenanceRequests();
  }, []);

  const fetchMaintenanceRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          id,
          title,
          description,
          request_status,
          priority,
          category,
          tenant_id,
          landlord_id,
          unit_id,
          created_at,
          estimated_cost,
          actual_cost,
          tenant:users!maintenance_requests_tenant_id_fkey(name),
          landlord:users!maintenance_requests_landlord_id_fkey(name),
          unit:units!maintenance_requests_unit_id_fkey(
            unit_number,
            property:properties!units_property_id_fkey(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const transformedData = (data || []).map((req: MaintenanceRequestRecord) => {
        // Handle tenant (could be array or object)
        const tenantData = Array.isArray(req.tenant) ? req.tenant[0] : req.tenant;
        // Handle landlord (could be array or object)
        const landlordData = Array.isArray(req.landlord) ? req.landlord[0] : req.landlord;
        // Handle unit (could be array or object)
        const unitData = Array.isArray(req.unit) ? req.unit[0] : req.unit;
        // Handle property (could be array or object)
        const propertyData = unitData?.property 
          ? (Array.isArray(unitData.property) ? unitData.property[0] : unitData.property)
          : null;

        return {
          id: req.id,
          title: req.title,
          description: req.description,
          status: req.request_status,
          priority: req.priority,
          category: req.category,
          tenant_id: req.tenant_id,
          landlord_id: req.landlord_id,
          unit_id: req.unit_id,
          created_at: req.created_at,
          estimated_cost: req.estimated_cost,
          actual_cost: req.actual_cost,
          tenant_name: tenantData?.name || 'Unknown Tenant',
          landlord_name: landlordData?.name || 'Unknown Landlord',
          unit_number: unitData?.unit_number || 'N/A',
          property_name: propertyData?.name || 'Unknown Property',
        };
      });

      setRequests(transformedData);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      toast.error('Failed to load maintenance requests');
    } finally {
      setLoading(false);
    }
  };

  // Filter requests based on search, status, and priority
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.landlord_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.property_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;

    const matchesPriority =
      priorityFilter === "all" || request.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="default" className="bg-info">
            <Wrench className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="bg-success">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      case "high":
        return <Badge variant="default" className="bg-warning">High</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    inProgress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  const handleViewRequest = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
  };

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Maintenance request status updated');
      setIsDetailDialogOpen(false);
      fetchMaintenanceRequests(); // Reload requests
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  return (
    <DashboardLayout
      navLinks={navLinks}
      pageTitle="Maintenance Management"
      pageDescription="Monitor and manage all maintenance requests"
    >
      {selectedRequest && (
        <MaintenanceDetailDialog
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          request={selectedRequest}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
      {/* Search and Filter Section */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search requests, tenants, landlords, or properties..."
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
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-input bg-background rounded-md"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Wrench className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No requests found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Maintenance requests will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Maintenance Requests ({filteredRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Property/Unit</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Landlord</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate">{request.title}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium truncate">{request.property_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Unit {request.unit_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{request.tenant_name}</TableCell>
                      <TableCell className="text-sm">{request.landlord_name}</TableCell>
                      <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                      <TableCell className="capitalize text-sm">
                        {request.category}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewRequest(request)}
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

export default AdminMaintenanceManagement;
