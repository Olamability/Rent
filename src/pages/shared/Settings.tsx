import { useState, useEffect } from "react";
import { Mail, Phone, User, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { landlordNavLinks, tenantNavLinks, adminNavLinks } from "@/config/navigation";
import { toast } from "sonner";
import { updateUserInfo } from "@/services/userService";
import { changePassword } from "@/services/securityService";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/services/notificationPreferencesService";

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [is2FADialogOpen, setIs2FADialogOpen] = useState(false);

  // Form state
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notification preferences state
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: false,
    rentReminders: true,
    maintenanceUpdates: true,
    paymentConfirmations: true,
    marketingEmails: false,
  });

  // Load notification preferences on mount
  useEffect(() => {
    if (user?.id) {
      getNotificationPreferences(user.id).then(setPreferences).catch(console.error);
    }
  }, [user?.id]);

  // Get appropriate nav links based on user role
  const getNavLinks = () => {
    if (!user) return tenantNavLinks;
    switch (user.role) {
      case 'landlord':
        return landlordNavLinks;
      case 'admin':
        return adminNavLinks;
      case 'tenant':
      default:
        return tenantNavLinks;
    }
  };

  const handleSaveChanges = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Update user info
      await updateUserInfo(user.id, { name, phone });

      // Update notification preferences
      await updateNotificationPreferences(user.id, preferences);

      // Update local user context
      updateUser({ name, phone });

      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !currentPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully!");
      setIsPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      console.error("Error changing password:", error);
      if (error.message?.includes("Invalid")) {
        toast.error("Current password is incorrect");
      } else {
        toast.error("Failed to change password. Please try again.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEnable2FA = () => {
    toast.info("Two-Factor Authentication setup will be available soon. This feature requires additional configuration.");
    setIs2FADialogOpen(false);
  };

  return (
    <DashboardLayout
      navLinks={getNavLinks()}
      userName={user?.name || "User"}
      pageTitle="Settings"
      pageDescription="Manage your account settings and preferences"
    >
      <div className="space-y-6">
        {/* Profile Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  value={name ?? ""}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  placeholder="Enter your full name"
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input value={user?.email ?? ""} className="pl-10" disabled />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <div className="relative mt-2">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  value={phone ?? ""}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Notification Preferences */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Notification Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Email Notifications</div>
                <div className="text-sm text-muted-foreground">Receive updates via email</div>
              </div>
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, emailNotifications: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">SMS Notifications</div>
                <div className="text-sm text-muted-foreground">Receive updates via SMS</div>
              </div>
              <Switch
                checked={preferences.smsNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, smsNotifications: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Push Notifications</div>
                <div className="text-sm text-muted-foreground">Receive push notifications</div>
              </div>
              <Switch
                checked={preferences.pushNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, pushNotifications: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Rent Reminders</div>
                <div className="text-sm text-muted-foreground">Get reminded about upcoming rent</div>
              </div>
              <Switch
                checked={preferences.rentReminders}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, rentReminders: checked })
                }
              />
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Security</h2>
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setIsPasswordDialogOpen(true)}
            >
              <Lock className="w-4 h-4 mr-2" />
              Change Password
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setIs2FADialogOpen(true)}
            >
              <Shield className="w-4 h-4 mr-2" />
              Enable Two-Factor Authentication
            </Button>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setName(user?.name ?? "");
              setPhone(user?.phone ?? "");
            }}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one. Password must be at least 8 characters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="mt-2"
              />
            </div>
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPasswordDialogOpen(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              disabled={isChangingPassword}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA Dialog */}
      <Dialog open={is2FADialogOpen} onOpenChange={setIs2FADialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Add an extra layer of security to your account by enabling two-factor authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication requires an authenticator app on your phone. When you sign in, you'll need to enter a code from the app in addition to your password.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIs2FADialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnable2FA}>
              Enable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Settings;
