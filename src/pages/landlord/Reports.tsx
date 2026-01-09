/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Home, Building2, Users, CreditCard, Wrench, FileText, Settings,
  BarChart3, Crown, Bell as BellIcon, DollarSign
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { landlordNavLinks } from "@/config/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { 
  fetchLandlordReportStats, 
  fetchMonthlyRentCollection, 
  fetchOccupancyTrend,
  type LandlordReportStats
} from "@/services/reportService";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Reports = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<LandlordReportStats | null>(null);
  const [rentCollectionData, setRentCollectionData] = useState<any[]>([]);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadReportData = async () => {
      if (!user?.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        setError(null);
        setLoading(true);

        // Fetch all report data in parallel
        const [statsData, rentData, occupancyTrendData] = await Promise.all([
          fetchLandlordReportStats(user.id),
          fetchMonthlyRentCollection(user.id, 6),
          fetchOccupancyTrend(user.id, 6),
        ]);

        if (isMounted) {
          setStats(statsData);
          setRentCollectionData(rentData);
          setOccupancyData(occupancyTrendData);
        }
      } catch (err) {
        console.error('Failed to load report data:', err);
        if (isMounted) {
          setError('Failed to load report data. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReportData();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return (
    <DashboardLayout
      navLinks={landlordNavLinks}
      userName={user?.name || "User"}
      pageTitle="Reports & Analytics"
      pageDescription="View detailed reports and insights"
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
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card className="p-6">
              <div className="text-3xl font-bold text-foreground">
                ${stats?.yearToDateRevenue?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Total Revenue (YTD)</div>
              <div className={`text-xs mt-2 ${stats?.revenueChange?.startsWith('-') ? 'text-destructive' : 'text-success'}`}>
                {stats?.revenueChange || '+0%'} from last month
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-3xl font-bold text-foreground">{stats?.avgOccupancyRate || 0}%</div>
              <div className="text-sm text-muted-foreground mt-1">Avg Occupancy Rate</div>
              <div className={`text-xs mt-2 ${stats?.occupancyChange?.startsWith('-') ? 'text-destructive' : 'text-success'}`}>
                {stats?.occupancyChange || '+0%'} from last month
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-3xl font-bold text-foreground">{stats?.activeLeases || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Active Leases</div>
              <div className="text-xs text-success mt-2">{stats?.leasesChange || '+0'} new this month</div>
            </Card>
            <Card className="p-6">
              <div className="text-3xl font-bold text-foreground">{stats?.openRequests || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Open Requests</div>
              <div className={`text-xs mt-2 ${(stats?.openRequests || 0) > 0 ? 'text-warning' : 'text-success'}`}>
                {stats?.requestsChange || '0'} from last week
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Rent Collection</h3>
              {rentCollectionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={256}>
                  <LineChart data={rentCollectionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#f3f4f6' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="collected" stroke="#10b981" name="Collected" strokeWidth={2} />
                    <Line type="monotone" dataKey="expected" stroke="#3b82f6" name="Expected" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No rent collection data available
                </div>
              )}
            </Card>
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Occupancy Over Time</h3>
              {occupancyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={256}>
                  <LineChart data={occupancyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#f3f4f6' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="occupancyRate" stroke="#8b5cf6" name="Occupancy %" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No occupancy data available
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Reports;
