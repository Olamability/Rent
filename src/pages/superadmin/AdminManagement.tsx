import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { UserCog, Plus, Shield, Ban, Check, X, RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { superAdminNavLinks } from "@/config/navigation";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  account_status: string;
  created_at: string;
  last_login?: string;
}

const AdminManagement = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, account_status, created_at, last_login')
        .in('role', ['admin', 'super_admin'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ account_status: 'approved' })
        .eq('id', adminId);

      if (error) throw error;
      toast.success('Admin account approved');
      fetchAdmins();
    } catch (error) {
      console.error('Error approving admin:', error);
      toast.error('Failed to approve admin');
    }
  };

  const handleSuspendAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ account_status: 'suspended' })
        .eq('id', adminId);

      if (error) throw error;
      toast.success('Admin account suspended');
      fetchAdmins();
    } catch (error) {
      console.error('Error suspending admin:', error);
      toast.error('Failed to suspend admin');
    }
  };

  const handleActivateAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ account_status: 'approved' })
        .eq('id', adminId);

      if (error) throw error;
      toast.success('Admin account activated');
      fetchAdmins();
    } catch (error) {
      console.error('Error activating admin:', error);
      toast.error('Failed to activate admin');
    }
  };

  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-success">Active</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'super_admin') {
      return <Badge variant="destructive">Super Admin</Badge>;
    }
    return <Badge variant="default">Admin</Badge>;
  };

  return (
    <DashboardLayout
      navLinks={superAdminNavLinks}
      pageTitle="Admin Management"
      pageDescription="Manage platform administrators"
    >
      {/* Header */}
      <Alert className="mb-6 border-destructive/20 bg-destructive/10">
        <Shield className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-destructive">
          <strong>Super Admin Only:</strong> You can manage all admin accounts including approval, suspension, and role assignment.
        </AlertDescription>
      </Alert>

      {/* Actions Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Admin Accounts</CardTitle>
              <CardDescription>Manage and monitor admin users</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAdmins}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/admin/verification-code')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Go to Admin Code Generation
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search admins by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Admins Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-8">
              <UserCog className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground">No admins found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.name}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>{getRoleBadge(admin.role)}</TableCell>
                      <TableCell>{getStatusBadge(admin.account_status)}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {admin.last_login
                          ? new Date(admin.last_login).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {admin.account_status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveAdmin(admin.id)}
                              title="Approve admin"
                            >
                              <Check className="w-4 h-4 text-success" />
                            </Button>
                          )}
                          {admin.account_status === 'approved' && admin.role !== 'super_admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSuspendAdmin(admin.id)}
                              title="Suspend admin"
                            >
                              <Ban className="w-4 h-4 text-warning" />
                            </Button>
                          )}
                          {admin.account_status === 'suspended' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActivateAdmin(admin.id)}
                              title="Activate admin"
                            >
                              <Check className="w-4 h-4 text-success" />
                            </Button>
                          )}
                          {admin.role === 'super_admin' && (
                            <span className="text-xs text-muted-foreground px-2">
                              Protected
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Management Guide</CardTitle>
          <CardDescription>How to manage admin accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Pending Admins:</strong> New admin accounts require your approval before they can access the platform.
            </div>
            <div>
              <strong>Suspending Admins:</strong> Suspended admins cannot log in but their account data is preserved.
            </div>
            <div>
              <strong>Super Admins:</strong> Cannot be suspended or modified. Only another super admin can manage super admin accounts.
            </div>
            <div>
              <strong>Creating New Admins:</strong> Use the "Generate Admin Code" button to create verification codes for new admin registrations.
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminManagement;
