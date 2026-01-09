import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  User, Mail, Phone, Save, X as XIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { fetchAdminProfile, upsertAdminProfile } from "@/services/adminProfileService";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";


const AdminProfile = () => {
  const navLinks = useAdminNavigation();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: user?.phone ?? "",
  });

  const [email] = useState(user?.email ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch admin profile from backend on mount
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!user?.id) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }
      
      setIsLoading(true);
      try {
        const profile = await fetchAdminProfile(user.id);
        if (profile && isMounted) {
          setFormData({
            firstName: profile.firstName ?? "",
            lastName: profile.lastName ?? "",
            phone: profile.phone ?? "",
          });
        }
      } catch (error) {
        console.error('Error loading admin profile:', error);
        // Continue with local data if backend fetch fails
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync phone from user context when it updates
  useEffect(() => {
    if (user?.phone) {
      setFormData((prev) => ({
        ...prev,
        phone: user?.phone ?? "",
      }));
    }
  }, [user?.phone]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate required fields
    if (!formData.firstName || !formData.lastName) {
      toast.error("Please fill in your first and last name");
      return;
    }

    setIsSaving(true);
    try {
      // Save to backend database
      await upsertAdminProfile(user.id, formData);
      
      // Update local user context (only update phone, admin profile is stored separately)
      updateUser({
        phone: formData.phone,
      });

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/dashboard");
  };

  return (
    <DashboardLayout
      navLinks={navLinks}
      pageTitle="Admin Profile"
      pageDescription="Manage your admin account settings"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Personal Information */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <User className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input
                value={formData.firstName ?? ""}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                className="mt-2"
                placeholder="John"
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input
                value={formData.lastName ?? ""}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                className="mt-2"
                placeholder="Doe"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  value={email ?? ""}
                  className="pl-10"
                  type="email"
                  disabled
                />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <div className="relative mt-2">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  value={formData.phone ?? ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="pl-10"
                  placeholder="+1 (555) 234-5678"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pb-6">
          <Button onClick={handleSave} className="flex-1" disabled={isSaving || isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button onClick={handleCancel} variant="outline" className="flex-1" disabled={isSaving}>
            <XIcon className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminProfile;
