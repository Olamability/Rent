/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { createNotification } from './notificationService';

export interface TenancyAgreement {
  id: string;
  tenantId: string;
  landlordId: string;
  propertyId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  status: 'draft' | 'sent' | 'signed' | 'active' | 'expired' | 'terminated';
  terms?: string;
  documentUrl?: string;
  signedAt?: string;
  terminatedAt?: string;
  terminationReason?: string;
  createdAt: string;
  updatedAt: string;
  // Nested data
  property?: {
    name: string;
    address: string;
    city: string;
    state: string;
    images?: string[];
  };
  unit?: {
    unitNumber: string;
  };
  landlord?: {
    name: string;
    email: string;
    phone: string;
  };
  tenant?: {
    name: string;
    email: string;
    phone: string;
  };
}

/**
 * Fetch active tenancy agreement for a tenant
 */
export async function fetchActiveTenancyAgreement(tenantId: string): Promise<TenancyAgreement | null> {
  try {
    const { data, error } = await supabase
      .from('tenancy_agreements')
      .select(`
        *,
        unit:units(
          unit_number,
          property_id,
          property:properties(name, address, city, state, images)
        ),
        landlord:users!tenancy_agreements_landlord_id_fkey(name, email, phone),
        tenant:users!tenancy_agreements_tenant_id_fkey(name, email, phone)
      `)
      .eq('tenant_id', tenantId)
      .eq('agreement_status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error fetching active tenancy agreement:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return transformAgreementData(data);
  } catch (error) {
    console.error('Failed to fetch active tenancy agreement:', error);
    throw error;
  }
}

/**
 * Fetch all tenancy agreements for a tenant (including past agreements)
 */
export async function fetchTenantAgreements(tenantId: string): Promise<TenancyAgreement[]> {
  try {
    const { data, error } = await supabase
      .from('tenancy_agreements')
      .select(`
        *,
        unit:units(
          unit_number,
          property_id,
          property:properties(name, address, city, state, images)
        ),
        landlord:users!tenancy_agreements_landlord_id_fkey(name, email, phone),
        tenant:users!tenancy_agreements_tenant_id_fkey(name, email, phone)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenant agreements:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(transformAgreementData);
  } catch (error) {
    console.error('Failed to fetch tenant agreements:', error);
    throw error;
  }
}

/**
 * Fetch all tenancy agreements for a landlord
 */
export async function fetchLandlordAgreements(landlordId: string): Promise<TenancyAgreement[]> {
  try {
    const { data, error } = await supabase
      .from('tenancy_agreements')
      .select(`
        *,
        unit:units(
          unit_number,
          property_id,
          property:properties(name, address, city, state, images)
        ),
        landlord:users!tenancy_agreements_landlord_id_fkey(name, email, phone),
        tenant:users!tenancy_agreements_tenant_id_fkey(name, email, phone)
      `)
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching landlord agreements:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(transformAgreementData);
  } catch (error) {
    console.error('Failed to fetch landlord agreements:', error);
    throw error;
  }
}

/**
 * Fetch a specific tenancy agreement by ID
 */
export async function fetchAgreementById(agreementId: string): Promise<TenancyAgreement | null> {
  try {
    const { data, error } = await supabase
      .from('tenancy_agreements')
      .select(`
        *,
        unit:units(
          unit_number,
          property_id,
          property:properties(name, address, city, state, images)
        ),
        landlord:users!tenancy_agreements_landlord_id_fkey(name, email, phone),
        tenant:users!tenancy_agreements_tenant_id_fkey(name, email, phone)
      `)
      .eq('id', agreementId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching agreement:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return transformAgreementData(data);
  } catch (error) {
    console.error('Failed to fetch agreement:', error);
    throw error;
  }
}

/**
 * Create a new tenancy agreement
 */
export async function createTenancyAgreement(agreement: {
  tenantId: string;
  landlordId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  terms?: string;
  status?: 'draft' | 'sent' | 'signed' | 'active';
}): Promise<TenancyAgreement> {
  try {
    const { data, error } = await supabase
      .from('tenancy_agreements')
      .insert({
        tenant_id: agreement.tenantId,
        landlord_id: agreement.landlordId,
        unit_id: agreement.unitId,
        start_date: agreement.startDate,
        end_date: agreement.endDate,
        rent_amount: agreement.rentAmount,
        deposit_amount: agreement.depositAmount,
        agreement_terms: agreement.terms,
        agreement_status: agreement.status || 'draft',
      })
      .select(`
        *,
        unit:units(
          unit_number,
          property_id,
          property:properties(name, address, city, state, images)
        ),
        landlord:users!tenancy_agreements_landlord_id_fkey(name, email, phone),
        tenant:users!tenancy_agreements_tenant_id_fkey(name, email, phone)
      `)
      .single();

    if (error) {
      console.error('Error creating tenancy agreement:', error);
      throw error;
    }

    return transformAgreementData(data);
  } catch (error) {
    console.error('Failed to create tenancy agreement:', error);
    throw error;
  }
}

/**
 * Update a tenancy agreement
 * @security Status updates for signing must go through Edge Functions
 * This function can still be used for other updates like terms, dates, etc.
 */
export async function updateTenancyAgreement(
  agreementId: string,
  updates: Partial<{
    startDate: string;
    endDate: string;
    rentAmount: number;
    depositAmount: number;
    status: 'draft' | 'sent' | 'signed' | 'active' | 'expired' | 'terminated';
    terms: string;
    documentUrl: string;
    signedAt: string;
    terminatedAt: string;
    terminationReason: string;
  }>
): Promise<TenancyAgreement> {
  try {
    // Prevent direct status updates to 'signed' or 'active' from frontend
    if (updates.status === 'signed' || updates.status === 'active') {
      throw new Error(
        'Cannot update agreement status to signed/active directly. ' +
        'Use signAgreementSecure() from agreementServiceSecure.ts instead.'
      );
    }
    
    // Convert camelCase to snake_case
    const dbUpdates: any = {};
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
    if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
    if (updates.rentAmount !== undefined) dbUpdates.rent_amount = updates.rentAmount;
    if (updates.depositAmount !== undefined) dbUpdates.deposit_amount = updates.depositAmount;
    if (updates.status !== undefined) dbUpdates.agreement_status = updates.status;
    if (updates.terms !== undefined) dbUpdates.terms = updates.terms;
    if (updates.documentUrl !== undefined) dbUpdates.document_url = updates.documentUrl;
    if (updates.signedAt !== undefined) dbUpdates.signed_at = updates.signedAt;
    if (updates.terminatedAt !== undefined) dbUpdates.terminated_at = updates.terminatedAt;
    if (updates.terminationReason !== undefined) dbUpdates.termination_reason = updates.terminationReason;

    const { data, error } = await supabase
      .from('tenancy_agreements')
      .update(dbUpdates)
      .eq('id', agreementId)
      .select(`
        *,
        property:properties(name, address, city, state, images),
        unit:units(unit_number),
        landlord:users!tenancy_agreements_landlord_id_fkey(name, email, phone),
        tenant:users!tenancy_agreements_tenant_id_fkey(name, email, phone)
      `)
      .single();

    if (error) {
      console.error('Error updating tenancy agreement:', error);
      throw error;
    }

    return transformAgreementData(data);
  } catch (error) {
    console.error('Failed to update tenancy agreement:', error);
    throw error;
  }
}

/**
 * Sign a tenancy agreement
 * @deprecated Use signAgreementSecure from agreementServiceSecure.ts instead
 * Direct database updates for agreement signing are disabled for security
 * 
 * @security All agreement signing must go through the sign-agreement Edge Function
 * which provides integrity verification, audit trail, and legal compliance
 */
export async function signTenancyAgreement(agreementId: string): Promise<TenancyAgreement> {
  throw new Error(
    'Direct agreement signing is disabled for security. ' +
    'Use signAgreementSecure() from agreementServiceSecure.ts which provides ' +
    'integrity verification, audit trail, and legal compliance via Edge Function.'
  );
}

/**
 * Terminate a tenancy agreement
 */
export async function terminateTenancyAgreement(
  agreementId: string,
  reason?: string
): Promise<TenancyAgreement> {
  try {
    // First, get the agreement details before updating
    const { data: agreementData, error: fetchError } = await supabase
      .from('tenancy_agreements')
      .select(`
        *,
        property:properties(name, address, city, state, images, landlord_id),
        unit:units(unit_number),
        landlord:users!tenancy_agreements_landlord_id_fkey(name, email, phone),
        tenant:users!tenancy_agreements_tenant_id_fkey(name, email, phone)
      `)
      .eq('id', agreementId)
      .single();

    if (fetchError || !agreementData) {
      console.error('Error fetching tenancy agreement:', fetchError);
      throw new Error('Tenancy agreement not found');
    }

    // Update the agreement status to terminated
    const { data, error } = await supabase
      .from('tenancy_agreements')
      .update({
        agreement_status: 'terminated',
        terminated_at: new Date().toISOString(),
        termination_reason: reason,
      })
      .eq('id', agreementId)
      .select(`
        *,
        property:properties(name, address, city, state, images),
        unit:units(unit_number),
        landlord:users!tenancy_agreements_landlord_id_fkey(name, email, phone),
        tenant:users!tenancy_agreements_tenant_id_fkey(name, email, phone)
      `)
      .single();

    if (error) {
      console.error('Error terminating tenancy agreement:', error);
      throw error;
    }

    // Update the unit status to make it available again
    const { error: unitError } = await supabase
      .from('units')
      .update({ 
        listing_status: 'available',
        is_public_listing: true
      })
      .eq('id', agreementData.unit_id);

    if (unitError) {
      console.error('Error updating unit status:', unitError);
      // Don't throw - agreement is already terminated
    }

    // Notify landlord about tenancy termination
    await createNotification({
      userId: agreementData.landlord_id,
      title: 'Tenancy Ended',
      message: `${agreementData.tenant?.name || 'A tenant'} has ended their tenancy at ${agreementData.property?.name} - Unit ${agreementData.unit?.unit_number}. The unit is now available for new tenants.`,
      type: 'info',
      actionUrl: '/landlord/units',
    });

    // Notify tenant about successful termination
    await createNotification({
      userId: agreementData.tenant_id,
      title: 'Tenancy Ended Successfully',
      message: `Your tenancy at ${agreementData.property?.name} - Unit ${agreementData.unit?.unit_number} has been ended. Thank you for being a tenant.`,
      type: 'success',
      actionUrl: '/tenant/dashboard',
    });

    return transformAgreementData(data);
  } catch (error) {
    console.error('Failed to terminate tenancy agreement:', error);
    throw error;
  }
}

/**
 * Database row type for tenancy agreement
 */
interface TenancyAgreementRow {
  id: string;
  tenant_id: string;
  landlord_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit_amount: number;
  agreement_status: string;
  agreement_terms?: string;
  document_url?: string;
  signed_at?: string;
  terminated_at?: string;
  termination_reason?: string;
  created_at: string;
  updated_at: string;
  unit?: {
    unit_number: string;
    property_id?: string;
    property?: {
      name: string;
      address: string;
      city: string;
      state: string;
      images?: string[];
    };
  };
  landlord?: {
    name: string;
    email: string;
    phone: string;
  };
  tenant?: {
    name: string;
    email: string;
    phone: string;
  };
}

/**
 * Helper function to transform database agreement data to the expected format
 */
function transformAgreementData(data: TenancyAgreementRow): TenancyAgreement {
  // Validate required relationships
  if (!data.unit) {
    throw new Error(`Agreement ${data.id} is missing unit data`);
  }
  
  if (!data.unit.property_id) {
    throw new Error(`Unit ${data.unit_id} is missing property_id`);
  }
  
  // Validate status is one of the expected values
  const validStatuses = ['draft', 'sent', 'signed', 'active', 'expired', 'terminated'];
  if (!validStatuses.includes(data.agreement_status)) {
    console.warn(`Agreement ${data.id} has invalid status: ${data.agreement_status}, defaulting to 'draft'`);
  }
  
  return {
    id: data.id,
    tenantId: data.tenant_id,
    landlordId: data.landlord_id,
    propertyId: data.unit.property_id,
    unitId: data.unit_id,
    startDate: data.start_date,
    endDate: data.end_date,
    rentAmount: data.rent_amount,
    depositAmount: data.deposit_amount,
    status: validStatuses.includes(data.agreement_status) 
      ? data.agreement_status as TenancyAgreement['status']
      : 'draft',
    terms: data.agreement_terms,
    documentUrl: data.document_url,
    signedAt: data.signed_at,
    terminatedAt: data.terminated_at,
    terminationReason: data.termination_reason,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    property: data.unit?.property ? {
      name: data.unit.property.name,
      address: data.unit.property.address,
      city: data.unit.property.city,
      state: data.unit.property.state,
      images: data.unit.property.images,
    } : undefined,
    unit: data.unit ? {
      unitNumber: data.unit.unit_number,
    } : undefined,
    landlord: data.landlord ? {
      name: data.landlord.name,
      email: data.landlord.email,
      phone: data.landlord.phone,
    } : undefined,
    tenant: data.tenant ? {
      name: data.tenant.name,
      email: data.tenant.email,
      phone: data.tenant.phone,
    } : undefined,
  };
}

/**
 * Fetch agreement by application ID
 */
export async function fetchAgreementByApplicationId(applicationId: string): Promise<TenancyAgreement | null> {
  try {
    const { data, error } = await supabase
      .from('tenancy_agreements')
      .select(`
        *,
        unit:units(
          unit_number,
          property_id,
          property:properties(name, address, city, state, images)
        ),
        landlord:users!tenancy_agreements_landlord_id_fkey(name, email, phone),
        tenant:users!tenancy_agreements_tenant_id_fkey(name, email, phone)
      `)
      .eq('application_id', applicationId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching agreement by application:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return transformAgreementData(data);
  } catch (error) {
    console.error('Failed to fetch agreement by application:', error);
    return null;
  }
}

/**
 * Accept/sign agreement as tenant
 * This triggers the workflow: agreement accepted → invoice issued → payment can proceed
 */
export async function acceptAgreementAsTenant(
  agreementId: string,
  tenantId: string
): Promise<TenancyAgreement> {
  try {
    // Call database function to handle acceptance
    const { error } = await supabase.rpc('accept_agreement_by_tenant', {
      p_agreement_id: agreementId,
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error('Error accepting agreement:', error);
      throw error;
    }

    // Fetch updated agreement
    const { data: agreement, error: fetchError } = await supabase
      .from('tenancy_agreements')
      .select(`
        *,
        unit:units(
          unit_number,
          property_id,
          property:properties(name, address, city, state, images)
        ),
        landlord:users!tenancy_agreements_landlord_id_fkey(name, email, phone),
        tenant:users!tenancy_agreements_tenant_id_fkey(name, email, phone)
      `)
      .eq('id', agreementId)
      .single();

    if (fetchError || !agreement) {
      throw new Error('Failed to fetch updated agreement');
    }

    // Issue invoice (make it visible to tenant)
    if (agreement.application_id) {
      const { issueInvoiceAfterAgreementAcceptance } = await import('./invoiceService');
      try {
        await issueInvoiceAfterAgreementAcceptance({
          applicationId: agreement.application_id,
          tenantId,
        });
      } catch (invoiceError) {
        console.error('Failed to issue invoice:', invoiceError);
        // Don't fail the acceptance, invoice can be issued later
      }
    }

    return transformAgreementData(agreement);
  } catch (error) {
    console.error('Failed to accept agreement:', error);
    throw error;
  }
}

/**
 * Get agreement status and details for review
 */
export async function getAgreementForReview(agreementId: string, tenantId: string): Promise<TenancyAgreement | null> {
  try {
    const { data, error } = await supabase
      .from('tenancy_agreements')
      .select(`
        *,
        unit:units(
          unit_number,
          rent_amount,
          deposit,
          bedrooms,
          bathrooms,
          square_feet,
          property_id,
          property:properties(name, address, city, state, zip_code, images)
        ),
        landlord:users!tenancy_agreements_landlord_id_fkey(name, email, phone),
        tenant:users!tenancy_agreements_tenant_id_fkey(name, email, phone)
      `)
      .eq('id', agreementId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      console.error('Error fetching agreement for review:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return transformAgreementData(data);
  } catch (error) {
    console.error('Failed to fetch agreement for review:', error);
    return null;
  }
}
