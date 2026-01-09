/* eslint-disable @typescript-eslint/no-explicit-any */
// Service for managing invoices
import { supabase } from '@/lib/supabase';
import { createNotification } from './notificationService';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  landlordId: string;
  unitId: string;
  agreementId?: string;
  applicationId?: string;
  
  // Invoice details
  invoiceType: 'initial_payment' | 'monthly_rent' | 'late_fee' | 'maintenance' | 'other';
  invoiceDate: string;
  dueDate: string;
  
  // Amount breakdown
  rentAmount: number;
  depositAmount: number;
  lateFeeAmount: number;
  maintenanceAmount: number;
  otherAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  
  // Status
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  paidAt?: string;
  
  // Additional info
  lineItems?: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
  notes?: string;
  terms?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Related data
  tenant?: {
    name: string;
    email: string;
  };
  landlord?: {
    name: string;
    email: string;
  };
  unit?: {
    unitNumber: string;
    property?: {
      name: string;
      address: string;
    };
  };
}

/**
 * Fetch invoices for a tenant
 */
export async function fetchTenantInvoices(tenantId: string): Promise<Invoice[]> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        landlord:users!invoices_landlord_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address, city)
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenant invoices:', error);
      throw error;
    }

    return (data || []).map(mapInvoiceFromDb);
  } catch (error) {
    console.error('Failed to fetch tenant invoices:', error);
    throw error;
  }
}

/**
 * Fetch invoices for a landlord
 */
export async function fetchLandlordInvoices(landlordId: string): Promise<Invoice[]> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        tenant:users!invoices_tenant_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address, city)
        )
      `)
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching landlord invoices:', error);
      throw error;
    }

    return (data || []).map(mapInvoiceFromDb);
  } catch (error) {
    console.error('Failed to fetch landlord invoices:', error);
    throw error;
  }
}

/**
 * Fetch a single invoice by ID
 */
export async function fetchInvoiceById(invoiceId: string): Promise<Invoice | null> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        tenant:users!invoices_tenant_id_fkey(name, email),
        landlord:users!invoices_landlord_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address, city)
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapInvoiceFromDb(data);
  } catch (error) {
    console.error('Failed to fetch invoice:', error);
    return null;
  }
}

/**
 * Fetch invoice for a specific application
 */
export async function fetchInvoiceByApplicationId(applicationId: string): Promise<Invoice | null> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        tenant:users!invoices_tenant_id_fkey(name, email),
        landlord:users!invoices_landlord_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address, city)
        )
      `)
      .eq('application_id', applicationId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching invoice by application:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapInvoiceFromDb(data);
  } catch (error) {
    console.error('Failed to fetch invoice by application:', error);
    return null;
  }
}

/**
 * Create an invoice for an approved application
 */
export async function createApplicationInvoice(data: {
  applicationId: string;
  tenantId: string;
  landlordId: string;
  unitId: string;
  rentAmount: number;
  depositAmount: number;
  dueDate?: string;
}): Promise<Invoice> {
  try {
    // Check if invoice already exists
    const existing = await fetchInvoiceByApplicationId(data.applicationId);
    if (existing) {
      console.log('Invoice already exists for application:', data.applicationId);
      return existing;
    }

    // Call the database function to create invoice
    const dueDate = data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data: result, error } = await supabase.rpc('create_application_invoice', {
      p_application_id: data.applicationId,
      p_rent_amount: data.rentAmount,
      p_deposit_amount: data.depositAmount,
      p_due_date: dueDate,
    });

    if (error) {
      console.error('Error creating application invoice:', error);
      throw error;
    }

    // Fetch the created invoice
    const invoice = await fetchInvoiceById(result);
    if (!invoice) {
      throw new Error('Failed to fetch created invoice');
    }

    // Send notification to tenant
    await createNotification({
      userId: data.tenantId,
      title: 'Invoice Generated',
      message: `Your invoice for ${invoice.unit?.property?.name || 'your rental'} has been generated. Amount: $${invoice.totalAmount.toFixed(2)}. Due: ${new Date(invoice.dueDate).toLocaleDateString()}`,
      type: 'info',
      actionUrl: '/tenant/rent',
    });

    return invoice;
  } catch (error) {
    console.error('Failed to create application invoice:', error);
    throw error;
  }
}

/**
 * Create a monthly rent invoice
 */
export async function createMonthlyRentInvoice(data: {
  tenantId: string;
  landlordId: string;
  unitId: string;
  agreementId: string;
  rentAmount: number;
  dueDate: string;
  notes?: string;
}): Promise<Invoice> {
  try {
    // Generate invoice number
    const { data: invoiceNumber, error: numError } = await supabase.rpc('generate_invoice_number');
    
    if (numError) {
      console.error('Error generating invoice number:', numError);
      throw numError;
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        tenant_id: data.tenantId,
        landlord_id: data.landlordId,
        unit_id: data.unitId,
        agreement_id: data.agreementId,
        invoice_type: 'monthly_rent',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: data.dueDate,
        rent_amount: data.rentAmount,
        total_amount: data.rentAmount,
        notes: data.notes || 'Monthly rent payment',
      })
      .select(`
        *,
        tenant:users!invoices_tenant_id_fkey(name, email),
        landlord:users!invoices_landlord_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address, city)
        )
      `)
      .single();

    if (error) {
      console.error('Error creating monthly rent invoice:', error);
      throw error;
    }

    const mappedInvoice = mapInvoiceFromDb(invoice);

    // Send notification to tenant
    await createNotification({
      userId: data.tenantId,
      title: 'Rent Invoice Generated',
      message: `Your monthly rent invoice has been generated. Amount: $${data.rentAmount.toFixed(2)}. Due: ${new Date(data.dueDate).toLocaleDateString()}`,
      type: 'info',
      actionUrl: '/tenant/rent',
    });

    return mappedInvoice;
  } catch (error) {
    console.error('Failed to create monthly rent invoice:', error);
    throw error;
  }
}

/**
 * Update invoice payment status
 */
export async function updateInvoicePayment(
  invoiceId: string,
  paidAmount: number,
  transactionId?: string
): Promise<Invoice> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        paid_amount: paidAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select(`
        *,
        tenant:users!invoices_tenant_id_fkey(name, email),
        landlord:users!invoices_landlord_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address, city)
        )
      `)
      .single();

    if (error) {
      console.error('Error updating invoice payment:', error);
      throw error;
    }

    return mapInvoiceFromDb(data);
  } catch (error) {
    console.error('Failed to update invoice payment:', error);
    throw error;
  }
}

/**
 * Cancel an invoice
 */
export async function cancelInvoice(invoiceId: string, reason?: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({
        invoice_status: 'cancelled',
        notes: reason || 'Invoice cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (error) {
      console.error('Error cancelling invoice:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to cancel invoice:', error);
    throw error;
  }
}

/**
 * Get overdue invoices for a tenant
 */
export async function fetchOverdueInvoices(tenantId: string): Promise<Invoice[]> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        landlord:users!invoices_landlord_id_fkey(name, email),
        unit:units(
          unit_number,
          property:properties(name, address, city)
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('invoice_status', 'overdue')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching overdue invoices:', error);
      throw error;
    }

    return (data || []).map(mapInvoiceFromDb);
  } catch (error) {
    console.error('Failed to fetch overdue invoices:', error);
    throw error;
  }
}

/**
 * Helper function to map database invoice to TypeScript type
 */
function mapInvoiceFromDb(dbInvoice: any): Invoice {
  return {
    id: dbInvoice.id,
    invoiceNumber: dbInvoice.invoice_number,
    tenantId: dbInvoice.tenant_id,
    landlordId: dbInvoice.landlord_id,
    unitId: dbInvoice.unit_id,
    agreementId: dbInvoice.agreement_id,
    applicationId: dbInvoice.application_id,
    invoiceType: dbInvoice.invoice_type,
    invoiceDate: dbInvoice.invoice_date,
    dueDate: dbInvoice.due_date,
    rentAmount: parseFloat(dbInvoice.rent_amount || 0),
    depositAmount: parseFloat(dbInvoice.deposit_amount || 0),
    lateFeeAmount: parseFloat(dbInvoice.late_fee_amount || 0),
    maintenanceAmount: parseFloat(dbInvoice.maintenance_amount || 0),
    otherAmount: parseFloat(dbInvoice.other_amount || 0),
    totalAmount: parseFloat(dbInvoice.total_amount),
    paidAmount: parseFloat(dbInvoice.paid_amount || 0),
    balanceDue: parseFloat(dbInvoice.balance_due || dbInvoice.total_amount - (dbInvoice.paid_amount || 0)),
    status: dbInvoice.invoice_status,
    paidAt: dbInvoice.paid_at,
    lineItems: dbInvoice.line_items || [],
    notes: dbInvoice.notes,
    terms: dbInvoice.terms,
    createdAt: dbInvoice.created_at,
    updatedAt: dbInvoice.updated_at,
    tenant: dbInvoice.tenant,
    landlord: dbInvoice.landlord,
    unit: dbInvoice.unit ? {
      unitNumber: dbInvoice.unit.unit_number,
      property: dbInvoice.unit.property,
    } : undefined,
  };
}
