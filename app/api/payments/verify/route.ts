/**
 * Verify Payment API Route
 * 
 * Manually verify a payment with Paystack API
 * Used for payment status checks and reconciliation
 * 
 * @security Server-side payment verification only
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  
  return data?.role === 'admin' || data?.role === 'super_admin'
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * Handle POST request for payment verification
 */
export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json()

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Payment reference is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Verify payment with Paystack API
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecret) {
      console.error('PAYSTACK_SECRET_KEY not configured')
      return NextResponse.json(
        { success: false, error: 'Payment gateway not configured' },
        { status: 500, headers: corsHeaders }
      )
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
    )

    if (!verifyResponse.ok) {
      throw new Error('Failed to verify payment with Paystack')
    }

    const verifyData = await verifyResponse.json()

    if (!verifyData.status || !verifyData.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment verification failed',
          details: verifyData 
        },
        { status: 400, headers: corsHeaders }
      )
    }

    const paymentData = verifyData.data

    // Check if payment was successful
    if (paymentData.status !== 'success') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Payment status is ${paymentData.status}`,
          paymentStatus: paymentData.status 
        },
        { status: 400, headers: corsHeaders }
      )
    }

    // Find payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', reference)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json(
        { success: false, error: 'Payment record not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Verify user is authorized (tenant or admin)
    if (payment.tenant_id !== user.id && !(await isAdmin(supabase, user.id))) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Return verification result
    return NextResponse.json(
      {
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
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Payment verification error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { success: false, error: `Verification failed: ${errorMessage}` },
      { status: 500, headers: corsHeaders }
    )
  }
}
