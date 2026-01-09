import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Home, Building2, Users, CreditCard, Wrench, FileText, Settings,
  BarChart3, Crown, Bell as BellIcon, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateReminderDialog } from "@/components/landlord/CreateReminderDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Reminder {
  id: string;
  type: string;
  schedule: string;
  channels: string[];
  active: boolean;
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

const AutomatedReminders = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const { user, isLoading: userLoading } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) setReminders([]);
        else setReminders((data || []).map((r: unknown) => ({
          id: r.id,
          type: r.type,
          schedule: r.schedule,
          channels: r.channels || [],
          active: r.active,
        })));
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <DashboardLayout
      navLinks={navLinks}
      userName={userLoading ? '' : (user?.name || '')}
      pageTitle="Automated Reminders"
      pageDescription="Configure automated notifications"
      headerActions={
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Reminder
        </Button>
      }
    >
      <CreateReminderDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onReminderCreated={() => {/* Reminder created */}}
      />

      {/* Edit Reminder Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
            <DialogDescription>
              Update the reminder settings
            </DialogDescription>
          </DialogHeader>
          {selectedReminder && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-type">Reminder Type</Label>
                <Input 
                  id="edit-type" 
                  defaultValue={selectedReminder.type}
                />
              </div>
              <div>
                <Label htmlFor="edit-schedule">Schedule</Label>
                <Input 
                  id="edit-schedule" 
                  defaultValue={selectedReminder.schedule}
                />
              </div>
              <div>
                <Label>Notification Channels</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="edit-email" 
                      defaultChecked={selectedReminder.channels.includes('Email')}
                    />
                    <label htmlFor="edit-email" className="text-sm">Email</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="edit-sms" 
                      defaultChecked={selectedReminder.channels.includes('SMS')}
                    />
                    <label htmlFor="edit-sms" className="text-sm">SMS</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="edit-push" 
                      defaultChecked={selectedReminder.channels.includes('Push')}
                    />
                    <label htmlFor="edit-push" className="text-sm">Push Notification</label>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="edit-active" 
                  defaultChecked={selectedReminder.active}
                />
                <label htmlFor="edit-active" className="text-sm">Active</label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  toast.success("Reminder updated successfully");
                  setIsEditDialogOpen(false);
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <div className="space-y-4">
        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : reminders.length === 0 ? (
          <div className="p-6 text-center">No reminders found.</div>
        ) : reminders.map((reminder) => (
          <Card key={reminder.id} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">{reminder.type}</h3>
                <p className="text-sm text-muted-foreground mb-2">Schedule: {reminder.schedule}</p>
                <div className="flex gap-2">
                  {reminder.channels.map((channel: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
                      {channel}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  reminder.active ? 'bg-success/10 text-success' : 'bg-secondary text-secondary-foreground'
                }`}>
                  {reminder.active ? 'Active' : 'Inactive'}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedReminder(reminder);
                    setIsEditDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default AutomatedReminders;
