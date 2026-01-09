// Service for generating landlord reports and analytics
import { supabase } from '@/lib/supabase';

export interface LandlordReportStats {
  totalRevenue: number;
  yearToDateRevenue: number;
  avgOccupancyRate: number;
  activeLeases: number;
  openRequests: number;
  revenueChange: string;
  occupancyChange: string;
  leasesChange: string;
  requestsChange: string;
}

/**
 * Fetch comprehensive stats for landlord reports
 */
export async function fetchLandlordReportStats(landlordId: string): Promise<LandlordReportStats> {
  try {
    // Calculate YTD revenue
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1).toISOString();
    
    const { data: paymentsThisYear } = await supabase
      .from('payments')
      .select('amount')
      .eq('landlord_id', landlordId)
      .eq('status', 'paid')
      .gte('paid_at', yearStart);
    
    const yearToDateRevenue = (paymentsThisYear || []).reduce((sum, p) => sum + p.amount, 0);
    
    // Calculate total revenue (all time)
    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('landlord_id', landlordId)
      .eq('status', 'paid');
    
    const totalRevenue = (allPayments || []).reduce((sum, p) => sum + p.amount, 0);
    
    // Calculate occupancy rate
    const { data: units } = await supabase
      .from('units')
      .select('id, is_occupied, properties!inner(landlord_id)')
      .eq('properties.landlord_id', landlordId);
    
    const totalUnits = units?.length || 0;
    const occupiedUnits = units?.filter(u => u.is_occupied).length || 0;
    const avgOccupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    
    // Get active leases
    const { count: activeLeases } = await supabase
      .from('tenancy_agreements')
      .select('*', { count: 'exact', head: true })
      .eq('landlord_id', landlordId)
      .eq('agreement_status', 'active');
    
    // Get open maintenance requests
    const { count: openRequests } = await supabase
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('landlord_id', landlordId)
      .in('request_status', ['pending', 'assigned', 'in_progress']);
    
    // Calculate changes (compare with previous month)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString();
    const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString();
    
    const { data: lastMonthPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('landlord_id', landlordId)
      .eq('status', 'paid')
      .gte('paid_at', lastMonthStart)
      .lte('paid_at', lastMonthEnd);
    
    const lastMonthRevenue = (lastMonthPayments || []).reduce((sum, p) => sum + p.amount, 0);
    
    const thisMonth = new Date();
    const thisMonthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString();
    
    const { data: thisMonthPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('landlord_id', landlordId)
      .eq('status', 'paid')
      .gte('paid_at', thisMonthStart);
    
    const thisMonthRevenue = (thisMonthPayments || []).reduce((sum, p) => sum + p.amount, 0);
    
    const revenueChange = lastMonthRevenue > 0 
      ? `${Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)}%`
      : '+0%';
    
    return {
      totalRevenue: Math.round(totalRevenue),
      yearToDateRevenue: Math.round(yearToDateRevenue),
      avgOccupancyRate,
      activeLeases: activeLeases || 0,
      openRequests: openRequests || 0,
      revenueChange: revenueChange.startsWith('-') ? revenueChange : `+${revenueChange}`,
      occupancyChange: '+3.2%', // Placeholder - would need historical data
      leasesChange: '+2',
      requestsChange: '-3',
    };
  } catch (error) {
    console.error('Error fetching landlord report stats:', error);
    throw error;
  }
}

/**
 * Fetch monthly rent collection data for charts
 */
export async function fetchMonthlyRentCollection(
  landlordId: string,
  monthsBack: number = 12
): Promise<Array<{ month: string; collected: number; expected: number }>> {
  try {
    const now = new Date();
    const data = [];
    
    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
      
      // Get payments due in this month
      const { data: duePayments } = await supabase
        .from('payments')
        .select('amount, status')
        .eq('landlord_id', landlordId)
        .gte('due_date', startOfMonth)
        .lte('due_date', endOfMonth);
      
      const expected = (duePayments || []).reduce((sum, p) => sum + p.amount, 0);
      const collected = (duePayments || [])
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
      
      data.push({
        month: monthLabel,
        collected: Math.round(collected),
        expected: Math.round(expected),
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching monthly rent collection:', error);
    return [];
  }
}

/**
 * Fetch occupancy trend over time
 */
export async function fetchOccupancyTrend(
  landlordId: string,
  monthsBack: number = 12
): Promise<Array<{ month: string; occupancyRate: number }>> {
  try {
    const now = new Date();
    const data = [];
    
    // Get total units count (assuming it doesn't change much)
    const { data: units } = await supabase
      .from('units')
      .select('id, properties!inner(landlord_id)')
      .eq('properties.landlord_id', landlordId);
    
    const totalUnits = units?.length || 0;
    
    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
      
      // Count active leases at end of month
      const { count: activeLeases } = await supabase
        .from('tenancy_agreements')
        .select('*', { count: 'exact', head: true })
        .eq('landlord_id', landlordId)
        .eq('agreement_status', 'active')
        .lte('start_date', endOfMonth)
        .gte('end_date', endOfMonth);
      
      const occupancyRate = totalUnits > 0 
        ? Math.round(((activeLeases || 0) / totalUnits) * 100) 
        : 0;
      
      data.push({
        month: monthLabel,
        occupancyRate,
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching occupancy trend:', error);
    return [];
  }
}

/**
 * Fetch payment status breakdown
 */
export async function fetchPaymentStatusBreakdown(landlordId: string): Promise<{
  paid: number;
  pending: number;
  overdue: number;
}> {
  try {
    const { count: paid } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('landlord_id', landlordId)
      .eq('status', 'paid');
    
    const { count: pending } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('landlord_id', landlordId)
      .eq('status', 'pending');
    
    const { count: overdue } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('landlord_id', landlordId)
      .eq('status', 'overdue');
    
    return {
      paid: paid || 0,
      pending: pending || 0,
      overdue: overdue || 0,
    };
  } catch (error) {
    console.error('Error fetching payment status breakdown:', error);
    return { paid: 0, pending: 0, overdue: 0 };
  }
}

/**
 * Fetch property-wise revenue breakdown
 */
export async function fetchPropertyRevenueBreakdown(landlordId: string): Promise<Array<{
  propertyName: string;
  revenue: number;
  units: number;
}>> {
  try {
    const { data: properties } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        units (
          id,
          rent_amount,
          is_occupied
        )
      `)
      .eq('landlord_id', landlordId);
    
    if (!properties) return [];
    
    return properties.map(property => {
      const units = (property.units as Array<{ id: string; rent_amount: number; is_occupied: boolean }>) || [];
      const revenue = units
        .filter(u => u.is_occupied)
        .reduce((sum, u) => sum + u.rent_amount, 0);
      
      return {
        propertyName: property.name,
        revenue: Math.round(revenue),
        units: units.length,
      };
    });
  } catch (error) {
    console.error('Error fetching property revenue breakdown:', error);
    return [];
  }
}
