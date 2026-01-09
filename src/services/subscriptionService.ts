// Service for fetching and managing subscription data
import { supabase } from '@/lib/supabase';

export interface Subscription {
  id: string;
  landlordId: string;
  landlordName?: string;
  plan: 'free' | 'pro';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate: string;
  endDate?: string;
  amount?: number;
  billingCycle?: 'monthly' | 'yearly';
  paymentMethod?: string;
  autoRenew?: boolean;
  revenue: number;
  nextBilling?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all subscriptions with pagination and filters
 */
export async function fetchSubscriptions(
  filters?: {
    plan?: string;
    status?: string;
  },
  page: number = 1,
  pageSize: number = 10
): Promise<{ subscriptions: Subscription[]; total: number }> {
  try {
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
        payment_method,
        created_at,
        updated_at,
        users!subscriptions_landlord_id_fkey (
          name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.plan && filters.plan !== 'all') {
      query = query.eq('subscription_plan', filters.plan);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('subscription_status', filters.status);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }

    const subscriptions: Subscription[] = (data || []).map((sub: unknown) => {
      // Calculate next billing date
      let nextBilling = '-';
      if (sub.subscription_status === 'active' && sub.end_date) {
        nextBilling = new Date(sub.end_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }

      // Determine if trial status
      let status = sub.subscription_status;
      if (sub.subscription_status === 'active' && sub.amount === 0 && sub.subscription_plan === 'pro') {
        const startDate = new Date(sub.start_date);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 14) { // Assume 14-day trial period
          status = 'trial';
        }
      }

      return {
        id: sub.id,
        landlordId: sub.landlord_id,
        landlordName: sub.users?.name || 'Unknown',
        plan: sub.subscription_plan,
        status,
        startDate: sub.start_date,
        endDate: sub.end_date || undefined,
        amount: sub.amount || 0,
        billingCycle: sub.billing_cycle || undefined,
        paymentMethod: sub.payment_method || undefined,
        autoRenew: sub.subscription_status === 'active',
        revenue: sub.amount || 0,
        nextBilling,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at,
      };
    });

    return {
      subscriptions,
      total: count || 0,
    };
  } catch (error) {
    console.error('Error in fetchSubscriptions:', error);
    throw error;
  }
}

/**
 * Fetch subscription statistics
 */
export async function fetchSubscriptionStats(): Promise<{
  totalRevenue: number;
  activeSubscriptions: number;
  freeUsers: number;
  proUsers: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
}> {
  try {
    // Fetch all subscriptions
    const { data: allSubs, error } = await supabase
      .from('subscriptions')
      .select('subscription_plan, subscription_status, amount, billing_cycle');

    if (error) {
      console.error('Error fetching subscription stats:', error);
      throw error;
    }

    const subs = allSubs || [];

    // Calculate statistics
    const activeSubscriptions = subs.filter(s => s.subscription_status === 'active').length;
    const freeUsers = subs.filter(s => s.subscription_plan === 'free').length;
    const proUsers = subs.filter(s => s.subscription_plan === 'pro').length;

    // Calculate revenue
    const totalRevenue = subs
      .filter(s => s.subscription_status === 'active')
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const monthlyRevenue = subs
      .filter(s => s.subscription_status === 'active' && s.billing_cycle === 'monthly')
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const yearlyRevenue = subs
      .filter(s => s.subscription_status === 'active' && s.billing_cycle === 'yearly')
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    return {
      totalRevenue,
      activeSubscriptions,
      freeUsers,
      proUsers,
      monthlyRevenue,
      yearlyRevenue,
    };
  } catch (error) {
    console.error('Error in fetchSubscriptionStats:', error);
    throw error;
  }
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: 'active' | 'cancelled' | 'expired'
): Promise<void> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        subscription_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) {
      console.error('Error updating subscription status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateSubscriptionStatus:', error);
    throw error;
  }
}

/**
 * Get subscription by landlord ID
 */
export async function getSubscriptionByLandlordId(landlordId: string): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
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
        payment_method,
        created_at,
        updated_at,
        users!subscriptions_landlord_id_fkey (
          name
        )
      `)
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      landlordId: data.landlord_id,
      landlordName: data.users?.name || 'Unknown',
      plan: data.subscription_plan,
      status: data.subscription_status,
      startDate: data.start_date,
      endDate: data.end_date || undefined,
      amount: data.amount || 0,
      billingCycle: data.billing_cycle || undefined,
      paymentMethod: data.payment_method || undefined,
      revenue: data.amount || 0,
      nextBilling: data.end_date || '-',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error in getSubscriptionByLandlordId:', error);
    throw error;
  }
}
