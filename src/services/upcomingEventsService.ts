// Service for fetching upcoming events for landlord dashboard
import { supabase } from '@/lib/supabase';

export interface UpcomingEvent {
  type: 'rent_due' | 'lease_renewal' | 'maintenance';
  title: string;
  description: string;
  date: string;
  count?: number;
  icon: string;
}

/**
 * Fetch upcoming events for landlord dashboard
 */
export async function fetchUpcomingEvents(landlordId: string): Promise<UpcomingEvent[]> {
  const events: UpcomingEvent[] = [];
  
  try {
    // Fetch upcoming rent payments (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const { data: upcomingPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, due_date, amount')
      .eq('landlord_id', landlordId)
      .eq('status', 'pending')
      .lte('due_date', thirtyDaysFromNow.toISOString())
      .order('due_date', { ascending: true });

    if (!paymentsError && upcomingPayments && upcomingPayments.length > 0) {
      // Group by due date to find the nearest date
      const nearestDueDate = upcomingPayments[0].due_date;
      const paymentsOnDate = upcomingPayments.filter(p => p.due_date === nearestDueDate);
      
      events.push({
        type: 'rent_due',
        title: 'Rent Due',
        description: `${paymentsOnDate.length} payment${paymentsOnDate.length > 1 ? 's' : ''} due`,
        date: new Date(nearestDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        count: paymentsOnDate.length,
        icon: 'rent',
      });
    }

    // Fetch upcoming lease renewals (next 60 days)
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
    
    const { data: upcomingRenewals, error: renewalsError } = await supabase
      .from('tenancy_agreements')
      .select(`
        id,
        end_date,
        units!inner(unit_number),
        users!tenancy_agreements_tenant_id_fkey(name)
      `)
      .eq('landlord_id', landlordId)
      .eq('agreement_status', 'active')
      .lte('end_date', sixtyDaysFromNow.toISOString())
      .order('end_date', { ascending: true })
      .limit(1);

    if (!renewalsError && upcomingRenewals && upcomingRenewals.length > 0) {
      const renewal = upcomingRenewals[0];
      const units = renewal.units as { unit_number?: string } | null;
      const users = renewal.users as { name?: string } | null;
      
      events.push({
        type: 'lease_renewal',
        title: 'Lease Renewal',
        description: `Unit ${units?.unit_number || 'N/A'} - ${users?.name || 'Unknown'}`,
        date: new Date(renewal.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        icon: 'lease',
      });
    }

    // Fetch scheduled maintenance (next 30 days)
    const { data: scheduledMaintenance, error: maintenanceError } = await supabase
      .from('maintenance_requests')
      .select('id, title, estimated_completion, assigned_to')
      .eq('landlord_id', landlordId)
      .in('request_status', ['assigned', 'in_progress'])
      .not('estimated_completion', 'is', null)
      .lte('estimated_completion', thirtyDaysFromNow.toISOString())
      .order('estimated_completion', { ascending: true })
      .limit(1);

    if (!maintenanceError && scheduledMaintenance && scheduledMaintenance.length > 0) {
      const maintenance = scheduledMaintenance[0];
      
      events.push({
        type: 'maintenance',
        title: 'Maintenance',
        description: maintenance.assigned_to || 'Scheduled work',
        date: new Date(maintenance.estimated_completion!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        icon: 'maintenance',
      });
    }

    return events;
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return [];
  }
}
