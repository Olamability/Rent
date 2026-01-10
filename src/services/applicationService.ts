/* eslint-disable @typescript-eslint/no-explicit-any */
// Service for managing property applications
import { supabase } from '@/lib/supabase';
import type { PropertyApplication } from '@/types';
import { createNotification } from './notificationService';
import { formatDateSafely } from '@/lib/utils';

/**
 * Submit a new property application
 */
export async function submitApplication(data: {
  tenantId: string;
  propertyId: string;
  unitId: string;
  moveInDate: string;
  personalInfo?: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    phone: string;
    email: string;
    nationalId?: string;
  };
  currentAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    duration: string;
  };
  employmentInfo: {
    employer: string;
    position: string;
    income?: number;
    employmentDuration?: string;
    employerPhone?: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  refs: {
    name: string;
    phone: string;
    email?: string;
    relationship: string;
  }[];
  previousLandlord?: {
    name: string;
    phone: string;
    address: string;
    rentalDuration: string;
  };
  pets?: {
    hasPets: boolean;
    petDetails?: string;
  };
  vehicles?: {
    hasVehicle: boolean;
    vehicleDetails?: string;
  };
  occupants?: {
    numberOfOccupants: number;
    occupantDetails?: string;
  };
  creditCheckConsent?: boolean;
  backgroundCheckConsent?: boolean;
  documents?: {
    idCard?: string;
    proofOfIncome?: string;
    refs?: string;
    bankStatement?: string;
    previousLeaseAgreement?: string;
  };
  notes?: string;
}): Promise<PropertyApplication> {
  try {
    // First, get the landlord ID from the property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('landlord_id, name, address, city')
      .eq('id', data.propertyId)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found');
    }

    // Get unit details and check availability
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('unit_number, listing_status, is_occupied')
      .eq('id', data.unitId)
      .single();

    if (unitError || !unit) {
      throw new Error('Unit not found');
    }

    // Prevent applications for rented/occupied properties
    if (unit.listing_status === 'rented' || unit.is_occupied) {
      throw new Error('This property is already occupied and not available for applications.');
    }

    // Insert the application - now with all extended fields
    const { data: application, error: applicationError } = await supabase
      .from('property_applications')
      .insert({
        tenant_id: data.tenantId,
        landlord_id: property.landlord_id,
        property_id: data.propertyId,
        unit_id: data.unitId,
        application_status: 'pending',
        move_in_date: data.moveInDate,
        message: data.notes || `Application for ${property.name} - Unit ${unit.unit_number}`,
        personal_info: data.personalInfo || null,
        current_address: data.currentAddress || null,
        employment_info: data.employmentInfo || null,
        emergency_contact: data.emergencyContact || null,
        refs: data.refs || [],
        previous_landlord: data.previousLandlord || null,
        pets: data.pets || null,
        vehicles: data.vehicles || null,
        occupants: data.occupants || null,
        documents: data.documents || {},
        credit_check_consent: data.creditCheckConsent || false,
        background_check_consent: data.backgroundCheckConsent || false,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (applicationError) {
      console.error('Error creating application:', applicationError);
      throw applicationError;
    }

    // Get tenant name for notification
    const { data: tenant, error: tenantError } = await supabase
      .from('users')
      .select('name')
      .eq('id', data.tenantId)
      .single();

    const tenantName = tenant?.name || 'A tenant';

    // Send notification to landlord with more detail
    await createNotification({
      userId: property.landlord_id,
      title: 'New Property Application',
      message: `${tenantName} has applied for ${property.name} - Unit ${unit.unit_number}. Move-in: ${formatDateSafely(data.moveInDate, 'TBD')}`,
      type: 'info',
      actionUrl: `/landlord/units`,
    });

    // Send confirmation notification to tenant
    await createNotification({
      userId: data.tenantId,
      title: 'Application Submitted Successfully',
      message: `Your application for ${property.name} - Unit ${unit.unit_number} has been submitted. The landlord will review it shortly.`,
      type: 'success',
      actionUrl: '/tenant/dashboard',
    });

    return mapApplicationFromDb(application);
  } catch (error) {
    console.error('Failed to submit application:', error);
    throw error;
  }
}

/**
 * Extended application type with related data from joins
 */
interface ApplicationWithRelations extends PropertyApplication {
  properties?: {
    landlord_id?: string;
    name?: string;
    address?: string;
    city?: string;
  };
  units?: {
    unit_number?: string;
    rent_amount?: number;
    bedrooms?: number;
    bathrooms?: number;
  };
  users?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  tenant?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

/**
 * Fetch applications for a specific landlord (for their properties)
 */
export async function fetchApplicationsByLandlord(landlordId: string): Promise<ApplicationWithRelations[]> {
  try {
    const { data, error } = await supabase
      .from('property_applications')
      .select(`
        *,
        units!inner(
          unit_number, 
          property_id,
          rent_amount,
          bedrooms,
          bathrooms,
          properties!inner(landlord_id, name, address, city)
        ),
        tenant:users!property_applications_tenant_id_fkey(name, email, phone)
      `)
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching landlord applications:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((app) => {
      const result = mapApplicationFromDb(app) as ApplicationWithRelations;
      // Add related data to the result for easier access by components
      result.properties = app.units?.properties;
      result.units = app.units;
      result.users = app.tenant; // Use 'tenant' alias for clarity
      return result;
    });
  } catch (error) {
    console.error('Failed to fetch landlord applications:', error);
    throw error;
  }
}

/**
 * Fetch applications for a specific tenant
 */
export async function fetchApplicationsByTenant(tenantId: string): Promise<ApplicationWithRelations[]> {
  try {
    // First, try to fetch with tenancy_agreements join
    let data, error;
    
    try {
      const result = await supabase
        .from('property_applications')
        .select(`
          *,
          units!inner(
            unit_number, 
            rent_amount, 
            bedrooms, 
            bathrooms, 
            property_id,
            properties!inner(name, address, city, landlord_id, images)
          ),
          tenancy_agreements(
            id,
            agreement_status
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false});
      
      data = result.data;
      error = result.error;
    } catch (joinError) {
      // If the join fails (e.g., foreign key doesn't exist), fall back to simpler query
      console.warn('Tenancy agreements join failed, fetching without it:', joinError);
      
      const result = await supabase
        .from('property_applications')
        .select(`
          *,
          units!inner(
            unit_number, 
            rent_amount, 
            bedrooms, 
            bathrooms, 
            property_id,
            properties!inner(name, address, city, landlord_id, images)
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false});
      
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error fetching tenant applications:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((app) => {
      const result = mapApplicationFromDb(app) as ApplicationWithRelations;
      // Add related data for component access
      result.properties = app.units?.properties;
      result.units = app.units;
      // Add agreement data if it exists
      if (app.tenancy_agreements && app.tenancy_agreements.length > 0) {
        result.agreement = {
          id: app.tenancy_agreements[0].id,
          status: app.tenancy_agreements[0].agreement_status,
        };
      }
      return result;
    });
  } catch (error) {
    console.error('Failed to fetch tenant applications:', error);
    throw error;
  }
}

/**
 * Update application status (approve or reject)
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: 'approved' | 'rejected',
  approvedBy: string,
  adminNotes?: string
): Promise<void> {
  try {
    // Get application details first
    const { data: application, error: fetchError } = await supabase
      .from('property_applications')
      .select(`
        *,
        units!inner(
          unit_number, 
          rent_amount, 
          deposit, 
          property_id,
          properties!inner(name, landlord_id)
        ),
        tenant:users!property_applications_tenant_id_fkey(name)
      `)
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      throw new Error('Application not found');
    }

    // Update the application - only update fields that exist in schema
    const { error: updateError } = await supabase
      .from('property_applications')
      .update({
        application_status: status,
        reviewed_by: approvedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Error updating application:', updateError);
      throw updateError;
    }

    // NEW WORKFLOW: Generate lease agreement (not invoice) for approved application
    if (status === 'approved') {
      // Note: Unit listing_status remains 'available' until payment is completed
      // New flow: approval → agreement generation → tenant acceptance → invoice → payment → rented
      
      try {
        // Generate lease agreement using database function
        const { data: agreementId, error: agreementError } = await supabase
          .rpc('generate_agreement_from_application', {
            p_application_id: applicationId
          });

        if (agreementError) {
          console.error('Failed to generate agreement:', agreementError);
          throw agreementError;
        }

        console.log('Lease agreement generated:', agreementId);
        
        // Also create invoice in 'draft' status (not visible to tenant yet)
        const { createApplicationInvoice } = await import('./invoiceService');
        try {
          await createApplicationInvoice({
            applicationId,
            tenantId: application.tenant_id,
            landlordId: application.units?.properties?.landlord_id || application.landlord_id,
            unitId: application.unit_id,
            rentAmount: application.units.rent_amount,
            depositAmount: application.units.deposit,
          });
        } catch (invoiceError) {
          console.error('Failed to create draft invoice:', invoiceError);
          // Don't fail the approval, invoice can be created later
        }
      } catch (agreementError) {
        console.error('Failed to generate agreement for application:', agreementError);
        // Don't fail the approval completely, but log the error
      }
    }

    // Send notification to tenant
    const notificationTitle = status === 'approved' 
      ? 'Application Approved! 🎉'
      : 'Application Status Update';
    
    const notificationMessage = status === 'approved'
      ? `Your application for ${application.units?.properties?.name || 'the property'} - Unit ${application.units.unit_number} has been approved! Please review and accept your lease agreement to proceed.`
      : `Your application for ${application.units?.properties?.name || 'the property'} - Unit ${application.units.unit_number} has been reviewed.`;

    await createNotification({
      userId: application.tenant_id,
      title: notificationTitle,
      message: notificationMessage,
      type: status === 'approved' ? 'success' : 'info',
      actionUrl: status === 'approved' ? '/tenant/agreements' : '/tenant/dashboard',
    });
  } catch (error) {
    console.error('Failed to update application status:', error);
    throw error;
  }
}

/**
 * Fetch a single application by ID
 */
export async function fetchApplicationById(applicationId: string): Promise<ApplicationWithRelations | null> {
  try {
    const { data, error } = await supabase
      .from('property_applications')
      .select(`
        *,
        units!inner(
          unit_number, 
          rent_amount, 
          bedrooms, 
          bathrooms, 
          property_id,
          properties!inner(name, address, city, landlord_id)
        ),
        tenant:users!property_applications_tenant_id_fkey(name, email, phone)
      `)
      .eq('id', applicationId)
      .single();

    if (error) {
      console.error('Error fetching application:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    const result = mapApplicationFromDb(data) as ApplicationWithRelations;
    // Add related data for component access
    result.properties = data.units?.properties;
    result.units = data.units;
    result.tenant = data.tenant;
    return result;
  } catch (error) {
    console.error('Failed to fetch application:', error);
    return null;
  }
}

/**
 * Withdraw/Cancel an application (tenant action)
 */
export async function withdrawApplication(
  applicationId: string,
  reason?: string
): Promise<void> {
  try {
    // Get application details first to get related info for notifications
    const { data: application, error: fetchError } = await supabase
      .from('property_applications')
      .select(`
        *,
        units!inner(
          unit_number, 
          property_id,
          properties!inner(name, landlord_id)
        )
      `)
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      throw new Error('Application not found');
    }

    // Check if application can be withdrawn (only pending or approved)
    if (!['pending', 'approved'].includes(application.application_status)) {
      throw new Error('Application cannot be withdrawn. Only pending or approved applications can be withdrawn.');
    }

    // Update the application status to withdrawn - only use fields that exist
    const { error: updateError } = await supabase
      .from('property_applications')
      .update({
        application_status: 'withdrawn',
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Error withdrawing application:', updateError);
      throw updateError;
    }

    // No need to update unit status as it remains 'available' until payment
    // (Previously, we changed it to 'applied' on approval, but that's no longer the case)
    // Unit will only change to 'rented' after successful payment via webhook

    // Get tenant name for notification
    const { data: tenant } = await supabase
      .from('users')
      .select('name')
      .eq('id', application.tenant_id)
      .single();

    const tenantName = tenant?.name || 'A tenant';

    // Notify landlord
    await createNotification({
      userId: application.units?.properties?.landlord_id || application.landlord_id,
      title: 'Application Withdrawn',
      message: `${tenantName} has withdrawn their application for ${application.units?.properties?.name || 'a property'} - Unit ${application.units.unit_number}.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'info',
      actionUrl: '/landlord/units',
    });

    // Notify tenant (confirmation)
    await createNotification({
      userId: application.tenant_id,
      title: 'Application Withdrawn',
      message: `You have successfully withdrawn your application for ${application.units?.properties?.name || 'the property'} - Unit ${application.units.unit_number}.`,
      type: 'success',
      actionUrl: '/tenant/dashboard',
    });
  } catch (error) {
    console.error('Failed to withdraw application:', error);
    throw error;
  }
}

/**
 * Helper function to map database application to TypeScript type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApplicationFromDb(dbApp: Record<string, any>): PropertyApplication {
  return {
    id: dbApp.id,
    tenantId: dbApp.tenant_id,
    propertyId: dbApp.units?.property_id || dbApp.property_id, // Get from units if available
    unitId: dbApp.unit_id,
    status: dbApp.application_status,
    submittedAt: new Date(dbApp.created_at || dbApp.submitted_at),
    reviewedAt: dbApp.reviewed_at ? new Date(dbApp.reviewed_at) : undefined,
    moveInDate: dbApp.move_in_date ? new Date(dbApp.move_in_date) : undefined,
    personalInfo: dbApp.personal_info,
    currentAddress: dbApp.current_address,
    employmentInfo: dbApp.employment_info || undefined,
    emergencyContact: dbApp.emergency_contact,
    refs: dbApp.refs || [],
    previousLandlord: dbApp.previous_landlord,
    pets: dbApp.pets,
    vehicles: dbApp.vehicles,
    occupants: dbApp.occupants,
    creditCheckConsent: dbApp.credit_check_consent,
    backgroundCheckConsent: dbApp.background_check_consent,
    documents: dbApp.documents || {},
    notes: dbApp.notes || dbApp.message,
    adminNotes: dbApp.admin_notes,
    approvedBy: dbApp.approved_by || dbApp.reviewed_by,
    decisionDate: dbApp.decision_date ? new Date(dbApp.decision_date) : undefined,
  };
}
