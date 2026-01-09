import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReminderCreated?: () => void;
}

export const CreateReminderDialog = ({ open, onOpenChange, onReminderCreated }: CreateReminderDialogProps) => {
  const [formData, setFormData] = useState({
    type: "",
    schedule: "",
    message: "",
  });
  const [channels, setChannels] = useState({
    email: true,
    sms: false,
    push: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.schedule) {
      toast.error("Please fill in all required fields");
      return;
    }

    const selectedChannels = Object.entries(channels)
      .filter(([_, enabled]) => enabled)
      .map(([channel]) => channel);

    if (selectedChannels.length === 0) {
      toast.error("Please select at least one notification channel");
      return;
    }

    /* logged */;
    toast.success("Reminder created successfully!");
    
    // Reset form
    setFormData({
      type: "",
      schedule: "",
      message: "",
    });
    setChannels({
      email: true,
      sms: false,
      push: false,
    });
    
    onReminderCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Automated Reminder</DialogTitle>
          <DialogDescription>
            Set up an automated reminder for your tenants
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Reminder Type *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select reminder type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent_due">Rent Due</SelectItem>
                <SelectItem value="rent_overdue">Rent Overdue</SelectItem>
                <SelectItem value="lease_renewal">Lease Renewal</SelectItem>
                <SelectItem value="maintenance_update">Maintenance Update</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="schedule">Schedule *</Label>
            <Select value={formData.schedule} onValueChange={(value) => setFormData({ ...formData, schedule: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7_days_before">7 days before due date</SelectItem>
                <SelectItem value="3_days_before">3 days before due date</SelectItem>
                <SelectItem value="1_day_before">1 day before due date</SelectItem>
                <SelectItem value="on_due_date">On due date</SelectItem>
                <SelectItem value="1_day_after">1 day after due date</SelectItem>
                <SelectItem value="3_days_after">3 days after due date</SelectItem>
                <SelectItem value="on_status_change">On status change</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Add a custom message to the reminder..."
              rows={3}
            />
          </div>

          <div>
            <Label>Notification Channels *</Label>
            <div className="space-y-2 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="email" 
                  checked={channels.email}
                  onCheckedChange={(checked) => setChannels({ ...channels, email: !!checked })}
                />
                <Label htmlFor="email" className="cursor-pointer font-normal">Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sms" 
                  checked={channels.sms}
                  onCheckedChange={(checked) => setChannels({ ...channels, sms: !!checked })}
                />
                <Label htmlFor="sms" className="cursor-pointer font-normal">SMS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="push" 
                  checked={channels.push}
                  onCheckedChange={(checked) => setChannels({ ...channels, push: !!checked })}
                />
                <Label htmlFor="push" className="cursor-pointer font-normal">Push Notification</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Reminder</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
