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

      // 9b. Update linked invoice if exists
      if (payment.invoice_id) {
        console.log('Updating invoice:', payment.invoice_id)
        
        const { error: invoiceUpdateError } = await supabase
          .from('invoices')
          .update({
            paid_amount: amount / 100, // Convert from kobo to naira
            paid_at: paid_at || new Date().toISOString(),
          })
          .eq('id', payment.invoice_id)
        
        if (invoiceUpdateError) {
          console.error('Error updating invoice:', invoiceUpdateError)
          // Don't fail the whole webhook if invoice update fails
        }
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

      // 13. Generate agreement if this is an application payment
      if (payment.application_id) {
        console.log('Generating agreement for application:', payment.application_id)
        
        try {
          // Check if agreement already exists for this application
          const { data: existingAgreement } = await supabase
            .from('tenancy_agreements')
            .select('id')
            .eq('application_id', payment.application_id)
            .maybeSingle()
          
          if (!existingAgreement) {
            // Get application details
            const { data: application } = await supabase
              .from('property_applications')
              .select('*, units!inner(*, properties!inner(*))')
              .eq('id', payment.application_id)
              .single()
            
            if (application) {
              // Calculate lease dates
              const startDate = new Date(application.move_in_date || new Date())
              const endDate = new Date(startDate)
              endDate.setFullYear(endDate.getFullYear() + 1) // Default 1 year lease
              
              // Create tenancy agreement
              const { data: agreement, error: agreementError } = await supabase
                .from('tenancy_agreements')
                .insert({
                  application_id: application.id,
                  payment_id: payment.id,
                  tenant_id: application.tenant_id,
                  landlord_id: application.landlord_id,
                  property_id: application.units.property_id,
                  unit_id: application.unit_id,
                  start_date: startDate.toISOString().split('T')[0],
                  end_date: endDate.toISOString().split('T')[0],
                  rent_amount: application.units.rent_amount,
                  deposit_amount: application.units.deposit || 0,
                  agreement_status: 'pending',
                  terms: JSON.stringify([
                    'Tenant agrees to pay rent on time each month',
                    'Tenant is responsible for minor maintenance and repairs',
                    'Landlord is responsible for major repairs and structural maintenance',
                    'Property must be kept clean and in good condition',
                    'No subletting without written permission from landlord',
                    'Tenant must provide 30 days notice before moving out',
                  ]),
                })
                .select()
                .single()
              
              if (!agreementError && agreement) {
                console.log('Agreement created successfully:', agreement.id)
                
                // Send notifications
                await supabase.from('notifications').insert([
                  {
                    user_id: application.tenant_id,
                    title: 'Agreement Ready for Signature',
                    message: `Your tenancy agreement for ${application.units.properties.name} is ready. Please review and sign to complete the process.`,
                    type: 'info',
                    action_url: '/tenant/agreements',
                  },
                  {
                    user_id: application.landlord_id,
                    title: 'New Agreement Generated',
                    message: `A tenancy agreement has been generated for ${application.units.properties.name}. Please review and sign.`,
                    type: 'info',
                    action_url: '/landlord/tenancy-agreements',
                  }
                ])
              } else {
                console.error('Error creating agreement:', agreementError)
              }
            }
          } else {
            console.log('Agreement already exists for application:', payment.application_id)
          }
        } catch (agreementError) {
          console.error('Error generating agreement:', agreementError)
          // Don't fail the webhook if agreement generation fails
        }
      }

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
