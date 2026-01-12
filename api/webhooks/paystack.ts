/**
 * Paystack Webhook Handler - Vercel Serverless Function
 * 
 * Handles payment verification webhooks from Paystack
 * Updates payment status securely on the server side
 * 
 * @security CRITICAL - Verifies webhook signatures
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Verify Paystack webhook signature
 */
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex');
  
  return hash === signature;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get webhook signature
    const signature = req.headers['x-paystack-signature'] as string;
    if (!signature) {
      console.error('Missing webhook signature');
      return res.status(400).json({
        success: false,
        error: 'Missing webhook signature'
      });
    }

    // Get Paystack secret
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'Payment gateway not configured'
      });
    }

    // Verify webhook signature
    const rawBody = JSON.stringify(req.body);
    if (!verifyWebhookSignature(rawBody, signature, paystackSecret)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    // Parse webhook data
    const { event, data } = req.body;

    console.log(`Received Paystack webhook: ${event}`);

    // Only handle charge.success events
    if (event !== 'charge.success') {
      console.log(`Ignoring event: ${event}`);
      return res.status(200).json({
        success: true,
        message: 'Event acknowledged but not processed'
      });
    }

    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Extract payment data
    const reference = data.reference;
    const amount = data.amount / 100; // Convert from kobo to naira
    const channel = data.channel;
    const paidAt = data.paid_at;
    const customerEmail = data.customer?.email;

    if (!reference) {
      console.error('Missing payment reference in webhook');
      return res.status(400).json({
        success: false,
        error: 'Missing payment reference'
      });
    }

    // Find payment record
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', reference)
      .single();

    if (findError || !payment) {
      console.error('Payment not found:', reference);
      return res.status(404).json({
        success: false,
        error: 'Payment record not found'
      });
    }

    // Check if already processed
    if (payment.payment_status === 'paid' || payment.status === 'paid') {
      console.log(`Payment ${reference} already processed`);
      return res.status(200).json({
        success: true,
        message: 'Payment already processed'
      });
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        payment_status: 'paid',
        status: 'paid',
        paid_at: paidAt || new Date().toISOString(),
        payment_method: channel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      throw updateError;
    }

    console.log(`Payment ${reference} marked as paid`);

    // Create audit log
    try {
      await supabase.from('audit_logs').insert({
        user_id: payment.tenant_id,
        action: 'payment_confirmed',
        entity_type: 'payment',
        entity_id: payment.id,
        changes: {
          reference,
          amount,
          channel,
          paidAt,
          customerEmail,
          webhook_event: event,
        },
        created_at: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    // Send notification to tenant (optional)
    try {
      await supabase.from('notifications').insert({
        user_id: payment.tenant_id,
        title: 'Payment Confirmed',
        message: `Your payment of ₦${amount.toLocaleString()} has been confirmed.`,
        type: 'payment',
        entity_type: 'payment',
        entity_id: payment.id,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        reference,
        amount,
        status: 'paid'
      }
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return res.status(500).json({
      success: false,
      error: `Webhook processing failed: ${errorMessage}`
    });
  }
}
