/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Download, Calendar, TrendingUp, Users, CreditCard
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/admin/SearchBar";
import { TablePagination } from "@/components/admin/TablePagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Subscription, SubscriptionFilters } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { supabase } from "@/lib/supabase";

const SubscriptionManagement = () => {
  const navLinks = useAdminNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SubscriptionFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch subscriptions from database
  useEffect(() => {
    fetchSubscriptions();
  }, [filters]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('subscriptions')
        .select(`
          id,
          landlord_id,
          subscription_plan,
          subscription_status,
          start_date,
          end_date,
          amount,
          billing_cycle,
          created_at,
          landlord:users!subscriptions_landlord_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.plan) {
        query = query.eq('subscription_plan', filters.plan);
      }
      if (filters.status) {
        query = query.eq('subscription_status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      const transformed = (data || []).map((sub: any) => ({
        id: sub.id,
        landlordId: sub.landlord_id,
        landlord: sub.landlord?.name || 'Unknown',
        landlordEmail: sub.landlord?.email || '',
        plan: sub.subscription_plan,
        status: sub.subscription_status,
        revenue: sub.amount || 0,
        nextBilling: sub.end_date || '-',
        startDate: sub.start_date,
        autoRenew: sub.subscription_status === 'active',
        billingCycle: sub.billing_cycle,
      }));

      setAllSubscriptions(transformed);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search logic
  const filteredSubscriptions = useMemo(() => {
    let result = allSubscriptions;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(sub => 
        sub.landlord.toLowerCase().includes(query) ||
        sub.id.toLowerCase().includes(query)
      );
    }

    // Plan filter
    if (filters.plan) {
      result = result.filter(sub => sub.plan === filters.plan);
    }

    // Status filter
    if (filters.status) {
      result = result.filter(sub => sub.status === filters.status);
    }

    return result;
  }, [allSubscriptions, searchQuery, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredSubscriptions.length / pageSize);
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Calculate metrics
  const totalRevenue = filteredSubscriptions.reduce((sum, sub) => sum + sub.revenue, 0);
  const proSubscribers = filteredSubscriptions.filter(s => s.plan === 'Pro' && s.status === 'active').length;
  const freeUsers = filteredSubscriptions.filter(s => s.plan === 'Free').length;
  const trialUsers = filteredSubscriptions.filter(s => s.status === 'trial').length;

  const handleExport = async () => {
    try {
      const headers = ['Landlord', 'Plan', 'Status', 'Revenue', 'Start Date', 'Next Billing'];
      const rows = allSubscriptions.map(sub => [
        sub.landlord,
        sub.plan,
        sub.status,
        sub.revenue.toString(),
        new Date(sub.startDate).toLocaleDateString(),
        sub.nextBilling !== '-' ? new Date(sub.nextBilling).toLocaleDateString() : '-',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subscriptions-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Subscription data exported successfully");
    } catch (error) {
      console.error('Error exporting subscriptions:', error);
      toast.error("Failed to export subscriptions");
    }
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery("");
  };

  return (
    <DashboardLayout
      navLinks={navLinks}
      pageTitle="Subscription Management"
      pageDescription="Track landlord subscriptions and revenue"
    >
      {/* Header with Search and Actions */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by landlord name or ID..."
            className="flex-1 max-w-md"
          />
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-secondary/30 rounded-md">
          <Select
            value={filters.plan || 'all'}
            onValueChange={(value) => setFilters({ ...filters, plan: value === 'all' ? undefined : value as any })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="Free">Free</SelectItem>
              <SelectItem value="Pro">Pro</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value as any })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          {(filters.plan || filters.status) && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Pro Subscribers</div>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div className="text-3xl font-bold text-foreground">{proSubscribers}</div>
          <div className="text-xs text-success mt-2">+12 this month</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Free Users</div>
            <Users className="w-5 h-5 text-info" />
          </div>
          <div className="text-3xl font-bold text-foreground">{freeUsers}</div>
          <div className="text-xs text-info mt-2">34% conversion rate</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Trial Users</div>
            <Calendar className="w-5 h-5 text-warning" />
          </div>
          <div className="text-3xl font-bold text-foreground">{trialUsers}</div>
          <div className="text-xs text-muted-foreground mt-2">Active trials</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Total MRR</div>
            <CreditCard className="w-5 h-5 text-success" />
          </div>
          <div className="text-3xl font-bold text-foreground">₦{(totalRevenue / 1000).toFixed(0)}K</div>
          <div className="text-xs text-success mt-2">+18% growth</div>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="p-4 font-semibold text-foreground">Landlord</th>
                <th className="p-4 font-semibold text-foreground">Plan</th>
                <th className="p-4 font-semibold text-foreground">Status</th>
                <th className="p-4 font-semibold text-foreground">Revenue</th>
                <th className="p-4 font-semibold text-foreground">Start Date</th>
                <th className="p-4 font-semibold text-foreground">Next Billing</th>
                <th className="p-4 font-semibold text-foreground">Auto-Renew</th>
                <th className="p-4 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSubscriptions.map((sub) => (
                <tr key={sub.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/50">
                  <td className="p-4 text-foreground font-medium">{sub.landlord}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sub.plan === 'Pro' ? 'bg-accent/10 text-accent' : 
                      sub.plan === 'Enterprise' ? 'bg-info/10 text-info' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      {sub.plan}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sub.status === 'active' ? 'bg-success/10 text-success' :
                      sub.status === 'trial' ? 'bg-info/10 text-info' :
                      sub.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
                      'bg-warning/10 text-warning'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="p-4 text-foreground font-semibold">₦{sub.revenue.toLocaleString()}</td>
                  <td className="p-4 text-foreground">
                    {format(new Date(sub.startDate), 'MMM dd, yyyy')}
                  </td>
                  <td className="p-4 text-foreground">{sub.nextBilling !== '-' ? format(new Date(sub.nextBilling), 'MMM dd, yyyy') : '-'}</td>
                  <td className="p-4">
                    {sub.autoRenew ? (
                      <Badge variant="default" className="bg-success/10 text-success">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">View</Button>
                      {sub.status === 'trial' && (
                        <Button size="sm" onClick={() => toast.success("Subscription upgraded")}>
                          Upgrade
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredSubscriptions.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </Card>
    </DashboardLayout>
  );
};

export default SubscriptionManagement;
