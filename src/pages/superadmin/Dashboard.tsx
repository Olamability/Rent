import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  TrendingUp, 
  AlertCircle, 
  Activity,
  Users,
  Home,
  CreditCard,
  Headphones,
  BarChart3,
  Settings,
  FileText,
  Bell,
  Shield,
  UserCog,
  Database,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { fetchAdminDashboardData, type AdminDashboardData } from "@/services/adminDashboardService";
import { superAdminNavLinks } from "@/config/navigation";
import { PendingApprovalsCard } from "@/components/admin/PendingApprovalsCard";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data on mount
  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        setError(null);
        setLoading(true);
        const data = await fetchAdminDashboardData();
        if (isMounted) {
          setDashboardData(data);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        if (isMounted) {
          setError('Failed to load dashboard data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);
  
  const stats = dashboardData ? [
    { label: 'Total Users', value: dashboardData.stats.totalUsers.toString(), change: '+12%', color: 'text-info', bgColor: 'bg-info/10', icon: Users, trend: 'up', href: '/superadmin/users' },
    { label: 'Active Admins', value: '5', change: '+2', color: 'text-warning', bgColor: 'bg-warning/10', icon: UserCog, trend: 'up', href: '/superadmin/admin-management' },
    { label: 'Active Landlords', value: dashboardData.stats.activeLandlords.toString(), change: '+8%', color: 'text-success', bgColor: 'bg-success/10', icon: Home, trend: 'up', href: '/superadmin/users' },
    { label: 'Monthly Revenue', value: `$${dashboardData.stats.monthlyRevenue.toLocaleString()}`, change: '+23%', color: 'text-success', bgColor: 'bg-success/10', icon: CreditCard, trend: 'up', href: '/superadmin/subscriptions' },
  ] : [];

  const recentActivities = dashboardData?.recentActivities || [];
  const systemAlerts = dashboardData?.systemAlerts || [];

  const quickActions = [
    { label: 'Admin Management', icon: UserCog, href: '/superadmin/admin-management', color: 'bg-destructive/10 text-destructive' },
    { label: 'User Management', icon: Users, href: '/superadmin/users', color: 'bg-info/10 text-info' },
    { label: 'Support Tickets', icon: Headphones, href: '/superadmin/support', color: 'bg-warning/10 text-warning' },
    { label: 'Analytics', icon: BarChart3, href: '/superadmin/analytics', color: 'bg-accent/10 text-accent' },
    { label: 'Subscriptions', icon: CreditCard, href: '/superadmin/subscriptions', color: 'bg-success/10 text-success' },
    { label: 'Configuration', icon: Settings, href: '/superadmin/configuration', color: 'bg-secondary text-secondary-foreground' },
    { label: 'Database Health', icon: Database, href: '/superadmin/database-health', color: 'bg-info/10 text-info' },
    { label: 'Audit Log', icon: FileText, href: '/superadmin/audit-log', color: 'bg-info/10 text-info' },
  ];

  const systemHealth = [
    { name: 'System Uptime', value: 99.9, color: 'bg-success', target: 99 },
    { name: 'Active Sessions', value: 68, color: 'bg-info', target: 80 },
    { name: 'API Response Time', value: 85, color: 'bg-warning', target: 90 },
    { name: 'Database Performance', value: 92, color: 'bg-success', target: 85 },
  ];

  return (
    <DashboardLayout
      navLinks={superAdminNavLinks}
      pageTitle="Super Admin Dashboard"
      pageDescription="Platform oversight and system administration"
    >
      {/* Super Admin Badge */}
      <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-destructive" />
          <div>
            <h3 className="font-semibold text-destructive">Super Administrator Access</h3>
            <p className="text-sm text-muted-foreground">
              You have full platform access including admin management and system configuration
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : stats.length > 0 ? (
          stats.map((stat, idx) => (
            <Card 
              key={idx} 
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(stat.href)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <TrendingUp className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              <div className={`text-xs mt-2 ${stat.color} flex items-center gap-1`}>
                <span>{stat.change}</span>
                <span className="text-muted-foreground">from last month</span>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">No statistics available</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Super Admin Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {quickActions.map((action, idx) => (
            <Button
              key={idx}
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate(action.href)}
            >
              <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Pending Approvals - Super Admin can approve all user types */}
      <div className="mb-6">
        <PendingApprovalsCard onViewAll={() => navigate('/superadmin/users?status=pending')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Platform Activity
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/superadmin/audit-log')}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, idx) => {
                const iconMap: Record<string, typeof Users> = {
                  user: Users,
                  ticket: Headphones,
                  subscription: CreditCard,
                  security: Shield,
                  config: Settings,
                };
                const colorMap: Record<string, string> = {
                  user: 'text-info',
                  ticket: 'text-warning',
                  subscription: 'text-success',
                  security: 'text-destructive',
                  config: 'text-muted-foreground',
                };
                const ActivityIcon = iconMap[activity.type] || Activity;
                const color = colorMap[activity.type] || 'text-muted-foreground';
                
                return (
                  <div key={idx} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0`}>
                      <ActivityIcon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{activity.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recent activities</p>
              </div>
            )}
          </div>
        </Card>

        {/* Platform Health */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5" />
              System Health
            </h3>
          </div>
          <div className="space-y-4">
            {systemHealth.map((metric, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{metric.name}</span>
                  <span className="text-foreground font-medium">{metric.value}%</span>
                </div>
                <Progress value={metric.value} className="h-2" />
                {metric.value < metric.target && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 text-warning" />
                    <span className="text-xs text-warning">Below target ({metric.target}%)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alerts & Notifications */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          System Alerts
        </h3>
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
            </div>
          ) : systemAlerts.length > 0 ? (
            systemAlerts.map((alert, idx) => {
              const bgColorClass = 
                alert.type === 'warning' ? 'bg-warning/10 border-warning/20' :
                alert.type === 'error' ? 'bg-destructive/10 border-destructive/20' :
                'bg-info/10 border-info/20';
              
              const IconComponent = 
                alert.type === 'warning' ? AlertCircle :
                alert.type === 'error' ? AlertCircle :
                Activity;
              
              const iconColorClass = 
                alert.type === 'warning' ? 'text-warning' :
                alert.type === 'error' ? 'text-destructive' :
                'text-info';
              
              return (
                <div key={idx} className={`p-4 ${bgColorClass} border rounded-md`}>
                  <div className="flex items-start gap-3">
                    <IconComponent className={`w-5 h-5 ${iconColorClass} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-foreground mb-1">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      {alert.actionLabel && alert.actionHref && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 h-auto mt-2" 
                          onClick={() => navigate(alert.actionHref!)}
                        >
                          {alert.actionLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground">No system alerts at this time</p>
              <p className="text-xs text-muted-foreground mt-1">All systems are running smoothly</p>
            </div>
          )}
        </div>
      </Card>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
