/**
 * Secure Payment Service
 * 
 * This service interacts with Next.js API routes for payment operations
 * instead of directly updating the database (security requirement).
 * 
 * All critical payment operations must go through server-side API routes.
 * 
 * @security Compliant with PRD/RentflowGoal.md requirements
 */

import { supabase } from '@/lib/supabase';
import { Payment, PaymentHistory } from './paymentService';

/**
 * Verify a payment with Paystack via Next.js API route
 * @security Server-side verification only
 */
export async function verifyPaymentSecure(reference: string): Promise<{
  success: boolean;
  verified: boolean;
  payment?: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    paidAt: string;
    channel: string;
    customer: {
      email: string;
    };
  };
  error?: string;
}> {
  try {
    // Get auth token for API request
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        verified: false,
        error: 'Not authenticated'
      };
    }

    // Call Next.js API route instead of edge function
    const response = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ reference }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        verified: false,
        error: data.error || 'Payment verification failed'
      };
    }

    return data;
  } catch (error) {
    console.error('Failed to verify payment:', error);
    return {
      success: false,
      verified: false,
      error: 'Failed to verify payment. Please try again.'
    };
  }
}

/**
 * Initialize payment with Paystack
 * This creates a pending payment record and returns payment reference
 * Actual payment confirmation happens via webhook
 * 
 * @security Frontend only initiates, webhook confirms
 */
export async function initializePayment(paymentData: {
  tenantId: string;
  landlordId: string;
  unitId: string;
  amount: number;
  dueDate: string;
  agreementId?: string;
}): Promise<{
  success: boolean;
  reference?: string;
  paymentId?: string;
  error?: string;
}> {
  try {
    // Generate unique payment reference
    const reference = generatePaymentReference();

    // Create payment record with pending status
    // Note: Only Edge Functions can update status to 'paid'
    const { data, error } = await supabase
      .from('payments')
      .insert({
        tenant_id: paymentData.tenantId,
        landlord_id: paymentData.landlordId,
        unit_id: paymentData.unitId,
        amount: paymentData.amount,
        due_date: paymentData.dueDate,
        status: 'pending', // ✅ Only pending allowed from frontend
        transaction_id: reference,
        agreement_id: paymentData.agreementId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment record:', error);
      return {
        success: false,
        error: 'Failed to create payment record'
      };
    }

    return {
      success: true,
      reference,
      paymentId: data.id
    };
  } catch (error) {
    console.error('Failed to initialize payment:', error);
    return {
      success: false,
      error: 'Failed to initialize payment'
    };
  }
}

/**
 * Generate unique payment reference
 */
function generatePaymentReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `RF-${timestamp}-${random}`.toUpperCase();
}

/**
 * Get payment status (read-only)
 * @security Read operations are safe
 */
export async function getPaymentStatus(paymentId: string): Promise<{
  success: boolean;
  status?: 'pending' | 'paid' | 'failed' | 'overdue';
  payment?: Payment;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) {
      console.error('Error fetching payment:', error);
      return {
        success: false,
        error: 'Failed to fetch payment status'
      };
    }

    return {
      success: true,
      status: data.status,
      payment: {
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
      }
    };
  } catch (error) {
    console.error('Failed to get payment status:', error);
    return {
      success: false,
      error: 'Failed to get payment status'
    };
  }
}

/**
 * Fetch payment history for a tenant (read-only)
 * @security Read operations are safe with RLS
 */
export async function fetchPaymentHistorySecure(tenantId: string): Promise<PaymentHistory[]> {
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
      const paidAt = payment.paid_at ? new Date(payment.paid_at) : null;
      const today = new Date();
      
      let status: 'Paid' | 'Pending' | 'Overdue' | 'Upcoming' = 'Pending';
      if (payment.status === 'paid') {
        status = 'Paid';
      } else if (payment.status === 'overdue' || (dueDate < today && payment.status !== 'paid')) {
        status = 'Overdue';
      } else if (dueDate > today) {
        status = 'Upcoming';
      }

      const monthYear = dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const displayDate = paidAt 
        ? paidAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
 * Poll payment status until confirmed or timeout
 * Used after payment initialization to wait for webhook confirmation
 */
export async function pollPaymentStatus(
  paymentId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<{
  success: boolean;
  status?: 'pending' | 'paid' | 'failed';
  error?: string;
}> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getPaymentStatus(paymentId);
    
    if (!result.success) {
      return result;
    }

    if (result.status === 'paid' || result.status === 'failed') {
      return {
        success: true,
        status: result.status
      };
    }

    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  return {
    success: false,
    error: 'Payment confirmation timeout. Please check payment status later.'
  };
}

/**
 * DEPRECATED: Direct payment recording
 * @deprecated Use webhook-based payment confirmation instead
 * @security This function is disabled for security compliance
 */
export async function recordPaymentDirect(): Promise<never> {
  throw new Error(
    'Direct payment recording is disabled for security. ' +
    'Payments are confirmed automatically via Paystack webhook. ' +
    'Use verifyPaymentSecure() to check payment status.'
  );
}
