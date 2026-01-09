import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, User, Wrench } from "lucide-react";

interface MaintenanceRequest {
  id: string;
  title: string;
  status: string;
  priority: string;
  date: string;
  lastUpdate: string;
  description?: string;
  category?: string;
  assignedTo?: string;
  estimatedCompletion?: string;
}

interface MaintenanceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest | null;
}

export const MaintenanceDetailsDialog = ({ open, onOpenChange, request }: MaintenanceDetailsDialogProps) => {
  if (!request) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success';
      case 'in_progress':
        return 'bg-info/10 text-info';
      case 'pending':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'bg-destructive/10 text-destructive';
      case 'medium':
        return 'bg-warning/10 text-warning';
      case 'low':
        return 'bg-info/10 text-info';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Maintenance Request Details</DialogTitle>
          <DialogDescription>
            Request ID: {request.id}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Status and Priority */}
          <div className="flex gap-2">
            <Badge className={getStatusColor(request.status)}>
              {request.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge className={getPriorityColor(request.priority)}>
              {request.priority.toUpperCase()} Priority
            </Badge>
          </div>

          <Separator />

          {/* Title */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{request.title}</h3>
            <p className="text-muted-foreground">{request.description || "No additional description provided."}</p>
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Submitted Date</p>
                <p className="font-medium text-foreground">{request.date}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Last Update</p>
                <p className="font-medium text-foreground">{request.lastUpdate}</p>
              </div>
            </div>

            {request.category && (
              <div className="flex items-start gap-3">
                <Wrench className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium text-foreground capitalize">{request.category}</p>
                </div>
              </div>
            )}

            {request.assignedTo && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="font-medium text-foreground">{request.assignedTo}</p>
                </div>
              </div>
            )}

            {request.estimatedCompletion && (
              <div className="flex items-start gap-3 md:col-span-2">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Completion</p>
                  <p className="font-medium text-foreground">{request.estimatedCompletion}</p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline or Updates Section */}
          <Separator />
          
          <div>
            <h4 className="font-semibold text-foreground mb-3">Request Timeline</h4>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-info mt-2" />
                <div>
                  <p className="text-sm text-foreground">Request submitted</p>
                  <p className="text-xs text-muted-foreground">{request.date}</p>
                </div>
              </div>
              {request.status !== 'pending' && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-info mt-2" />
                  <div>
                    <p className="text-sm text-foreground">{request.lastUpdate}</p>
                    <p className="text-xs text-muted-foreground">Latest update</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
