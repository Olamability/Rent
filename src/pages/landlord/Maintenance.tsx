import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Home, Building2, Users, CreditCard, Wrench, FileText, Settings,
  BarChart3, Crown, Bell as BellIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { fetchLandlordMaintenanceRequests, type MaintenanceRequest } from "@/services/maintenanceService";

interface MaintenanceRequestDisplay {
  id: string;
  tenant: string;
  unit: string;
  issue: string;
  priority: 'high' | 'medium' | 'low';
  status: 'in_progress' | 'completed' | 'pending';
  date: string;
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

const Maintenance = () => {
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestDisplay | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAssignWorkerOpen, setIsAssignWorkerOpen] = useState(false);
  const [requests, setRequests] = useState<MaintenanceRequestDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch maintenance requests on mount
  useEffect(() => {
    let isMounted = true;

    const loadMaintenanceRequests = async () => {
      if (!user?.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }
      
      try {
        setLoading(true);
        const data = await fetchLandlordMaintenanceRequests(user.id);
        
        if (isMounted) {
          // Transform the data to match the display format
          const displayRequests: MaintenanceRequestDisplay[] = data
            .filter(req => req.priority === 'high' || req.priority === 'medium' || req.priority === 'low')
            .map(req => ({
              id: req.id,
              tenant: 'Tenant', // Would need to fetch tenant name from users table
              unit: 'Unit', // Would need to fetch unit number from units table
              issue: req.title,
              priority: req.priority as 'high' | 'medium' | 'low',
              status: req.status as 'in_progress' | 'completed' | 'pending',
              date: new Date(req.createdAt).toISOString().split('T')[0],
            }));
          
          setRequests(displayRequests);
        }
      } catch (err) {
        console.error('Failed to load maintenance requests:', err);
        if (isMounted) {
          toast.error('Failed to load maintenance requests');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadMaintenanceRequests();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return (
    <DashboardLayout
      navLinks={navLinks}
      userName={user?.name || "User"}
      pageTitle="Maintenance Requests"
      pageDescription="Track and manage maintenance requests"
    >
      {/* View Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Maintenance Request Details</DialogTitle>
            <DialogDescription>
              View detailed information about this maintenance request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Request ID</Label>
                  <p className="text-foreground font-medium">{selectedRequest.id}</p>
                </div>
                <div>
                  <Label>Submitted Date</Label>
                  <p className="text-foreground font-medium">{selectedRequest.date}</p>
                </div>
                <div>
                  <Label>Tenant</Label>
                  <p className="text-foreground font-medium">{selectedRequest.tenant}</p>
                </div>
                <div>
                  <Label>Unit</Label>
                  <p className="text-foreground font-medium">{selectedRequest.unit}</p>
                </div>
                <div>
                  <Label>Priority</Label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedRequest.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                    selectedRequest.priority === 'medium' ? 'bg-warning/10 text-warning' :
                    'bg-secondary text-secondary-foreground'
                  }`}>
                    {selectedRequest.priority}
                  </span>
                </div>
                <div>
                  <Label>Status</Label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedRequest.status === 'completed' ? 'bg-success/10 text-success' :
                    selectedRequest.status === 'in_progress' ? 'bg-info/10 text-info' :
                    'bg-secondary text-secondary-foreground'
                  }`}>
                    {selectedRequest.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="col-span-2">
                  <Label>Issue Description</Label>
                  <p className="text-foreground font-medium">{selectedRequest.issue}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Worker Dialog */}
      <Dialog open={isAssignWorkerOpen} onOpenChange={setIsAssignWorkerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Worker</DialogTitle>
            <DialogDescription>
              Assign a maintenance worker to this request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label>Request</Label>
                <p className="text-foreground font-medium">{selectedRequest.issue}</p>
              </div>
              <div>
                <Label htmlFor="worker-name">Worker Name</Label>
                <Input id="worker-name" placeholder="Enter worker name" />
              </div>
              <div>
                <Label htmlFor="worker-phone">Worker Phone</Label>
                <Input id="worker-phone" placeholder="Enter phone number" />
              </div>
              <div>
                <Label htmlFor="scheduled-date">Scheduled Date</Label>
                <Input id="scheduled-date" type="date" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Add any additional notes..." />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsAssignWorkerOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  toast.success("Worker assigned successfully");
                  setIsAssignWorkerOpen(false);
                }}>
                  Assign Worker
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : requests.length > 0 ? (
          requests.map((request) => (
            <div key={request.id} className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-muted-foreground">{request.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                      request.priority === 'medium' ? 'bg-warning/10 text-warning' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      {request.priority} priority
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.status === 'completed' ? 'bg-success/10 text-success' :
                      request.status === 'in_progress' ? 'bg-info/10 text-info' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      {request.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{request.issue}</h3>
                  <p className="text-sm text-muted-foreground">{request.tenant} - {request.unit}</p>
                  <p className="text-xs text-muted-foreground mt-2">Submitted: {request.date}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request);
                      setIsDetailsOpen(true);
                    }}
                  >
                    View Details
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request);
                      setIsAssignWorkerOpen(true);
                    }}
                  >
                    Assign Worker
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No maintenance requests found</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Maintenance;
