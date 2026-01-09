/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Home, Users, BarChart3, Headphones, CreditCard, Settings, Download, Calendar, TrendingUp, TrendingDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from "sonner";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { fetchPlatformAnalytics, fetchKeyMetrics, type AnalyticsData } from "@/services/analyticsService";

const PlatformAnalytics = () => {
  const navLinks = useAdminNavigation();
  const [timeRange, setTimeRange] = useState("30d");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [keyMetrics, setKeyMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAnalyticsData = async () => {
      try {
        setError(null);
        setLoading(true);

        const [analytics, metrics] = await Promise.all([
          fetchPlatformAnalytics(timeRange),
          fetchKeyMetrics(),
        ]);

        if (isMounted) {
          setAnalyticsData(analytics);
          setKeyMetrics(metrics);
        }
      } catch (err) {
        console.error('Failed to load analytics data:', err);
        if (isMounted) {
          setError('Failed to load analytics data. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAnalyticsData();

    return () => {
      isMounted = false;
    };
  }, [timeRange]);

  const handleExportAnalytics = () => {
    toast.success("Analytics data exported successfully");
  };
  return (
    <DashboardLayout
      navLinks={navLinks}
      pageTitle="Platform Analytics"
      pageDescription="Detailed platform metrics and insights"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      ) : error ? (
        <Card className="p-6">
          <p className="text-destructive">{error}</p>
        </Card>
      ) : (
        <>
          {/* Header Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleExportAnalytics}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{keyMetrics?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">Platform users</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{keyMetrics?.totalProperties || 0}</div>
                <p className="text-xs text-muted-foreground">Listed properties</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Occupied Units</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {keyMetrics?.occupiedUnits || 0} / {keyMetrics?.totalUnits || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {keyMetrics?.occupancyRate || 0}% occupancy rate
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(keyMetrics?.totalRevenue || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg: ${(keyMetrics?.avgTransactionValue || 0).toLocaleString()} per transaction
                </p>
              </CardContent>
            </Card>
          </div>

          {/* User Growth Chart */}
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">User Growth Over Time</h3>
            {analyticsData?.userGrowth && analyticsData.userGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} name="Total Users" />
                  <Line type="monotone" dataKey="landlords" stroke="#10b981" strokeWidth={2} name="Landlords" />
                  <Line type="monotone" dataKey="tenants" stroke="#3b82f6" strokeWidth={2} name="Tenants" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No user growth data available
              </div>
            )}
          </Card>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Revenue & Subscriptions</h3>
              {analyticsData?.revenueData && analyticsData.revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis yAxisId="left" stroke="#9ca3af" />
                    <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#f3f4f6' }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="#10b981" name="Revenue ($)" />
                    <Bar yAxisId="right" dataKey="subscriptions" fill="#8b5cf6" name="Subscriptions" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No revenue data available
                </div>
              )}
            </Card>

            {/* User Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">User Distribution</h3>
              {analyticsData?.roleDistribution && analyticsData.roleDistribution.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">By Role</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={analyticsData.roleDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {analyticsData.roleDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">By Plan</h4>
                    {analyticsData.subscriptionDistribution && analyticsData.subscriptionDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={analyticsData.subscriptionDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {analyticsData.subscriptionDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                        No subscription data
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No distribution data available
                </div>
              )}
            </Card>
          </div>

          {/* Activity Metrics */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Activity Metrics</h3>
            {analyticsData?.activityData && analyticsData.activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Legend />
                  <Bar dataKey="logins" fill="#3b82f6" name="Logins" />
                  <Bar dataKey="tickets" fill="#f59e0b" name="Support Tickets" />
                  <Bar dataKey="transactions" fill="#10b981" name="Transactions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No activity data available
              </div>
            )}
          </Card>
        </>
      )}
    </DashboardLayout>
  );
};

export default PlatformAnalytics;
