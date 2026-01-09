import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";

interface TicketResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    subject: string;
    user: string;
  };
  onResponseSent?: () => void;
}

export const TicketResponseDialog = ({ open, onOpenChange, ticket, onResponseSent }: TicketResponseDialogProps) => {
  const [response, setResponse] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!response.trim()) {
      toast.error("Please enter a response");
      return;
    }

    /* logged */;
    toast.success("Response sent successfully!");
    
    setResponse("");
    onResponseSent?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Respond to Support Ticket</DialogTitle>
          <DialogDescription>
            Ticket #{ticket.id} - {ticket.subject}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="response">Your Response *</Label>
            <Textarea
              id="response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your response to the user..."
              rows={6}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Send Response</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
