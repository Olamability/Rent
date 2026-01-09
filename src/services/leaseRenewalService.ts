/* eslint-disable @typescript-eslint/no-explicit-any */
// Service for managing lease renewals
import { supabase } from '@/lib/supabase';
import { createNotification } from './notificationService';

export interface LeaseRenewal {
  id: string;
  currentAgreementId: string;
  tenantId: string;
  landlordId: string;
  unitId: string;
  requestedStartDate: string;
  requestedEndDate: string;
  requestedRentAmount: number;
  proposedRentAmount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'completed';
  requestedAt: string;
  respondedAt?: string;
  completedAt?: string;
  newAgreementId?: string;
  tenantNotes?: string;
  landlordNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  
  // Related data
  currentAgreement?: any;
  tenant?: { name: string; email: string };
  landlord?: { name: string; email: string };
  unit?: {
    unitNumber: string;
    property?: { name: string; address: string };
  };
}

/**
 * Request a lease renewal
 */
export async function requestLeaseRenewal(data: {
  agreementId: string;
  requestedEndDate: string;
  tenantNotes?: string;
}): Promise<LeaseRenewal> {
  try {
    // Call database function to create renewal request
    const { data: renewalId, error } = await supabase.rpc('request_lease_renewal', {
      p_agreement_id: data.agreementId,
      p_requested_end_date: data.requestedEndDate,
      p_tenant_notes: data.tenantNotes || null,
    });

    if (error) {
      console.error('Error requesting lease renewal:', error);
      throw error;
    }

    // Fetch the created renewal
    const renewal = await fetchRenewalById(renewalId);
    if (!renewal) {
      throw new Error('Failed to fetch created renewal request');
    }

    // Notify landlord
    await createNotification({
      userId: renewal.landlordId,
      title: 'Lease Renewal Request',
      message: `${renewal.tenant?.name || 'A tenant'} has requested to renew their lease for ${renewal.unit?.property?.name || 'a property'} until ${new Date(renewal.requestedEndDate).toLocaleDateString()}`,
      type: 'info',
      actionUrl: '/landlord/tenancy-agreements',
    });

    // Notify tenant (confirmation)
    await createNotification({
      userId: renewal.tenantId,
      title: 'Renewal Request Submitted',
      message: `Your lease renewal request has been submitted. The landlord will review it shortly.`,
      type: 'success',
      actionUrl: '/tenant/agreements',
    });

    return renewal;
  } catch (error) {
    console.error('Failed to request lease renewal:', error);
    throw error;
  }
}

/**
 * Approve a lease renewal request
 */
export async function approveLeaseRenewal(data: {
  renewalId: string;
  proposedRentAmount?: number;
  landlordNotes?: string;
}): Promise<string> {
  try {
    // Call database function to approve renewal
    const { data: newAgreementId, error } = await supabase.rpc('approve_lease_renewal', {
      p_renewal_id: data.renewalId,
      p_proposed_rent_amount: data.proposedRentAmount || null,
      p_landlord_notes: data.landlordNotes || null,
    });

    if (error) {
      console.error('Error approving lease renewal:', error);
      throw error;
    }

    // Fetch renewal for notification
    const renewal = await fetchRenewalById(data.renewalId);
    if (renewal) {
      // Notify tenant
      await createNotification({
        userId: renewal.tenantId,
        title: 'Lease Renewal Approved! 🎉',
        message: `Your lease renewal request has been approved! ${data.proposedRentAmount ? `New rent: $${data.proposedRentAmount}/month.` : ''} Please review and sign the new agreement.`,
        type: 'success',
        actionUrl: '/tenant/agreements',
      });
    }

    return newAgreementId;
  } catch (error) {
    console.error('Failed to approve lease renewal:', error);
    throw error;
  }
}

/**
 * Reject a lease renewal request
 */
export async function rejectLeaseRenewal(data: {
  renewalId: string;
  rejectionReason?: string;
  landlordNotes?: string;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('lease_renewals')
      .update({
        renewal_status: 'rejected',
        responded_at: new Date().toISOString(),
        rejection_reason: data.rejectionReason,
        landlord_notes: data.landlordNotes,
      })
      .eq('id', data.renewalId);

    if (error) {
      console.error('Error rejecting lease renewal:', error);
      throw error;
    }

    // Fetch renewal for notification
    const renewal = await fetchRenewalById(data.renewalId);
    if (renewal) {
      // Update original agreement
      await supabase
        .from('tenancy_agreements')
        .update({ renewal_status: 'rejected' })
        .eq('id', renewal.currentAgreementId);

      // Notify tenant
      await createNotification({
        userId: renewal.tenantId,
        title: 'Lease Renewal Not Approved',
        message: `Your lease renewal request has been declined. ${data.rejectionReason ? `Reason: ${data.rejectionReason}` : 'Please contact your landlord for details.'}`,
        type: 'info',
        actionUrl: '/tenant/agreements',
      });
    }
  } catch (error) {
    console.error('Failed to reject lease renewal:', error);
    throw error;
  }
}

/**
 * Withdraw a renewal request (tenant action)
 */
export async function withdrawRenewalRequest(renewalId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('lease_renewals')
      .update({
        renewal_status: 'withdrawn',
      })
      .eq('id', renewalId);

    if (error) {
      console.error('Error withdrawing renewal request:', error);
      throw error;
    }

    // Fetch renewal for notification
    const renewal = await fetchRenewalById(renewalId);
    if (renewal) {
      // Update original agreement
      await supabase
        .from('tenancy_agreements')
        .update({ 
          renewal_requested: false,
          renewal_status: 'none' 
        })
        .eq('id', renewal.currentAgreementId);

      // Notify landlord
      await createNotification({
        userId: renewal.landlordId,
        title: 'Renewal Request Withdrawn',
        message: `${renewal.tenant?.name || 'The tenant'} has withdrawn their lease renewal request.`,
        type: 'info',
        actionUrl: '/landlord/tenancy-agreements',
      });
    }
  } catch (error) {
    console.error('Failed to withdraw renewal request:', error);
    throw error;
  }
}

/**
 * Fetch renewal requests for a tenant
 */
export async function fetchTenantRenewals(tenantId: string): Promise<LeaseRenewal[]> {
  try {
    const { data, error } = await supabase
      .from('lease_renewals')
      .select(`
        *,
        landlord:users!lease_renewals_landlord_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address)
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenant renewals:', error);
      throw error;
    }

    return (data || []).map(mapRenewalFromDb);
  } catch (error) {
    console.error('Failed to fetch tenant renewals:', error);
    throw error;
  }
}

/**
 * Fetch renewal requests for a landlord
 */
export async function fetchLandlordRenewals(landlordId: string): Promise<LeaseRenewal[]> {
  try {
    const { data, error } = await supabase
      .from('lease_renewals')
      .select(`
        *,
        tenant:users!lease_renewals_tenant_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address)
        )
      `)
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching landlord renewals:', error);
      throw error;
    }

    return (data || []).map(mapRenewalFromDb);
  } catch (error) {
    console.error('Failed to fetch landlord renewals:', error);
    throw error;
  }
}

/**
 * Fetch a single renewal by ID
 */
export async function fetchRenewalById(renewalId: string): Promise<LeaseRenewal | null> {
  try {
    const { data, error } = await supabase
      .from('lease_renewals')
      .select(`
        *,
        tenant:users!lease_renewals_tenant_id_fkey(name, email),
        landlord:users!lease_renewals_landlord_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address)
        )
      `)
      .eq('id', renewalId)
      .single();

    if (error) {
      console.error('Error fetching renewal:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapRenewalFromDb(data);
  } catch (error) {
    console.error('Failed to fetch renewal:', error);
    return null;
  }
}

/**
 * Check if a lease is eligible for renewal (within 60 days of expiry)
 */
export async function checkRenewalEligibility(agreementId: string): Promise<{
  eligible: boolean;
  daysUntilExpiry: number;
  renewalRequested: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('tenancy_agreements')
      .select('end_date, renewal_requested')
      .eq('id', agreementId)
      .single();

    if (error || !data) {
      throw new Error('Agreement not found');
    }

    const endDate = new Date(data.end_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Eligible if within 60 days of expiry and not already requested
    const eligible = daysUntilExpiry <= 60 && daysUntilExpiry > 0 && !data.renewal_requested;

    return {
      eligible,
      daysUntilExpiry,
      renewalRequested: data.renewal_requested || false,
    };
  } catch (error) {
    console.error('Failed to check renewal eligibility:', error);
    throw error;
  }
}

/**
 * Helper function to map database renewal to TypeScript type
 */
function mapRenewalFromDb(dbRenewal: any): LeaseRenewal {
  return {
    id: dbRenewal.id,
    currentAgreementId: dbRenewal.current_agreement_id,
    tenantId: dbRenewal.tenant_id,
    landlordId: dbRenewal.landlord_id,
    unitId: dbRenewal.unit_id,
    requestedStartDate: dbRenewal.requested_start_date,
    requestedEndDate: dbRenewal.requested_end_date,
    requestedRentAmount: parseFloat(dbRenewal.requested_rent_amount || 0),
    proposedRentAmount: dbRenewal.proposed_rent_amount ? parseFloat(dbRenewal.proposed_rent_amount) : undefined,
    status: dbRenewal.renewal_status,
    requestedAt: dbRenewal.requested_at,
    respondedAt: dbRenewal.responded_at,
    completedAt: dbRenewal.completed_at,
    newAgreementId: dbRenewal.new_agreement_id,
    tenantNotes: dbRenewal.tenant_notes,
    landlordNotes: dbRenewal.landlord_notes,
    rejectionReason: dbRenewal.rejection_reason,
    createdAt: dbRenewal.created_at,
    updatedAt: dbRenewal.updated_at,
    tenant: dbRenewal.tenant,
    landlord: dbRenewal.landlord,
    unit: dbRenewal.unit ? {
      unitNumber: dbRenewal.unit.unit_number,
      property: dbRenewal.unit.property,
    } : undefined,
  };
}
