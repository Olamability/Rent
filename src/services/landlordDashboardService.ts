// Service for fetching landlord dashboard data
import { supabase } from '@/lib/supabase';

export interface LandlordDashboardData {
  stats: {
    totalRevenue: number;
    occupancyRate: number;
    activeLeases: number;
    openRequests: number;
  };
  recentPayments: {
    tenant: string;
    unit: string;
    amount: string;
    date: string;
    status: 'Paid' | 'Pending';
  }[];
  properties: {
    id: string;
    name: string;
    units: number;
    occupied: number;
    revenue: string;
    image?: string;
  }[];
}

/**
 * Fetch all dashboard data for a landlord
 */
export async function fetchLandlordDashboardData(landlordId: string): Promise<LandlordDashboardData> {
  try {
    // Fetch stats
    const stats = await fetchLandlordStats(landlordId);
    
    // Fetch recent payments
    const recentPayments = await fetchRecentPayments(landlordId);
    
    // Fetch properties overview
    const properties = await fetchPropertiesOverview(landlordId);
    
    return {
      stats,
      recentPayments,
      properties,
    };
  } catch (error) {
    console.error('Error fetching landlord dashboard data:', error);
    throw error;
  }
}

/**
 * Fetch statistics for landlord dashboard
 */
async function fetchLandlordStats(landlordId: string) {
  // Fetch total revenue (sum of all paid payments this month)
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  
  const { data: paymentsData, error: paymentsError } = await supabase
    .from('payments')
    .select('amount, status')
    .eq('landlord_id', landlordId)
    .gte('paid_at', currentMonth.toISOString());
  
  const totalRevenue = paymentsData
    ?.filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0) || 0;
  
  // Fetch total units and occupied units
  const { data: unitsData, error: unitsError } = await supabase
    .from('units')
    .select('id, is_occupied, properties!inner(landlord_id)')
    .eq('properties.landlord_id', landlordId);
  
  const totalUnits = unitsData?.length || 0;
  const occupiedUnits = unitsData?.filter(u => u.is_occupied).length || 0;
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
  
  // Fetch active leases count
  const { data: leasesData, error: leasesError } = await supabase
    .from('tenancy_agreements')
    .select('id')
    .eq('landlord_id', landlordId)
    .eq('agreement_status', 'active');
  
  const activeLeases = leasesData?.length || 0;
  
  // Fetch open maintenance requests
  const { data: requestsData, error: requestsError } = await supabase
    .from('maintenance_requests')
    .select('id')
    .eq('landlord_id', landlordId)
    .in('request_status', ['pending', 'assigned', 'in_progress']);
  
  const openRequests = requestsData?.length || 0;
  
  return {
    totalRevenue,
    occupancyRate: Math.round(occupancyRate),
    activeLeases,
    openRequests,
  };
}

/**
 * Fetch recent payments for landlord
 */
async function fetchRecentPayments(landlordId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      due_date,
      paid_at,
      status,
      tenancy_agreements!inner (
        units!inner (
          unit_number
        )
      ),
      users!payments_tenant_id_fkey (
        name
      )
    `)
    .eq('landlord_id', landlordId)
    .order('due_date', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching recent payments:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    return [];
  }
  
  return data.map(payment => {
    const dateToUse = payment.paid_at || payment.due_date;
    const date = new Date(dateToUse);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Type-safe access to nested data
    const tenancyAgreements = payment.tenancy_agreements as { units?: { unit_number?: string } } | null;
    const users = payment.users as { name?: string } | null;
    
    const tenant = users?.name || 'Unknown Tenant';
    const unit = tenancyAgreements?.units?.unit_number || 'N/A';
    
    return {
      tenant,
      unit: `Unit ${unit}`,
      amount: `$${payment.amount.toLocaleString()}`,
      date: formattedDate,
      status: payment.status === 'paid' ? 'Paid' as const : 'Pending' as const,
    };
  });
}

/**
 * Fetch properties overview for landlord
 */
async function fetchPropertiesOverview(landlordId: string) {
  const { data, error } = await supabase
    .from('properties')
    .select(`
      id,
      name,
      images,
      units (
        id,
        is_occupied,
        rent_amount
      )
    `)
    .eq('landlord_id', landlordId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    return [];
  }
  
  return data.map(property => {
    // Type-safe access to units array
    const units = (property.units as Array<{ id: string; is_occupied: boolean; rent_amount: number }>) || [];
    const totalUnits = units.length;
    const occupiedUnits = units.filter(u => u.is_occupied).length;
    
    // Calculate total revenue from occupied units
    const revenue = units
      .filter(u => u.is_occupied)
      .reduce((sum, u) => sum + (u.rent_amount || 0), 0);
    
    return {
      id: property.id,
      name: property.name,
      units: totalUnits,
      occupied: occupiedUnits,
      revenue: `$${revenue.toLocaleString()}`,
      image: property.images?.[0] || undefined,
    };
  });
}
