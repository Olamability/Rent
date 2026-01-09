import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  UserCheck, 
  Clock, 
  Users,
  Home,
  Shield,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchPendingUsers, getPendingUsersStats, type PendingUser } from "@/services/userApprovalService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getRoleBadgeColor } from "@/lib/roleUtils";

interface PendingApprovalsCardProps {
  onViewAll?: () => void;
}

export const PendingApprovalsCard = ({ onViewAll }: PendingApprovalsCardProps) => {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [stats, setStats] = useState({ total: 0, tenants: 0, landlords: 0, admins: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch recent pending users (limit to 5 for dashboard card)
      const users = await fetchPendingUsers();
      const recentUsers = users.slice(0, 5);
      
      // Get stats
      const statsData = await getPendingUsersStats();
      
      setPendingUsers(recentUsers);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load pending users:', err);
      setError('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'tenant':
        return <Users className="h-4 w-4" />;
      case 'landlord':
        return <Home className="h-4 w-4" />;
      case 'admin':
      case 'super_admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigate('/admin/users?status=pending');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>User accounts awaiting approval</CardDescription>
          </div>
          {stats.total > 0 && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
              <Clock className="h-3 w-3 mr-1" />
              {stats.total} Pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        {stats.total > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {stats.tenants > 0 && (
              <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                <Users className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                <div className="text-sm font-semibold text-blue-500">{stats.tenants}</div>
                <div className="text-xs text-muted-foreground">Tenants</div>
              </div>
            )}
            {stats.landlords > 0 && (
              <div className="bg-green-500/10 rounded-lg p-2 text-center">
                <Home className="h-4 w-4 mx-auto mb-1 text-green-500" />
                <div className="text-sm font-semibold text-green-500">{stats.landlords}</div>
                <div className="text-xs text-muted-foreground">Landlords</div>
              </div>
            )}
            {stats.admins > 0 && (
              <div className="bg-purple-500/10 rounded-lg p-2 text-center">
                <Shield className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                <div className="text-sm font-semibold text-purple-500">{stats.admins}</div>
                <div className="text-xs text-muted-foreground">Admins</div>
              </div>
            )}
          </div>
        )}

        {/* Recent Pending Users */}
        {pendingUsers.length > 0 ? (
          <div className="space-y-2">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => navigate(`/admin/users?userId=${user.id}`)}
              >
                <div className="flex items-center gap-3 flex-1">
                  {getRoleIcon(user.role)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending approvals</p>
            <p className="text-xs mt-1">All users have been reviewed</p>
          </div>
        )}

        {/* View All Button */}
        {stats.total > 5 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleViewAll}
          >
            View All {stats.total} Pending Approvals
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        {stats.total > 0 && stats.total <= 5 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleViewAll}
          >
            Manage Approvals
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
