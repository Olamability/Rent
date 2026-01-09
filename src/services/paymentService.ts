// Service for managing rent payments
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { createNotification } from './notificationService';

export interface Payment {
  id: string;
  tenantId: string;
  landlordId: string;
  unitId: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: 'pending' | 'paid' | 'failed' | 'overdue' | 'partial';
  paymentMethod?: 'card' | 'transfer' | 'ussd' | 'cash';
  transactionId?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface PaymentHistory {
  month: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Upcoming';
  method?: string;
  transactionId?: string;
  receiptUrl?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  last4: string;
  expiryMonth?: string;
  expiryYear?: string;
  isDefault: boolean;
}

/**
 * Fetch payment history for a tenant
 */
export async function fetchPaymentHistory(tenantId: string): Promise<PaymentHistory[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(payment => {
      const dueDate = new Date(payment.due_date);
      const paidDate = payment.paid_at ? new Date(payment.paid_at) : null;
      const today = new Date();
      
      // Determine status
      let status: 'Paid' | 'Pending' | 'Overdue' | 'Upcoming' = 'Pending';
      if (payment.status === 'paid') {
        status = 'Paid';
      } else if (payment.status === 'overdue' || (dueDate < today && payment.status !== 'paid')) {
        status = 'Overdue';
      } else if (dueDate > today) {
        status = 'Upcoming';
      }

      const monthYear = dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const displayDate = paidDate 
        ? paidDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      return {
        month: monthYear,
        amount: payment.amount,
        date: displayDate,
        status,
        method: payment.payment_method,
        transactionId: payment.transaction_id,
        receiptUrl: payment.receipt_url,
      };
    });
  } catch (error) {
    console.error('Failed to fetch payment history:', error);
    throw error;
  }
}

/**
 * Fetch upcoming payment for a tenant
 */
export async function fetchUpcomingPayment(tenantId: string): Promise<Payment | null> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .gte('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching upcoming payment:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      landlordId: data.landlord_id,
      unitId: data.unit_id,
      amount: data.amount,
      dueDate: data.due_date,
      paidAt: data.paid_at,
      status: data.status,
      paymentMethod: data.payment_method,
      transactionId: data.transaction_id,
      receiptUrl: data.receipt_url,
      notes: data.notes,
    };
  } catch (error) {
    console.error('Failed to fetch upcoming payment:', error);
    throw error;
  }
}

/**
 * Create a new payment record
 */
export async function createPayment(payment: {
  tenantId: string;
  landlordId: string;
  unitId: string;
  amount: number;
  dueDate: string;
  status?: 'pending' | 'paid' | 'overdue' | 'partial';
}): Promise<Payment> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        tenant_id: payment.tenantId,
        landlord_id: payment.landlordId,
        unit_id: payment.unitId,
        amount: payment.amount,
        due_date: payment.dueDate,
        status: payment.status || 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      throw error;
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      landlordId: data.landlord_id,
      unitId: data.unit_id,
      amount: data.amount,
      dueDate: data.due_date,
      paidAt: data.paid_at,
      status: data.status,
      paymentMethod: data.payment_method,
      transactionId: data.transaction_id,
      receiptUrl: data.receipt_url,
      notes: data.notes,
    };
  } catch (error) {
    console.error('Failed to create payment:', error);
    throw error;
  }
}

/**
 * Record a payment
 * @deprecated Use Paystack webhook for payment confirmation
 * Direct payment status updates are disabled for security
 * 
 * @security Payment updates must go through the paystack-webhook Edge Function
 * Frontend should use initializePayment and pollPaymentStatus from paymentServiceSecure.ts
 */
export async function recordPayment(paymentId: string, paymentData: {
  paymentMethod: 'card' | 'transfer' | 'ussd' | 'cash';
  transactionId?: string;
  receiptUrl?: string;
  notes?: string;
}): Promise<Payment> {
  throw new Error(
    'Direct payment recording is disabled for security. ' +
    'Payments are confirmed automatically via Paystack webhook. ' +
    'Use initializePayment() and pollPaymentStatus() from paymentServiceSecure.ts instead.'
  );
}

/**
 * Fetch all payments for a specific tenancy agreement
 */
export async function fetchAgreementPayments(agreementId: string): Promise<Payment[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('due_date', { ascending: false });

    if (error) {
      console.error('Error fetching agreement payments:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(payment => ({
      id: payment.id,
      tenantId: payment.tenant_id,
      landlordId: payment.landlord_id,
      unitId: payment.unit_id,
      amount: payment.amount,
      dueDate: payment.due_date,
      paidAt: payment.paid_at,
      status: payment.status,
      paymentMethod: payment.payment_method,
      transactionId: payment.transaction_id,
      receiptUrl: payment.receipt_url,
      notes: payment.notes,
    }));
  } catch (error) {
    console.error('Failed to fetch agreement payments:', error);
    throw error;
  }
}

/**
 * Get payment statistics for a tenant
 */
export async function getPaymentStatistics(tenantId: string): Promise<{
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  onTimePayments: number;
  latePayments: number;
}> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error fetching payment statistics:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return {
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        onTimePayments: 0,
        latePayments: 0,
      };
    }

    const stats = {
      totalPaid: 0,
      totalPending: 0,
      totalOverdue: 0,
      onTimePayments: 0,
      latePayments: 0,
    };

    data.forEach(payment => {
      if (payment.status === 'paid') {
        stats.totalPaid += payment.amount;
        
        // Check if payment was on time
        const dueDate = new Date(payment.due_date);
        const paidDate = payment.paid_at ? new Date(payment.paid_at) : null;
        
        if (paidDate && paidDate <= dueDate) {
          stats.onTimePayments++;
        } else if (paidDate) {
          stats.latePayments++;
        }
      } else if (payment.status === 'pending') {
        stats.totalPending += payment.amount;
      } else if (payment.status === 'overdue') {
        stats.totalOverdue += payment.amount;
      }
    });

    return stats;
  } catch (error) {
    console.error('Failed to fetch payment statistics:', error);
    throw error;
  }
}

/**
 * Fetch all payments for a landlord with tenant and unit details
 */
export async function fetchLandlordPayments(landlordId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        due_date,
        paid_at,
        status,
        payment_method,
        transaction_id,
        tenancy_agreements!inner(
          units!inner(
            unit_number
          )
        ),
        users!payments_tenant_id_fkey(name)
      `)
      .eq('landlord_id', landlordId)
      .order('due_date', { ascending: false });

    if (error) {
      console.error('Error fetching landlord payments:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch landlord payments:', error);
    throw error;
  }
}

/**
 * Get payment statistics for a landlord
 */
export async function getLandlordPaymentStatistics(landlordId: string): Promise<{
  collectedThisMonth: number;
  pending: number;
  overdue: number;
}> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('amount, status, due_date')
      .eq('landlord_id', landlordId);

    if (error) {
      console.error('Error fetching landlord payment statistics:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return {
        collectedThisMonth: 0,
        pending: 0,
        overdue: 0,
      };
    }

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const stats = {
      collectedThisMonth: 0,
      pending: 0,
      overdue: 0,
    };

    const today = new Date();

    data.forEach(payment => {
      if (payment.status === 'paid') {
        // Check if paid this month
        const dueDate = new Date(payment.due_date);
        if (dueDate >= currentMonth) {
          stats.collectedThisMonth += payment.amount;
        }
      } else if (payment.status === 'pending') {
        const dueDate = new Date(payment.due_date);
        if (dueDate > today) {
          stats.pending += payment.amount;
        }
      } else if (payment.status === 'overdue' || 
                 (payment.status === 'pending' && new Date(payment.due_date) < today)) {
        stats.overdue += payment.amount;
      }
    });

    return stats;
  } catch (error) {
    console.error('Failed to fetch landlord payment statistics:', error);
    throw error;
  }
}
