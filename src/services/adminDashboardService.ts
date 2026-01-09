// Service for fetching admin dashboard data
import { supabase } from '@/lib/supabase';

export interface AdminDashboardData {
  stats: {
    totalUsers: number;
    activeLandlords: number;
    activeTenants: number;
    monthlyRevenue: number;
  };
  recentActivities: {
    type: string;
    message: string;
    time: string;
  }[];
  systemAlerts: {
    type: 'warning' | 'info' | 'error';
    title: string;
    message: string;
    actionLabel?: string;
    actionHref?: string;
  }[];
}

/**
 * Fetch all dashboard data for admin
 */
export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    // Fetch stats
    const stats = await fetchAdminStats();
    
    // Fetch recent activities
    const recentActivities = await fetchRecentActivities();
    
    // Fetch system alerts (real data)
    const systemAlerts = await fetchSystemAlerts();
    
    return {
      stats,
      recentActivities,
      systemAlerts,
    };
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    throw error;
  }
}

/**
 * Fetch statistics for admin dashboard
 */
async function fetchAdminStats() {
  // Fetch total users count
  const { count: totalUsers, error: usersError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  // Fetch landlords count
  const { count: activeLandlords, error: landlordsError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'landlord');
  
  // Fetch tenants count
  const { count: activeTenants, error: tenantsError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'tenant');
  
  // Fetch monthly revenue (sum of all paid payments this month)
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  
  const { data: paymentsData, error: paymentsError } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'paid')
    .gte('paid_at', currentMonth.toISOString());
  
  const monthlyRevenue = paymentsData?.reduce((sum, p) => sum + p.amount, 0) || 0;
  
  return {
    totalUsers: totalUsers || 0,
    activeLandlords: activeLandlords || 0,
    activeTenants: activeTenants || 0,
    monthlyRevenue,
  };
}

/**
 * Fetch recent activities for admin dashboard
 */
async function fetchRecentActivities() {
  // Fetch recent user registrations
  const { data: newUsers, error: usersError } = await supabase
    .from('users')
    .select('name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  // Fetch recent support tickets
  const { data: tickets, error: ticketsError } = await supabase
    .from('support_tickets')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  
  // Fetch recent subscriptions
  const { data: subscriptions, error: subsError } = await supabase
    .from('subscriptions')
    .select('landlord_id, subscription_plan, start_date, users!subscriptions_landlord_id_fkey(name)')
    .order('start_date', { ascending: false })
    .limit(3);
  
  const activities: Array<{ type: string; message: string; time: string; timestamp: Date }> = [];
  
  // Add user activities
  if (newUsers && newUsers.length > 0) {
    newUsers.forEach(user => {
      const timeAgo = getTimeAgo(new Date(user.created_at));
      activities.push({
        type: 'user',
        message: `New ${user.role} registration: ${user.name}`,
        time: timeAgo,
        timestamp: new Date(user.created_at),
      });
    });
  }
  
  // Add ticket activities
  if (tickets && tickets.length > 0) {
    tickets.forEach(ticket => {
      const timeAgo = getTimeAgo(new Date(ticket.created_at));
      activities.push({
        type: 'ticket',
        message: `Support ticket #${ticket.id.substring(0, 6)} created`,
        time: timeAgo,
        timestamp: new Date(ticket.created_at),
      });
    });
  }
  
  // Add subscription activities
  if (subscriptions && subscriptions.length > 0) {
    subscriptions.forEach(sub => {
      const timeAgo = getTimeAgo(new Date(sub.start_date));
      // Type-safe access to joined user data
      const users = sub.users as { name?: string } | null;
      const userName = users?.name || 'Unknown User';
      activities.push({
        type: 'subscription',
        message: `${sub.subscription_plan} subscription activated: ${userName}`,
        time: timeAgo,
        timestamp: new Date(sub.start_date),
      });
    });
  }
  
  // Sort by timestamp descending and return top 10
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  return activities.slice(0, 10).map(({ type, message, time }) => ({
    type,
    message,
    time,
  }));
}

/**
 * Helper function to calculate time ago
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

/**
 * Fetch system alerts from real data
 */
async function fetchSystemAlerts() {
  const alerts: Array<{
    type: 'warning' | 'info' | 'error';
    title: string;
    message: string;
    actionLabel?: string;
    actionHref?: string;
  }> = [];

  try {
    // Check for pending support tickets
    const { count: pendingTicketsCount } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    if (pendingTicketsCount && pendingTicketsCount > 0) {
      alerts.push({
        type: 'warning',
        title: `${pendingTicketsCount} Support Ticket${pendingTicketsCount > 1 ? 's' : ''} Pending`,
        message: `There ${pendingTicketsCount > 1 ? 'are' : 'is'} ${pendingTicketsCount} open support ticket${pendingTicketsCount > 1 ? 's' : ''} awaiting response from users.`,
        actionLabel: 'View Tickets',
        actionHref: '/admin/support',
      });
    }

    // Check for pending user approvals
    const { count: pendingUsersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'pending');

    if (pendingUsersCount && pendingUsersCount > 0) {
      alerts.push({
        type: 'info',
        title: `${pendingUsersCount} User${pendingUsersCount > 1 ? 's' : ''} Awaiting Approval`,
        message: `Review and approve pending user accounts to allow them to access the platform.`,
        actionLabel: 'Review Users',
        actionHref: '/admin/users',
      });
    }

    // Check for high-priority maintenance requests
    const { count: urgentMaintenanceCount } = await supabase
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('priority', 'urgent')
      .in('request_status', ['pending', 'in_progress']);

    if (urgentMaintenanceCount && urgentMaintenanceCount > 0) {
      alerts.push({
        type: 'error',
        title: `${urgentMaintenanceCount} Urgent Maintenance Request${urgentMaintenanceCount > 1 ? 's' : ''}`,
        message: `Critical maintenance issues requiring immediate attention.`,
        actionLabel: 'View Requests',
        actionHref: '/admin/maintenance',
      });
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching system alerts:', error);
    return [];
  }
}

