/**
 * Verify Payment Vercel Serverless Function
 * 
 * Manually verify a payment with Paystack API
 * Used for payment status checks and reconciliation
 * 
 * @security Server-side payment verification only
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  
  return data?.role === 'admin' || data?.role === 'super_admin';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment reference is required' 
      });
    }

    // Get auth token
    const authHeader = req.headers.authorization as string;
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
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

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }

    // Verify payment with Paystack API
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Payment gateway not configured' 
      });
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!verifyResponse.ok) {
      throw new Error('Failed to verify payment with Paystack');
    }

    const verifyData = await verifyResponse.json();

    if (!verifyData.status || !verifyData.data) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment verification failed',
        details: verifyData 
      });
    }

    const paymentData = verifyData.data;

    // Check if payment was successful
    if (paymentData.status !== 'success') {
      return res.status(400).json({ 
        success: false, 
        error: `Payment status is ${paymentData.status}`,
        paymentStatus: paymentData.status 
      });
    }

    // Find payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', reference)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment record not found' 
      });
    }

    // Verify user is authorized (tenant or admin)
    if (payment.tenant_id !== user.id && !(await isAdmin(supabase, user.id))) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized' 
      });
    }

    // Return verification result
    return res.status(200).json({
      success: true,
      verified: paymentData.status === 'success',
      payment: {
        reference: paymentData.reference,
        amount: paymentData.amount / 100,
        currency: paymentData.currency,
        status: paymentData.status,
        paidAt: paymentData.paid_at,
        channel: paymentData.channel,
        customer: {
          email: paymentData.customer.email,
        },
      },
      localStatus: payment.payment_status,
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return res.status(500).json({ 
      success: false, 
      error: `Verification failed: ${errorMessage}` 
    });
  }
}
