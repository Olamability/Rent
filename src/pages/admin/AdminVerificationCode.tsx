/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Shield, Copy, RefreshCw, AlertCircle, Plus, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { superAdminNavLinks } from "@/config/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface AdminCode {
  id: string;
  code: string;
  role: string;
  created_by: string;
  used_by: string | null;
  expires_at: string;
  used_at: string | null;
  is_used: boolean;
  created_at: string;
}

const AdminVerificationCode = () => {
  const { user } = useAuth();
  const [codes, setCodes] = useState<AdminCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'super_admin'>('admin');
  const [selectedExpiry, setSelectedExpiry] = useState<string>('24 hours');

  useEffect(() => {
    fetchAdminCodes();
  }, []);

  const fetchAdminCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching admin codes:', error);
      toast.error('Failed to load admin codes');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    try {
      setIsGenerating(true);
      
      // Call the RPC function to generate a new code
      const { data, error } = await supabase.rpc('generate_admin_code', {
        p_role: selectedRole,
        p_expires_in: selectedExpiry
      });

      if (error) {
        console.error('Error generating code:', error);
        
        // Check for specific error messages
        if (error.message.includes('Only super admins')) {
          toast.error('Only super admins can generate verification codes');
        } else if (error.message.includes('Authentication required')) {
          toast.error('You must be logged in to generate codes');
        } else {
          toast.error(`Failed to generate code: ${error.message}`);
        }
        return;
      }

      if (data && data.length > 0) {
        const newCode = data[0];
        toast.success('Admin verification code generated successfully!');
        
        // Copy to clipboard
        try {
          await navigator.clipboard.writeText(newCode.code);
          toast.success('Code copied to clipboard');
        } catch {
          // Fallback for clipboard
          console.log('Generated code:', newCode.code);
        }
        
        // Refresh the codes list
        await fetchAdminCodes();
      }
    } catch (error) {
      console.error('Unexpected error generating code:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy code');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Only super admins can access this page
  if (user?.role !== 'super_admin') {
    return (
      <DashboardLayout
        navLinks={superAdminNavLinks}
        pageTitle="Admin Verification Code"
        pageDescription="Access Denied"
      >
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only super admins can access admin verification code management.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout
        navLinks={superAdminNavLinks}
        pageTitle="Admin Verification Code"
        pageDescription="Loading..."
      >
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      navLinks={superAdminNavLinks}
      pageTitle="Admin Verification Codes"
      pageDescription="Generate and manage invitation codes for admin registration"
    >
      {/* Security Warning */}
      <Alert className="mb-6 border-warning bg-warning/10">
        <AlertCircle className="h-4 w-4 text-warning" />
        <AlertDescription className="text-warning">
          <strong>Security Notice:</strong> Keep these verification codes confidential. 
          Each code is single-use and determines the role (admin or super_admin) of the registrant.
          Codes expire after the specified time period.
        </AlertDescription>
      </Alert>

      {/* Generate Code Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-accent" />
            <CardTitle>Generate New Code</CardTitle>
          </div>
          <CardDescription>
            Create a new single-use verification code for admin registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'admin' | 'super_admin')}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                The code will grant this role when used
              </p>
            </div>

            <div>
              <Label htmlFor="expiry">Expiration</Label>
              <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
                <SelectTrigger id="expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 hour">1 Hour</SelectItem>
                  <SelectItem value="6 hours">6 Hours</SelectItem>
                  <SelectItem value="24 hours">24 Hours</SelectItem>
                  <SelectItem value="7 days">7 Days</SelectItem>
                  <SelectItem value="30 days">30 Days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Code will expire after this time
              </p>
            </div>
          </div>

          <Button 
            onClick={handleGenerateCode} 
            disabled={isGenerating}
            className="w-full md:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Code'}
          </Button>
        </CardContent>
      </Card>

      {/* Codes List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generated Codes</CardTitle>
              <CardDescription>All admin verification codes and their status</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAdminCodes}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No codes generated yet. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => {
                    const expired = isExpired(code.expires_at);
                    const status = code.is_used ? 'used' : expired ? 'expired' : 'active';
                    
                    return (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono text-sm">
                          {code.code.substring(0, 8)}...{code.code.substring(code.code.length - 4)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={code.role === 'super_admin' ? 'destructive' : 'default'}>
                            {code.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {status === 'used' && (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Used
                            </Badge>
                          )}
                          {status === 'expired' && (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="w-3 h-3" />
                              Expired
                            </Badge>
                          )}
                          {status === 'active' && (
                            <Badge variant="default" className="gap-1 bg-success">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(code.expires_at)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(code.created_at)}
                        </TableCell>
                        <TableCell>
                          {status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(code.code)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>Admin registration with verification codes</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              <strong>Generate a code:</strong> Select the desired role (admin or super_admin) and expiration time, then click "Generate Code".
            </li>
            <li>
              <strong>Share securely:</strong> The code will be copied to your clipboard. Share it securely with the person who needs to register.
            </li>
            <li>
              <strong>Registration:</strong> The recipient visits <code className="mx-1 px-2 py-1 bg-secondary rounded text-xs">/admin/register</code> and enters the code.
            </li>
            <li>
              <strong>Role assignment:</strong> The code determines their role - they don't choose it. This prevents privilege escalation.
            </li>
            <li>
              <strong>Single-use:</strong> Each code can only be used once. After use, it's marked as "Used" and cannot be reused.
            </li>
            <li>
              <strong>Approval required:</strong> After registration, admin accounts require your approval before they can log in.
            </li>
          </ol>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminVerificationCode;
