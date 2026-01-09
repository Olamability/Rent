import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  User, Mail, Phone, MapPin, Briefcase, UserPlus, FileUser, Save, X as XIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tenant, TenantProfile } from "@/types";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { tenantNavLinks } from "@/config/navigation";
import { fetchTenantProfile, upsertTenantProfileWithCompletion } from "@/services/tenantProfileService";
import { updateUserInfo } from "@/services/userService";

const TenantProfile = () => {
  const { user, updateUser, getProfileCompleteness } = useAuth();
  const navigate = useNavigate();
  const tenant = user as Tenant;

  const [formData, setFormData] = useState<TenantProfile>({
    firstName: tenant?.profile?.firstName ?? "",
    lastName: tenant?.profile?.lastName ?? "",
    dateOfBirth: tenant?.profile?.dateOfBirth ?? "",
    nationalId: tenant?.profile?.nationalId ?? "",
    address: tenant?.profile?.address ?? {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    employment: tenant?.profile?.employment ?? {
      status: "employed",
      employer: "",
      position: "",
      monthlyIncome: 0,
      yearsEmployed: 0,
    },
    emergencyContact: tenant?.profile?.emergencyContact ?? {
      name: "",
      relationship: "",
      phone: "",
      email: "",
    },
    refs: tenant?.profile?.refs ?? [],
  });

  const [phone, setPhone] = useState(tenant?.phone ?? "");
  const [email, setEmail] = useState(tenant?.email ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch tenant profile from backend on mount or when user ID changes
  // This runs when component mounts or when user changes to load saved data
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
        // Fetch tenant profile
        const profile = await fetchTenantProfile(user.id);
        if (profile && isMounted) {
          setFormData(profile);
        }
      } catch (error) {
        console.error('Error loading tenant profile:', error);
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
    // Run when user.id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Separate effect to sync phone from user context
  // This ensures phone is displayed when it's updated in auth context
  useEffect(() => {
    if (user?.phone) {
      setPhone(user.phone);
    }
  }, [user?.phone]);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (parent: string, field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof TenantProfile] as Record<string, unknown>),
        [field]: value,
      },
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
      // Save tenant profile to backend database WITH completion status update
      const result = await upsertTenantProfileWithCompletion(user.id, {
        name: user.name,
        email: user.email,
        phone: phone,
      }, formData);
      
      // Save phone number to users table
      await updateUserInfo(user.id, { phone });
      
      // Update local user context with profile, completion status, and account status
      updateUser({
        phone,
        profile: result.profile,
        profileComplete: result.profileComplete,
        profileCompleteness: result.profileCompleteness,
      });

      toast.success("Profile updated successfully!");
      
      // Show message if profile is now complete
      if (result.profileComplete && result.profileCompleteness === 100) {
        setTimeout(() => {
          toast.success("✅ Profile complete! Your account is now pending approval from an administrator.");
        }, 1000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/tenant/dashboard");
  };

  // Calculate completeness dynamically based on current user state
  const completeness = user ? getProfileCompleteness() : 0;

  return (
    <DashboardLayout
      navLinks={tenantNavLinks}
      userName={user?.name || "User"}
      pageTitle="Profile"
      pageDescription="Complete your profile to access all features"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Completion Banner */}
        <ProfileCompletionBanner
          completeness={completeness}
          profileUrl="/tenant/profile"
        />

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
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  type="email"
                  disabled
                />
              </div>
            </div>
            <div>
              <Label>Phone *</Label>
              <div className="relative mt-2">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  value={phone ?? ""}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  placeholder="+1 (555) 234-5678"
                />
              </div>
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={formData.dateOfBirth ?? ""}
                onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label>National ID / SSN</Label>
              <Input
                value={formData.nationalId ?? ""}
                onChange={(e) => handleInputChange("nationalId", e.target.value)}
                className="mt-2"
                placeholder="XXX-XX-XXXX"
              />
            </div>
          </div>
        </Card>

        {/* Address */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Current Address</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Street Address</Label>
              <Input
                value={formData.address?.street ?? ""}
                onChange={(e) => handleNestedChange("address", "street", e.target.value)}
                className="mt-2"
                placeholder="123 Main Street, Apt 4B"
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={formData.address?.city ?? ""}
                onChange={(e) => handleNestedChange("address", "city", e.target.value)}
                className="mt-2"
                placeholder="San Francisco"
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                value={formData.address?.state ?? ""}
                onChange={(e) => handleNestedChange("address", "state", e.target.value)}
                className="mt-2"
                placeholder="CA"
              />
            </div>
            <div>
              <Label>ZIP Code</Label>
              <Input
                value={formData.address?.zipCode ?? ""}
                onChange={(e) => handleNestedChange("address", "zipCode", e.target.value)}
                className="mt-2"
                placeholder="94102"
              />
            </div>
            <div>
              <Label>Country</Label>
              <Input
                value={formData.address?.country ?? ""}
                onChange={(e) => handleNestedChange("address", "country", e.target.value)}
                className="mt-2"
                placeholder="United States"
              />
            </div>
          </div>
        </Card>

        {/* Employment Information */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Employment Information</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Employment Status</Label>
              <Select
                value={formData.employment?.status ?? "employed"}
                onValueChange={(value: unknown) => handleNestedChange("employment", "status", value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="self-employed">Self-Employed</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Employer</Label>
              <Input
                value={formData.employment?.employer ?? ""}
                onChange={(e) => handleNestedChange("employment", "employer", e.target.value)}
                className="mt-2"
                placeholder="Company Name"
              />
            </div>
            <div>
              <Label>Position</Label>
              <Input
                value={formData.employment?.position ?? ""}
                onChange={(e) => handleNestedChange("employment", "position", e.target.value)}
                className="mt-2"
                placeholder="Software Engineer"
              />
            </div>
            <div>
              <Label>Monthly Income</Label>
              <Input
                type="number"
                value={formData.employment?.monthlyIncome ?? ""}
                onChange={(e) => handleNestedChange("employment", "monthlyIncome", e.target.value === "" ? 0 : Number(e.target.value))}
                className="mt-2"
                placeholder="5000"
              />
            </div>
            <div>
              <Label>Years Employed</Label>
              <Input
                type="number"
                value={formData.employment?.yearsEmployed ?? ""}
                onChange={(e) => handleNestedChange("employment", "yearsEmployed", e.target.value === "" ? 0 : Number(e.target.value))}
                className="mt-2"
                placeholder="2"
              />
            </div>
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Emergency Contact</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={formData.emergencyContact?.name ?? ""}
                onChange={(e) => handleNestedChange("emergencyContact", "name", e.target.value)}
                className="mt-2"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <Label>Relationship</Label>
              <Input
                value={formData.emergencyContact?.relationship ?? ""}
                onChange={(e) => handleNestedChange("emergencyContact", "relationship", e.target.value)}
                className="mt-2"
                placeholder="Spouse, Parent, Sibling"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.emergencyContact?.phone ?? ""}
                onChange={(e) => handleNestedChange("emergencyContact", "phone", e.target.value)}
                className="mt-2"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.emergencyContact?.email ?? ""}
                onChange={(e) => handleNestedChange("emergencyContact", "email", e.target.value)}
                className="mt-2"
                placeholder="jane@example.com"
              />
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

export default TenantProfile;
