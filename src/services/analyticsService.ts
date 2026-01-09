// Service for generating platform analytics from existing data
import { supabase } from '@/lib/supabase';

export interface AnalyticsData {
  userGrowth: Array<{
    month: string;
    users: number;
    landlords: number;
    tenants: number;
  }>;
  revenueData: Array<{
    month: string;
    revenue: number;
    subscriptions: number;
  }>;
  roleDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  subscriptionDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  activityData: Array<{
    day: string;
    logins: number;
    tickets: number;
    transactions: number;
  }>;
}

/**
 * Fetch analytics data for the platform
 */
export async function fetchPlatformAnalytics(timeRange: string = '30d'): Promise<AnalyticsData> {
  try {
    // Calculate date range
    const now = new Date();
    const monthsBack = timeRange === '7d' ? 1 : timeRange === '30d' ? 6 : timeRange === '90d' ? 12 : 12;
    
    // Fetch user growth data
    const userGrowth = await fetchUserGrowthData(monthsBack);
    
    // Fetch revenue data
    const revenueData = await fetchRevenueData(monthsBack);
    
    // Fetch role distribution
    const roleDistribution = await fetchRoleDistribution();
    
    // Fetch subscription distribution
    const subscriptionDistribution = await fetchSubscriptionDistribution();
    
    // Fetch activity data (last 7 days)
    const activityData = await fetchActivityData();
    
    return {
      userGrowth,
      revenueData,
      roleDistribution,
      subscriptionDistribution,
      activityData,
    };
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    throw error;
  }
}

/**
 * Fetch user growth data by month
 */
async function fetchUserGrowthData(monthsBack: number) {
  try {
    // Get current date
    const now = new Date();
    const months = [];
    
    // Generate month labels
    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
      
      // Count total users created up to this month
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .lte('created_at', endOfMonth);
      
      const { count: totalLandlords } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'landlord')
        .lte('created_at', endOfMonth);
      
      const { count: totalTenants } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'tenant')
        .lte('created_at', endOfMonth);
      
      months.push({
        month: monthLabel,
        users: totalUsers || 0,
        landlords: totalLandlords || 0,
        tenants: totalTenants || 0,
      });
    }
    
    return months;
  } catch (error) {
    console.error('Error fetching user growth data:', error);
    return [];
  }
}

/**
 * Fetch revenue data by month
 */
async function fetchRevenueData(monthsBack: number) {
  try {
    const now = new Date();
    const months = [];
    
    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
      
      // Get paid payments for this month
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'paid')
        .gte('paid_at', startOfMonth)
        .lte('paid_at', endOfMonth);
      
      const revenue = (payments || []).reduce((sum, p) => sum + p.amount, 0);
      
      // Get active subscriptions count at end of month
      const { count: subscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active')
        .lte('start_date', endOfMonth);
      
      months.push({
        month: monthLabel,
        revenue: Math.round(revenue),
        subscriptions: subscriptions || 0,
      });
    }
    
    return months;
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    return [];
  }
}

/**
 * Fetch current role distribution
 */
async function fetchRoleDistribution() {
  try {
    const { count: landlords } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'landlord');
    
    const { count: tenants } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'tenant');
    
    return [
      { name: 'Landlords', value: landlords || 0, color: '#10b981' },
      { name: 'Tenants', value: tenants || 0, color: '#3b82f6' },
    ];
  } catch (error) {
    console.error('Error fetching role distribution:', error);
    return [];
  }
}

/**
 * Fetch subscription distribution
 */
async function fetchSubscriptionDistribution() {
  try {
    const { count: free } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_plan', 'free')
      .eq('subscription_status', 'active');
    
    const { count: pro } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_plan', 'pro')
      .eq('subscription_status', 'active');
    
    return [
      { name: 'Free', value: free || 0, color: '#6b7280' },
      { name: 'Pro', value: pro || 0, color: '#8b5cf6' },
    ];
  } catch (error) {
    console.error('Error fetching subscription distribution:', error);
    return [];
  }
}

/**
 * Fetch activity data for the last 7 days
 */
async function fetchActivityData() {
  try {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activityData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();
      const dayIndex = date.getDay();
      const dayLabel = days[(dayIndex + 6) % 7]; // Adjust for Monday start
      
      // Count logins (users updated last_login)
      const { count: logins } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', startOfDay)
        .lte('last_login', endOfDay);
      
      // Count tickets created
      const { count: tickets } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);
      
      // Count payments made
      const { count: transactions } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid')
        .gte('paid_at', startOfDay)
        .lte('paid_at', endOfDay);
      
      activityData.push({
        day: dayLabel,
        logins: logins || 0,
        tickets: tickets || 0,
        transactions: transactions || 0,
      });
    }
    
    return activityData;
  } catch (error) {
    console.error('Error fetching activity data:', error);
    return [];
  }
}

/**
 * Fetch key metrics summary
 */
export async function fetchKeyMetrics(): Promise<{
  totalUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  avgTransactionValue: number;
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
}> {
  try {
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'paid');
    
    const totalRevenue = (payments || []).reduce((sum, p) => sum + p.amount, 0);
    const avgTransactionValue = payments && payments.length > 0 
      ? totalRevenue / payments.length 
      : 0;
    
    const { count: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active');
    
    const { count: totalProperties } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalUnits } = await supabase
      .from('units')
      .select('*', { count: 'exact', head: true });
    
    const { count: occupiedUnits } = await supabase
      .from('units')
      .select('*', { count: 'exact', head: true })
      .eq('is_occupied', true);
    
    const occupancyRate = totalUnits && totalUnits > 0 
      ? Math.round((occupiedUnits || 0) / totalUnits * 100) 
      : 0;
    
    return {
      totalUsers: totalUsers || 0,
      totalRevenue: Math.round(totalRevenue),
      activeSubscriptions: activeSubscriptions || 0,
      avgTransactionValue: Math.round(avgTransactionValue),
      totalProperties: totalProperties || 0,
      totalUnits: totalUnits || 0,
      occupiedUnits: occupiedUnits || 0,
      occupancyRate,
    };
  } catch (error) {
    console.error('Error fetching key metrics:', error);
    throw error;
  }
}
