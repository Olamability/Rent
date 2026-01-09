/**
 * Paystack Webhook Handler - CRITICAL SECURITY FUNCTION
 * 
 * This API handles payment verification webhooks from Paystack.
 * It is the ONLY trusted way to update payment status in the database.
 * 
 * Security Features:
 * - Webhook signature verification
 * - Server-side payment status updates only
 * - Comprehensive audit logging
 * - Duplicate payment prevention
 * 
 * @security CRITICAL - Do not allow frontend to update payment status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// CORS headers for webhook responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Verify Paystack webhook signature
 * @security CRITICAL - Prevents unauthorized payment confirmations
 */
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex')
  
  return hash === signature
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * Handle POST request for Paystack webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Get webhook signature from headers
    const signature = request.headers.get('x-paystack-signature')
    if (!signature) {
      console.error('Missing webhook signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401, headers: corsHeaders }
      )
    }

    // 2. Get raw body for signature verification
    const body = await request.text()
    
    // 3. Verify webhook signature (CRITICAL SECURITY CHECK)
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecret) {
      console.error('PAYSTACK_SECRET_KEY not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      )
    }

    const isValid = verifyWebhookSignature(body, signature, paystackSecret)
    if (!isValid) {
      console.error('Invalid webhook signature - possible fraud attempt')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401, headers: corsHeaders }
      )
    }

    // 4. Parse webhook event
    const event = JSON.parse(body)
    console.log('Webhook event received:', event.event)

    // 5. Initialize Supabase client with SERVICE ROLE (has elevated permissions)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 6. Handle charge.success event
    if (event.event === 'charge.success') {
      const { reference, amount, customer, paid_at, channel, metadata } = event.data

      console.log('Processing successful payment:', reference)

      // 7. Find the payment record by reference
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*, units!inner(property_id, properties!inner(landlord_id))')
        .eq('transaction_id', reference)
        .maybeSingle()

      if (paymentError) {
        console.error('Error fetching payment:', paymentError)
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404, headers: corsHeaders }
        )
      }

      if (!payment) {
        console.error('Payment record not found for reference:', reference)
        return NextResponse.json(
          { error: 'Payment record not found' },
          { status: 404, headers: corsHeaders }
        )
      }

      // 8. Check for duplicate processing
      if (payment.payment_status === 'paid') {
        console.log('Payment already processed:', reference)
        return NextResponse.json(
          { message: 'Payment already processed' },
          { status: 200, headers: corsHeaders }
        )
      }

      // 9. Update payment status (ONLY server can do this)
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payment_status: 'paid',
          paid_date: paid_at || new Date().toISOString(),
          payment_method: channel || 'card',
          notes: `Verified via webhook at ${new Date().toISOString()}`,
        })
        .eq('id', payment.id)

      if (updateError) {
        console.error('Error updating payment:', updateError)
        throw updateError
      }

      // 10. Create audit log (COMPLIANCE REQUIREMENT)
      await supabase.from('audit_logs').insert({
        user_id: payment.tenant_id,
        action: 'payment_verified',
        entity_type: 'payment',
        entity_id: payment.id,
        changes: {
          reference,
          amount: amount / 100, // Convert from kobo to naira
          channel,
          status: 'paid',
          verified_via: 'paystack_webhook',
          customer_email: customer?.email,
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      })

      // 11. Notify landlord about payment received
      const landlordId = payment.units?.properties?.landlord_id
      if (landlordId) {
        await supabase.from('notifications').insert({
          user_id: landlordId,
          title: 'Payment Received',
          message: `Payment of ₦${(amount / 100).toFixed(2)} received for Unit ${payment.units?.unit_number || 'N/A'}`,
          type: 'success',
          action_url: '/landlord/rent-collection',
        })
      }

      // 12. Notify tenant about successful payment
      await supabase.from('notifications').insert({
        user_id: payment.tenant_id,
        title: 'Payment Confirmed',
        message: `Your payment of ₦${(amount / 100).toFixed(2)} has been confirmed`,
        type: 'success',
        action_url: '/tenant/payments',
      })

      console.log('Payment processed successfully:', reference)
    }
    
    // 13. Handle charge.failed event
    else if (event.event === 'charge.failed') {
      const { reference, message } = event.data

      console.log('Processing failed payment:', reference)

      // Update payment status to failed
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payment_status: 'failed',
          notes: `Payment failed: ${message}`,
        })
        .eq('transaction_id', reference)

      if (updateError) {
        console.error('Error updating failed payment:', updateError)
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
        action: 'payment_failed',
        entity_type: 'payment',
        entity_id: reference,
        changes: {
          reference,
          status: 'failed',
          reason: message,
          verified_via: 'paystack_webhook',
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      })

      console.log('Failed payment processed:', reference)
    }

    // 14. Return success response to Paystack
    return NextResponse.json(
      { 
        status: 'success',
        message: 'Webhook processed successfully' 
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        status: 'error',
        message: `Webhook processing failed: ${errorMessage}` 
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
