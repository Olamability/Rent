/**
 * Agreement Signing API Route - CRITICAL SECURITY FUNCTION
 * 
 * This API handles agreement signing with security measures:
 * - Agreement hash generation and verification (integrity)
 * - Immutable signature records (legal compliance)
 * - IP/device metadata collection (audit trail)
 * - Version control (tamper detection)
 * 
 * @security CRITICAL - All agreement signings must go through this function
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Agreement {
  tenant_id: string;
  landlord_id: string;
  property_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit_amount: number;
  terms?: string;
  agreement_version?: number;
  agreement_hash?: string;
}

/**
 * Generate SHA-256 hash of agreement for integrity verification
 * @security CRITICAL - Prevents agreement tampering
 */
async function generateAgreementHash(agreement: Agreement): Promise<string> {
  // Create deterministic string from agreement data
  const content = JSON.stringify({
    tenant_id: agreement.tenant_id,
    landlord_id: agreement.landlord_id,
    property_id: agreement.property_id,
    unit_id: agreement.unit_id,
    start_date: agreement.start_date,
    end_date: agreement.end_date,
    rent_amount: agreement.rent_amount,
    deposit_amount: agreement.deposit_amount,
    terms: agreement.terms || '',
    version: agreement.agreement_version || 1,
  }, Object.keys({
    tenant_id: true,
    landlord_id: true,
    property_id: true,
    unit_id: true,
    start_date: true,
    end_date: true,
    rent_amount: true,
    deposit_amount: true,
    terms: true,
    version: true,
  }).sort()) // Ensure consistent key order

  // Generate SHA-256 hash
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hashHex
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * Handle POST request for signing agreements
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const { agreementId, deviceFingerprint } = await request.json()

    if (!agreementId) {
      return NextResponse.json(
        { success: false, error: 'Agreement ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 2. Get authorization token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // 3. Initialize Supabase client with service role
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

    // 4. Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    // 5. Fetch agreement details
    const { data: agreement, error: fetchError } = await supabase
      .from('tenancy_agreements')
      .select(`
        *,
        property:properties(name, address),
        unit:units(unit_number)
      `)
      .eq('id', agreementId)
      .single()

    if (fetchError || !agreement) {
      console.error('Error fetching agreement:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Agreement not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // 6. Verify user is authorized to sign (tenant or landlord)
    const signerRole = agreement.tenant_id === user.id ? 'tenant' 
                     : agreement.landlord_id === user.id ? 'landlord'
                     : null

    if (!signerRole) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to sign this agreement' },
        { status: 403, headers: corsHeaders }
      )
    }

    // 7. Check if already signed by this user
    const { data: existingSignature } = await supabase
      .from('agreement_signatures')
      .select('id')
      .eq('agreement_id', agreementId)
      .eq('signer_id', user.id)
      .maybeSingle()

    if (existingSignature) {
      return NextResponse.json(
        { success: false, error: 'You have already signed this agreement' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 8. Generate agreement hash (integrity verification)
    const currentHash = await generateAgreementHash(agreement as Agreement)

    // 9. Verify agreement hasn't been modified (if hash exists)
    if (agreement.agreement_hash && agreement.agreement_hash !== currentHash) {
      console.error('Agreement hash mismatch - possible tampering detected')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Agreement has been modified since creation. Cannot sign.' 
        },
        { status: 400, headers: corsHeaders }
      )
    }

    // 10. Collect metadata for legal compliance
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const signatureTimestamp = new Date().toISOString()

    // 11. Create immutable signature record (LEGAL COMPLIANCE)
    const { error: signError } = await supabase
      .from('agreement_signatures')
      .insert({
        agreement_id: agreementId,
        signer_id: user.id,
        signer_role: signerRole,
        agreement_hash: currentHash,
        signature_timestamp: signatureTimestamp,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_fingerprint: deviceFingerprint || null,
        agreement_version: agreement.agreement_version || 1,
      })

    if (signError) {
      console.error('Error creating signature record:', signError)
      throw signError
    }

    // 12. Check if both parties have signed
    const { data: allSignatures } = await supabase
      .from('agreement_signatures')
      .select('signer_role')
      .eq('agreement_id', agreementId)

    const hasTenantSignature = allSignatures?.some(sig => sig.signer_role === 'tenant')
    const hasLandlordSignature = allSignatures?.some(sig => sig.signer_role === 'landlord')
    const bothSigned = hasTenantSignature && hasLandlordSignature

    // 13. Update agreement status
    let newStatus = 'sent' // Default if only one party signed
    let signedAt = null

    if (bothSigned) {
      newStatus = 'signed'
      signedAt = signatureTimestamp
    }

    const { error: updateError } = await supabase
      .from('tenancy_agreements')
      .update({
        agreement_status: newStatus,
        agreement_hash: currentHash,
        signed_at: signedAt,
        updated_at: signatureTimestamp,
      })
      .eq('id', agreementId)

    if (updateError) {
      console.error('Error updating agreement:', updateError)
      throw updateError
    }

    // 14. Create audit log (COMPLIANCE REQUIREMENT)
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'agreement_signed',
      entity_type: 'tenancy_agreement',
      entity_id: agreementId,
      changes: {
        signer_role: signerRole,
        agreement_hash: currentHash,
        signature_timestamp: signatureTimestamp,
        ip_address: ipAddress,
        both_parties_signed: bothSigned,
        new_status: newStatus,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: signatureTimestamp,
    })

    // 15. Return success response
    return NextResponse.json(
      {
        success: true,
        message: bothSigned 
          ? 'Agreement fully signed by both parties!' 
          : 'Agreement signed successfully! Waiting for other party to sign.',
        data: {
          agreementHash: currentHash,
          signatureTimestamp,
          signerRole,
          bothPartiesSigned: bothSigned,
          agreementStatus: newStatus,
        },
      },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error signing agreement:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      {
        success: false,
        error: `Failed to sign agreement: ${errorMessage}`,
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
