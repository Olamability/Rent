import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Clock, CheckCircle, AlertCircle, XCircle, User, Home, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

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

interface MaintenanceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest | null;
  onStatusUpdate?: (requestId: string, newStatus: string) => void;
}

export const MaintenanceDetailDialog = ({ 
  open, 
  onOpenChange, 
  request,
  onStatusUpdate
}: MaintenanceDetailDialogProps) => {
  const [newStatus, setNewStatus] = useState<string>(request?.status || 'pending');

  if (!request) return null;

  const handleStatusChange = () => {
    if (onStatusUpdate && newStatus !== request.status) {
      onStatusUpdate(request.id, newStatus);
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-warning/10 text-warning flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{request.title}</div>
              <div className="text-sm text-muted-foreground">Request #{request.id.substring(0, 8)}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status and Priority Badges */}
          <div className="flex flex-wrap gap-2">
            {getStatusBadge(request.status)}
            {getPriorityBadge(request.priority)}
            <Badge variant="outline" className="capitalize">
              {request.category}
            </Badge>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{request.description}</p>
          </div>

          <Separator />

          {/* Property & Unit Information */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Location</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Home className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="font-medium text-foreground">{request.property_name}</div>
                  <div className="text-muted-foreground">Unit {request.unit_number}</div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* People Involved */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">People Involved</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Tenant: </span>
                  <span className="text-foreground font-medium">{request.tenant_name || 'Unknown'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Landlord: </span>
                  <span className="text-foreground font-medium">{request.landlord_name || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Cost Information */}
          {(request.estimated_cost || request.actual_cost) && (
            <>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Cost Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  {request.estimated_cost && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Estimated</div>
                        <div className="text-foreground font-semibold">${request.estimated_cost.toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                  {request.actual_cost && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-success" />
                      <div>
                        <div className="text-muted-foreground">Actual</div>
                        <div className="text-foreground font-semibold">${request.actual_cost.toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Request Details */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Request Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Request ID:</span>
                <div className="font-mono text-foreground text-xs">{request.id}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <div className="text-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(request.created_at), 'MMM dd, yyyy')}
                </div>
              </div>
            </div>
          </div>

          {/* Update Status */}
          {onStatusUpdate && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Update Status</h4>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onStatusUpdate && newStatus !== request.status && (
            <Button onClick={handleStatusChange}>
              Update Status
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
