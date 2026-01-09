// Service for managing the end-to-end tenancy flow: application → payment → agreement → tenancy
import { supabase } from '@/lib/supabase';
import { createNotification } from './notificationService';

export interface ApplicationPayment {
  id: string;
  applicationId: string;
  tenantId: string;
  landlordId: string;
  unitId: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: 'pending' | 'paid' | 'failed';
  paymentMethod?: 'card' | 'transfer' | 'ussd' | 'cash';
  transactionId?: string;
  receiptUrl?: string;
  createdAt: Date;
}

export interface Tenancy {
  id: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  landlordId: string;
  agreementId?: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'ended' | 'terminated';
  monthlyRent: number;
  createdAt: Date;
}

/**
 * Create initial payment for approved application (rent + security deposit)
 * This is triggered after landlord approves the application
 */
export async function createApplicationPayment(data: {
  applicationId: string;
  tenantId: string;
  landlordId: string;
  unitId: string;
  rentAmount: number;
  depositAmount: number;
}): Promise<ApplicationPayment> {
  try {
    // Check if application is approved
    const { data: application, error: appError } = await supabase
      .from('property_applications')
      .select('application_status')
      .eq('id', data.applicationId)
      .single();

    if (appError || !application) {
      throw new Error('Application not found');
    }

    if (application.application_status !== 'approved') {
      throw new Error('Application must be approved before payment can be initiated');
    }

    // Check if payment already exists for this application
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('application_id', data.applicationId)
      .maybeSingle();

    if (existingPayment) {
      throw new Error('Payment already exists for this application');
    }

    // Calculate total amount (rent + deposit)
    const totalAmount = data.rentAmount + data.depositAmount;

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        application_id: data.applicationId,
        tenant_id: data.tenantId,
        landlord_id: data.landlordId,
        unit_id: data.unitId,
        amount: totalAmount,
        due_date: new Date().toISOString(),
        status: 'pending',
        notes: `Initial payment: Rent ($${data.rentAmount}) + Security Deposit ($${data.depositAmount})`,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating application payment:', paymentError);
      throw paymentError;
    }

    // Notify tenant about payment requirement
    await createNotification({
      userId: data.tenantId,
      title: 'Payment Required',
      message: `Your application has been approved! Please complete your payment of $${totalAmount.toLocaleString()} (rent + security deposit) to proceed.`,
      type: 'info',
      actionUrl: '/tenant/rent',
    });

    return {
      id: payment.id,
      applicationId: payment.application_id,
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
      createdAt: new Date(payment.created_at),
    };
  } catch (error) {
    console.error('Failed to create application payment:', error);
    throw error;
  }
}

/**
 * Process payment completion and trigger agreement generation
 * @deprecated Payment status updates are now handled by the paystack-webhook Edge Function
 * This function should NOT be called from frontend for payment completion
 * 
 * @security Payment status updates must go through the webhook Edge Function
 * Frontend can only poll for status updates, not modify payment status
 */
export async function processPaymentCompletion(data: {
  paymentId: string;
  transactionId: string;
  paymentMethod: 'card' | 'transfer' | 'ussd' | 'cash';
  receiptUrl?: string;
}): Promise<void> {
  console.warn(
    'processPaymentCompletion is deprecated. ' +
    'Payment updates are handled automatically by the paystack-webhook Edge Function. ' +
    'Use pollPaymentStatus from paymentServiceSecure.ts to check payment status.'
  );
  
  throw new Error(
    'Direct payment status updates are disabled for security. ' +
    'Payments are confirmed automatically via Paystack webhook. ' +
    'Use pollPaymentStatus() to check for payment completion.'
  );
}

/**
 * Generate tenancy agreement after payment completion
 * This should be called by the webhook or backend process after payment confirmation
 */
export async function generateAgreementAfterPayment(data: {
  paymentId: string;
  applicationId: string;
  invoiceId?: string;
}): Promise<string> {
  try {
    // Get payment and application details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        applications:property_applications!payments_application_id_fkey(
          *,
          units(*, properties(*))
        )
      `)
      .eq('id', data.paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    const application = payment.applications;
    if (!application) {
      throw new Error('Application not found for payment');
    }

    // Create tenancy agreement
    const { createTenancyAgreement } = await import('./agreementService');
    
    const startDate = new Date(application.move_in_date || new Date());
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1); // Default 1 year lease

    const agreement = await createTenancyAgreement({
      tenantId: application.tenant_id,
      landlordId: application.landlord_id,
      unitId: application.unit_id,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      rentAmount: application.units.rent_amount,
      depositAmount: application.units.deposit || 0,
      status: 'draft',
    });

    // Send notifications
    await createNotification({
      userId: application.tenant_id,
      title: 'Agreement Ready for Signature',
      message: `Your tenancy agreement for ${application.units.properties.name} is ready. Please review and sign the agreement to complete the process.`,
      type: 'info',
      actionUrl: '/tenant/agreements',
    });

    await createNotification({
      userId: application.landlord_id,
      title: 'New Agreement Generated',
      message: `A tenancy agreement has been generated for ${application.units.properties.name}. Please review and sign.`,
      type: 'info',
      actionUrl: '/landlord/tenancy-agreements',
    });

    return agreement.id;
  } catch (error) {
    console.error('Failed to generate agreement after payment:', error);
    throw error;
  }
}
    'Use pollPaymentStatus() to check payment status.'
  );
}

/**
 * Generate tenancy agreement after successful payment
 */
export async function generateAgreementFromPayment(paymentId: string): Promise<string> {
  try {
    // Get payment and application details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        property_applications!inner(
          *,
          properties!inner(name, address, city, state, landlord_id),
          units!inner(unit_number, rent_amount, deposit)
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'paid') {
      throw new Error('Payment must be completed before generating agreement');
    }

    const application = payment.property_applications;
    if (!application) {
      throw new Error('Application not found');
    }

    // Check if agreement already exists
    const { data: existingAgreement } = await supabase
      .from('tenancy_agreements')
      .select('id')
      .eq('application_id', application.id)
      .maybeSingle();

    if (existingAgreement) {
      return existingAgreement.id;
    }

    // Calculate lease dates (1 year lease by default)
    const startDate = new Date(application.move_in_date);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Create tenancy agreement
    const { data: agreement, error: agreementError } = await supabase
      .from('tenancy_agreements')
      .insert({
        application_id: application.id,
        payment_id: paymentId,
        tenant_id: application.tenant_id,
        landlord_id: application.properties.landlord_id,
        property_id: application.property_id,
        unit_id: application.unit_id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        rent_amount: application.units.rent_amount,
        deposit_amount: application.units.deposit,
        agreement_status: 'generated',
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
      .single();

    if (agreementError) {
      console.error('Error creating tenancy agreement:', agreementError);
      throw agreementError;
    }

    // Notify both parties that agreement is ready
    await createNotification({
      userId: application.tenant_id,
      title: 'Agreement Ready for Signature',
      message: `Your tenancy agreement for ${application.properties.name} - Unit ${application.units.unit_number} is ready. Please review and sign.`,
      type: 'info',
      actionUrl: '/tenant/agreements',
    });

    await createNotification({
      userId: application.properties.landlord_id,
      title: 'Agreement Generated',
      message: `Tenancy agreement generated for ${application.properties.name} - Unit ${application.units.unit_number}. Awaiting signatures.`,
      type: 'info',
      actionUrl: '/landlord/agreements',
    });

    return agreement.id;
  } catch (error) {
    console.error('Failed to generate agreement:', error);
    throw error;
  }
}

/**
 * Sign agreement (tenant or landlord)
 * @deprecated Use signAgreementSecure from agreementServiceSecure.ts instead
 * This function now redirects to the secure Edge Function implementation
 * 
 * @security All agreement signing must go through the sign-agreement Edge Function
 */
export async function signAgreement(data: {
  agreementId: string;
  userId: string;
  userRole: 'tenant' | 'landlord';
  signature: string;
}): Promise<void> {
  // Import the secure function
  const { signAgreementSecure } = await import('./agreementServiceSecure');
  
  try {
    // Call the secure Edge Function instead of direct DB updates
    const result = await signAgreementSecure(data.agreementId);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to sign agreement');
    }
    
    // Success - Edge Function handles all notifications and status updates
    console.log('Agreement signed successfully via Edge Function:', result.message);
  } catch (error) {
    console.error('Failed to sign agreement:', error);
    throw error;
  }
}

/**
 * Fetch active tenancy for a tenant
 */
export async function fetchActiveTenancy(tenantId: string): Promise<Tenancy | null> {
  try {
    const { data, error } = await supabase
      .from('tenancies')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error fetching active tenancy:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      propertyId: data.property_id,
      unitId: data.unit_id,
      tenantId: data.tenant_id,
      landlordId: data.landlord_id,
      agreementId: data.agreement_id,
      startDate: data.start_date,
      endDate: data.end_date,
      status: data.status,
      monthlyRent: data.monthly_rent,
      createdAt: new Date(data.created_at),
    };
  } catch (error) {
    console.error('Failed to fetch active tenancy:', error);
    throw error;
  }
}

/**
 * Fetch payment for application (to check if tenant needs to pay)
 */
export async function fetchApplicationPayment(applicationId: string): Promise<ApplicationPayment | null> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching application payment:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      applicationId: data.application_id,
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
      createdAt: new Date(data.created_at),
    };
  } catch (error) {
    console.error('Failed to fetch application payment:', error);
    throw error;
  }
}

/**
 * Check if tenant can raise maintenance request (must have active tenancy)
 */
export async function canRaiseMaintenance(tenantId: string, unitId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('can_raise_maintenance', {
        tenant_id_param: tenantId,
        unit_id_param: unitId,
      });

    if (error) {
      console.error('Error checking maintenance eligibility:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Failed to check maintenance eligibility:', error);
    return false;
  }
}
