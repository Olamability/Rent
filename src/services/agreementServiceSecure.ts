/**
 * Secure Agreement Service
 * 
 * This service uses Next.js API routes for agreement signing operations
 * to ensure integrity and legal compliance.
 * 
 * All agreement signing must go through the /api/agreements/sign route.
 * 
 * @security Compliant with PRD/RentflowGoal.md requirements
 */

import { supabase } from '@/lib/supabase';
import { TenancyAgreement } from './agreementService';

/**
 * Sign a tenancy agreement via secure Next.js API route
 * 
 * @security This function:
 * - Generates agreement hash for integrity
 * - Creates immutable signature record
 * - Collects IP/device metadata
 * - Prevents tampering
 * 
 * @param agreementId Agreement to sign
 * @param deviceFingerprint Optional device fingerprint for audit trail
 */
export async function signAgreementSecure(
  agreementId: string,
  deviceFingerprint?: string
): Promise<{
  success: boolean;
  message?: string;
  data?: {
    agreementHash: string;
    signatureTimestamp: string;
    signerRole: 'tenant' | 'landlord';
    bothPartiesSigned: boolean;
    agreementStatus: string;
  };
  error?: string;
}> {
  try {
    // Get auth token for API request
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // Call Next.js API route instead of edge function
    const response = await fetch('/api/agreements/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ 
        agreementId, 
        deviceFingerprint 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to sign agreement'
      };
    }

    return data;
  } catch (error) {
    console.error('Failed to sign agreement:', error);
    return {
      success: false,
      error: 'Failed to sign agreement. Please try again.'
    };
  }
}

/**
 * Get agreement signing status
 * Shows which parties have signed and when
 * 
 * @security Read-only operation, safe with RLS
 */
export async function getAgreementSigningStatus(agreementId: string): Promise<{
  success: boolean;
  tenantSigned: boolean;
  landlordSigned: boolean;
  tenantSignatureTimestamp?: string;
  landlordSignatureTimestamp?: string;
  agreementHash?: string;
  agreementStatus?: string;
  error?: string;
}> {
  try {
    // Use the view created in migration
    const { data, error } = await supabase
      .from('agreement_signing_status')
      .select('*')
      .eq('agreement_id', agreementId)
      .single();

    if (error) {
      console.error('Error fetching signing status:', error);
      return {
        success: false,
        tenantSigned: false,
        landlordSigned: false,
        error: 'Failed to fetch signing status'
      };
    }

    return {
      success: true,
      tenantSigned: data.tenant_signed,
      landlordSigned: data.landlord_signed,
      tenantSignatureTimestamp: data.tenant_signature_timestamp,
      landlordSignatureTimestamp: data.landlord_signature_timestamp,
      agreementHash: data.agreement_hash,
      agreementStatus: data.agreement_status
    };
  } catch (error) {
    console.error('Failed to get signing status:', error);
    return {
      success: false,
      tenantSigned: false,
      landlordSigned: false,
      error: 'Failed to get signing status'
    };
  }
}

/**
 * Get signature records for an agreement
 * Shows detailed audit trail of all signatures
 * 
 * @security Read-only with RLS enforcement
 */
export async function getAgreementSignatures(agreementId: string): Promise<{
  success: boolean;
  signatures?: Array<{
    id: string;
    signerRole: 'tenant' | 'landlord';
    agreementHash: string;
    signatureTimestamp: string;
    ipAddress: string;
    userAgent: string;
    deviceFingerprint?: string;
    agreementVersion: number;
  }>;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('agreement_signatures')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('signature_timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching signatures:', error);
      return {
        success: false,
        error: 'Failed to fetch signatures'
      };
    }

    return {
      success: true,
      signatures: data.map(sig => ({
        id: sig.id,
        signerRole: sig.signer_role,
        agreementHash: sig.agreement_hash,
        signatureTimestamp: sig.signature_timestamp,
        ipAddress: sig.ip_address,
        userAgent: sig.user_agent,
        deviceFingerprint: sig.device_fingerprint,
        agreementVersion: sig.agreement_version,
      }))
    };
  } catch (error) {
    console.error('Failed to get signatures:', error);
    return {
      success: false,
      error: 'Failed to get signatures'
    };
  }
}

/**
 * Verify agreement integrity
 * Checks if agreement has been modified since signing
 * 
 * @security Critical for legal validity
 */
export async function verifyAgreementIntegrity(agreementId: string): Promise<{
  success: boolean;
  isValid: boolean;
  currentHash?: string;
  storedHash?: string;
  message?: string;
  error?: string;
}> {
  try {
    const { data: agreement, error } = await supabase
      .from('tenancy_agreements')
      .select('*')
      .eq('id', agreementId)
      .single();

    if (error || !agreement) {
      return {
        success: false,
        isValid: false,
        error: 'Agreement not found'
      };
    }

    if (!agreement.agreement_hash) {
      return {
        success: true,
        isValid: false,
        message: 'Agreement has not been signed yet'
      };
    }

    // Get signatures to compare hashes
    const { data: signatures } = await supabase
      .from('agreement_signatures')
      .select('agreement_hash')
      .eq('agreement_id', agreementId)
      .limit(1)
      .single();

    if (!signatures) {
      return {
        success: true,
        isValid: false,
        message: 'No signatures found'
      };
    }

    const isValid = agreement.agreement_hash === signatures.agreement_hash;

    return {
      success: true,
      isValid,
      currentHash: agreement.agreement_hash,
      storedHash: signatures.agreement_hash,
      message: isValid 
        ? 'Agreement integrity verified - no modifications detected'
        : 'WARNING: Agreement may have been modified after signing'
    };
  } catch (error) {
    console.error('Failed to verify integrity:', error);
    return {
      success: false,
      isValid: false,
      error: 'Failed to verify agreement integrity'
    };
  }
}

/**
 * Fetch agreement with signing status (read-only)
 * 
 * @security Safe read operation with RLS
 */
export async function fetchAgreementWithStatus(agreementId: string): Promise<{
  success: boolean;
  agreement?: TenancyAgreement & {
    tenantSigned: boolean;
    landlordSigned: boolean;
    agreementHash?: string;
  };
  error?: string;
}> {
  try {
    const { data: agreement, error: agreementError } = await supabase
      .from('tenancy_agreements')
      .select(`
        *,
        property:properties(name, address, city, state, images),
        unit:units(unit_number),
        landlord:users!tenancy_agreements_landlord_id_fkey(name, email, phone),
        tenant:users!tenancy_agreements_tenant_id_fkey(name, email, phone)
      `)
      .eq('id', agreementId)
      .single();

    if (agreementError || !agreement) {
      return {
        success: false,
        error: 'Agreement not found'
      };
    }

    // Get signing status
    const signingStatus = await getAgreementSigningStatus(agreementId);

    return {
      success: true,
      agreement: {
        id: agreement.id,
        tenantId: agreement.tenant_id,
        landlordId: agreement.landlord_id,
        propertyId: agreement.property_id,
        unitId: agreement.unit_id,
        startDate: agreement.start_date,
        endDate: agreement.end_date,
        rentAmount: agreement.rent_amount,
        depositAmount: agreement.deposit_amount,
        status: agreement.agreement_status,
        terms: agreement.terms,
        documentUrl: agreement.document_url,
        signedAt: agreement.signed_at,
        terminatedAt: agreement.terminated_at,
        terminationReason: agreement.termination_reason,
        createdAt: agreement.created_at,
        updatedAt: agreement.updated_at,
        property: agreement.property,
        unit: agreement.unit,
        landlord: agreement.landlord,
        tenant: agreement.tenant,
        tenantSigned: signingStatus.tenantSigned,
        landlordSigned: signingStatus.landlordSigned,
        agreementHash: signingStatus.agreementHash,
      }
    };
  } catch (error) {
    console.error('Failed to fetch agreement:', error);
    return {
      success: false,
      error: 'Failed to fetch agreement'
    };
  }
}

/**
 * DEPRECATED: Direct agreement signing
 * @deprecated Use signAgreementSecure() via Edge Function instead
 * @security This function is disabled for security compliance
 */
export async function signAgreementDirect(): Promise<never> {
  throw new Error(
    'Direct agreement signing is disabled for security. ' +
    'Use signAgreementSecure() which provides integrity verification, ' +
    'audit trail, and legal compliance.'
  );
}

/**
 * DEPRECATED: Direct status update
 * @deprecated Status updates must go through Edge Functions
 * @security This function is disabled for security compliance
 */
export async function updateAgreementStatusDirect(): Promise<never> {
  throw new Error(
    'Direct status updates are disabled for security. ' +
    'Agreement status is updated automatically by Edge Functions ' +
    'after proper validation and signature verification.'
  );
}
