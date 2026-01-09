import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Home, CreditCard, Wrench, FileText, Settings, Search, User, Plus, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MaintenanceRequestDialog } from "@/components/tenant/MaintenanceRequestDialog";
import { MaintenanceDetailsDialog } from "@/components/tenant/MaintenanceDetailsDialog";
import { useAuth } from "@/contexts/AuthContext";
import { tenantNavLinks } from "@/config/navigation";
import { fetchMaintenanceRequests, type MaintenanceRequest } from "@/services/maintenanceService";

const Maintenance = () => {
  const { user } = useAuth();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch maintenance requests
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
        setError(null);
        setLoading(true);
        const data = await fetchMaintenanceRequests(user.id);
        if (isMounted) {
          setRequests(data);
        }
      } catch (err) {
        console.error('Error loading maintenance requests:', err);
        if (isMounted) {
          setError('Failed to load maintenance requests. Please try again later.');
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

  const handleViewDetails = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setIsDetailsDialogOpen(true);
  };

  const handleRequestSubmitted = () => {
    // Reload requests after submission
    if (user?.id) {
      fetchMaintenanceRequests(user.id).then(setRequests);
    }
  };

  return (
    <DashboardLayout
      navLinks={tenantNavLinks}
      userName={user?.name || "User"}
      pageTitle="Maintenance Requests"
      pageDescription="Submit and track maintenance issues"
      headerActions={
        <Button onClick={() => setIsRequestDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      }
    >
      <MaintenanceRequestDialog
        open={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        onRequestSubmitted={handleRequestSubmitted}
      />

      <MaintenanceDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        request={selectedRequest}
      />
      
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      )}

      {error && !loading && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Existing Requests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Your Requests</h3>
            {requests.length > 0 ? (
              requests.map((request) => (
                <Card key={request.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-muted-foreground">#{request.id.substring(0, 8)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'completed' ? 'bg-success/10 text-success' :
                          request.status === 'in_progress' ? 'bg-info/10 text-info' :
                          request.status === 'assigned' ? 'bg-warning/10 text-warning' :
                          'bg-secondary text-secondary-foreground'
                        }`}>
                          {request.status.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.priority === 'urgent' ? 'bg-destructive/10 text-destructive' :
                          request.priority === 'high' ? 'bg-warning/10 text-warning' :
                          'bg-secondary text-secondary-foreground'
                        }`}>
                          {request.priority}
                        </span>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-1">{request.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {new Date(request.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                      {request.assignedToName && (
                        <p className="text-sm text-muted-foreground">Assigned to: {request.assignedToName}</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(request)}>View Details</Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No maintenance requests yet</p>
                <Button className="mt-4" onClick={() => setIsRequestDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Request
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Maintenance;
