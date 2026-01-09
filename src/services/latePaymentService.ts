/* eslint-disable @typescript-eslint/no-explicit-any */
// Service for managing late payments and late fees
import { supabase } from '@/lib/supabase';
import { createNotification } from './notificationService';

export interface LatePayment {
  id: string;
  paymentId: string;
  invoiceId?: string;
  tenantId: string;
  landlordId: string;
  unitId: string;
  agreementId?: string;
  originalDueDate: string;
  daysLate: number;
  lateFeeAmount: number;
  lateFeePaid: boolean;
  lateFeePaidAt?: string;
  status: 'pending' | 'paid' | 'waived' | 'in_dispute';
  waivedBy?: string;
  waivedAt?: string;
  waiverReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Related data
  tenant?: { name: string; email: string };
  landlord?: { name: string; email: string };
  unit?: {
    unitNumber: string;
    property?: { name: string; address: string };
  };
}

/**
 * Create a late payment record
 */
export async function createLatePaymentRecord(data: {
  paymentId: string;
  invoiceId?: string;
}): Promise<LatePayment> {
  try {
    // Call database function to create late payment
    const { data: latePaymentId, error } = await supabase.rpc('create_late_payment_record', {
      p_payment_id: data.paymentId,
      p_invoice_id: data.invoiceId || null,
    });

    if (error) {
      console.error('Error creating late payment record:', error);
      throw error;
    }

    // Fetch the created late payment
    const latePayment = await fetchLatePaymentById(latePaymentId);
    if (!latePayment) {
      throw new Error('Failed to fetch created late payment record');
    }

    // Notify tenant about late fee
    if (latePayment.lateFeeAmount > 0) {
      await createNotification({
        userId: latePayment.tenantId,
        title: 'Late Payment Fee Applied',
        message: `A late fee of $${latePayment.lateFeeAmount.toFixed(2)} has been applied to your payment. Your payment is ${latePayment.daysLate} days overdue.`,
        type: 'warning',
        actionUrl: '/tenant/rent',
      });
    }

    // Notify landlord
    await createNotification({
      userId: latePayment.landlordId,
      title: 'Late Payment Recorded',
      message: `${latePayment.tenant?.name || 'A tenant'} has a payment that is ${latePayment.daysLate} days overdue. Late fee: $${latePayment.lateFeeAmount.toFixed(2)}`,
      type: 'warning',
      actionUrl: '/landlord/payments',
    });

    return latePayment;
  } catch (error) {
    console.error('Failed to create late payment record:', error);
    throw error;
  }
}

/**
 * Mark late fee as paid
 */
export async function markLateFeePaid(latePaymentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('late_payments')
      .update({
        late_fee_paid: true,
        late_fee_paid_at: new Date().toISOString(),
        late_payment_status: 'paid',
      })
      .eq('id', latePaymentId);

    if (error) {
      console.error('Error marking late fee as paid:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to mark late fee as paid:', error);
    throw error;
  }
}

/**
 * Waive a late fee
 */
export async function waiveLateFee(data: {
  latePaymentId: string;
  waivedBy: string;
  waiverReason: string;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('late_payments')
      .update({
        late_payment_status: 'waived',
        waived_by: data.waivedBy,
        waived_at: new Date().toISOString(),
        waiver_reason: data.waiverReason,
      })
      .eq('id', data.latePaymentId);

    if (error) {
      console.error('Error waiving late fee:', error);
      throw error;
    }

    // Fetch late payment for notification
    const latePayment = await fetchLatePaymentById(data.latePaymentId);
    if (latePayment) {
      // Notify tenant
      await createNotification({
        userId: latePayment.tenantId,
        title: 'Late Fee Waived',
        message: `Your late fee of $${latePayment.lateFeeAmount.toFixed(2)} has been waived. ${data.waiverReason ? `Reason: ${data.waiverReason}` : ''}`,
        type: 'success',
        actionUrl: '/tenant/rent',
      });
    }
  } catch (error) {
    console.error('Failed to waive late fee:', error);
    throw error;
  }
}

/**
 * Fetch late payments for a tenant
 */
export async function fetchTenantLatePayments(tenantId: string): Promise<LatePayment[]> {
  try {
    const { data, error } = await supabase
      .from('late_payments')
      .select(`
        *,
        landlord:users!late_payments_landlord_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address)
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenant late payments:', error);
      throw error;
    }

    return (data || []).map(mapLatePaymentFromDb);
  } catch (error) {
    console.error('Failed to fetch tenant late payments:', error);
    throw error;
  }
}

/**
 * Fetch late payments for a landlord
 */
export async function fetchLandlordLatePayments(landlordId: string): Promise<LatePayment[]> {
  try {
    const { data, error } = await supabase
      .from('late_payments')
      .select(`
        *,
        tenant:users!late_payments_tenant_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address)
        )
      `)
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching landlord late payments:', error);
      throw error;
    }

    return (data || []).map(mapLatePaymentFromDb);
  } catch (error) {
    console.error('Failed to fetch landlord late payments:', error);
    throw error;
  }
}

/**
 * Fetch a single late payment by ID
 */
export async function fetchLatePaymentById(latePaymentId: string): Promise<LatePayment | null> {
  try {
    const { data, error } = await supabase
      .from('late_payments')
      .select(`
        *,
        tenant:users!late_payments_tenant_id_fkey(name, email),
        landlord:users!late_payments_landlord_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address)
        )
      `)
      .eq('id', latePaymentId)
      .single();

    if (error) {
      console.error('Error fetching late payment:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapLatePaymentFromDb(data);
  } catch (error) {
    console.error('Failed to fetch late payment:', error);
    return null;
  }
}

/**
 * Fetch unpaid late fees for a tenant
 */
export async function fetchUnpaidLateFees(tenantId: string): Promise<LatePayment[]> {
  try {
    const { data, error } = await supabase
      .from('late_payments')
      .select(`
        *,
        landlord:users!late_payments_landlord_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address)
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('late_fee_paid', false)
      .eq('late_payment_status', 'pending')
      .order('original_due_date', { ascending: true });

    if (error) {
      console.error('Error fetching unpaid late fees:', error);
      throw error;
    }

    return (data || []).map(mapLatePaymentFromDb);
  } catch (error) {
    console.error('Failed to fetch unpaid late fees:', error);
    throw error;
  }
}

/**
 * Calculate total outstanding late fees for a tenant
 */
export async function calculateOutstandingLateFees(tenantId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('late_payments')
      .select('late_fee_amount')
      .eq('tenant_id', tenantId)
      .eq('late_fee_paid', false)
      .eq('late_payment_status', 'pending');

    if (error) {
      console.error('Error calculating outstanding late fees:', error);
      throw error;
    }

    const total = (data || []).reduce((sum, item) => sum + parseFloat(item.late_fee_amount || '0'), 0);
    return total;
  } catch (error) {
    console.error('Failed to calculate outstanding late fees:', error);
    return 0;
  }
}

/**
 * Check and create late payment records for overdue payments
 */
export async function processOverduePayments(): Promise<number> {
  try {
    // This function should be called by a scheduled job
    // Fetch all overdue payments that don't have a late payment record yet
    const { data: overduePayments, error } = await supabase
      .from('payments')
      .select('id, due_date, status')
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching overdue payments:', error);
      throw error;
    }

    let processedCount = 0;

    for (const payment of overduePayments || []) {
      try {
        // Check if late payment record already exists
        const { data: existing } = await supabase
          .from('late_payments')
          .select('id')
          .eq('payment_id', payment.id)
          .maybeSingle();

        if (!existing) {
          // Create late payment record
          await createLatePaymentRecord({ paymentId: payment.id });
          processedCount++;
        }
      } catch (err) {
        console.error(`Failed to process overdue payment ${payment.id}:`, err);
        // Continue processing other payments
      }
    }

    return processedCount;
  } catch (error) {
    console.error('Failed to process overdue payments:', error);
    throw error;
  }
}

/**
 * Helper function to map database late payment to TypeScript type
 */
function mapLatePaymentFromDb(dbLatePayment: any): LatePayment {
  return {
    id: dbLatePayment.id,
    paymentId: dbLatePayment.payment_id,
    invoiceId: dbLatePayment.invoice_id,
    tenantId: dbLatePayment.tenant_id,
    landlordId: dbLatePayment.landlord_id,
    unitId: dbLatePayment.unit_id,
    agreementId: dbLatePayment.agreement_id,
    originalDueDate: dbLatePayment.original_due_date,
    daysLate: dbLatePayment.days_late,
    lateFeeAmount: parseFloat(dbLatePayment.late_fee_amount || 0),
    lateFeePaid: dbLatePayment.late_fee_paid,
    lateFeePaidAt: dbLatePayment.late_fee_paid_at,
    status: dbLatePayment.late_payment_status,
    waivedBy: dbLatePayment.waived_by,
    waivedAt: dbLatePayment.waived_at,
    waiverReason: dbLatePayment.waiver_reason,
    notes: dbLatePayment.notes,
    createdAt: dbLatePayment.created_at,
    updatedAt: dbLatePayment.updated_at,
    tenant: dbLatePayment.tenant,
    landlord: dbLatePayment.landlord,
    unit: dbLatePayment.unit ? {
      unitNumber: dbLatePayment.unit.unit_number,
      property: dbLatePayment.unit.property,
    } : undefined,
  };
}
