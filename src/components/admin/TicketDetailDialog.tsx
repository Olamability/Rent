import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SupportTicket, TicketMessage } from "@/types/admin";
import { Clock, User, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

interface TicketDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: SupportTicket | null;
  onStatusChange?: (ticketId: string, status: SupportTicket['status']) => void;
  onSendMessage?: (ticketId: string, message: string) => void;
}

export const TicketDetailDialog = ({ 
  open, 
  onOpenChange, 
  ticket,
  onStatusChange,
  onSendMessage
}: TicketDetailDialogProps) => {
  const [message, setMessage] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<SupportTicket['status']>(ticket?.status || 'open');

  if (!ticket) return null;

  const handleSendMessage = () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    
    onSendMessage?.(ticket.id, message);
    setMessage("");
    toast.success("Message sent successfully");
  };

  const handleStatusChange = (newStatus: SupportTicket['status']) => {
    setSelectedStatus(newStatus);
    onStatusChange?.(ticket.id, newStatus);
    toast.success(`Ticket status updated to ${newStatus}`);
  };

  const priorityColors = {
    low: 'bg-secondary text-secondary-foreground',
    medium: 'bg-warning/10 text-warning',
    high: 'bg-destructive/10 text-destructive',
    urgent: 'bg-destructive text-white',
  };

  const statusColors = {
    open: 'bg-secondary text-secondary-foreground',
    in_progress: 'bg-info/10 text-info',
    resolved: 'bg-success/10 text-success',
    closed: 'bg-muted text-muted-foreground',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">Ticket #{ticket.id}</span>
              <Badge className={priorityColors[ticket.priority]}>
                {ticket.priority}
              </Badge>
              <Badge className={statusColors[selectedStatus]}>
                {selectedStatus.replace('_', ' ')}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Ticket Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Subject:</span>
              <div className="font-semibold text-foreground">{ticket.subject}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Category:</span>
              <div className="text-foreground capitalize">{ticket.category || 'General'}</div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">User:</span>
                <div className="text-foreground">{ticket.user}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Created:</span>
                <div className="text-foreground">{format(new Date(ticket.date), 'MMM dd, yyyy HH:mm')}</div>
              </div>
            </div>
            {ticket.assignedTo && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Assigned to:</span>
                <div className="text-foreground">{ticket.assignedTo}</div>
              </div>
            )}
          </div>

          <Separator />

          {/* Description */}
          {ticket.description && (
            <>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                <div className="p-4 bg-secondary/30 rounded-md text-sm text-foreground whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Conversation History */}
          {ticket.messages && ticket.messages.length > 0 && (
            <>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Conversation</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {ticket.messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`p-3 rounded-md ${msg.isInternal ? 'bg-info/5 border border-info/20' : 'bg-secondary/30'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-foreground">{msg.from}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.timestamp), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                      {msg.isInternal && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-info">
                          <AlertCircle className="w-3 h-3" />
                          Internal note
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Status Management */}
          <div>
            <Label htmlFor="status">Update Status</Label>
            <Select value={selectedStatus} onValueChange={(value) => handleStatusChange(value as SupportTicket['status'])}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reply */}
          {selectedStatus !== 'closed' && (
            <div>
              <Label htmlFor="message">Send Response</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your response to the user..."
                rows={5}
              />
              <div className="flex gap-2 mt-2">
                <Button onClick={handleSendMessage}>Send Message</Button>
                <Button variant="outline" onClick={() => handleSendMessage()}>
                  Send as Internal Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
