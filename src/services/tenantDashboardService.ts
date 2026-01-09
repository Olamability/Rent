// Service for fetching tenant dashboard data
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { fetchApplicationsByTenant } from './applicationService';
import { formatDateSafely } from '@/lib/utils';

export interface TenantDashboardData {
  currentLease: {
    propertyName: string;
    propertyAddress: string;
    unitNumber: string;
    rentAmount: number;
    leaseEndDate: string;
    propertyImage?: string;
  } | null;
  payments: {
    month: string;
    amount: string;
    date: string;
    status: 'Paid' | 'Pending' | 'Upcoming';
  }[];
  maintenanceRequests: {
    id: string;
    title: string;
    status: string;
    date: string;
  }[];
  documents: {
    name: string;
    type: string;
    size: string;
    date: string;
    url?: string;
  }[];
  applications: {
    id: string;
    propertyName: string;
    unitNumber: string;
    status: string;
    submittedAt: string;
    moveInDate: string;
  }[];
}

/**
 * Fetch all dashboard data for a tenant
 */
export async function fetchTenantDashboardData(tenantId: string): Promise<TenantDashboardData> {
  try {
    // Fetch current lease information
    const currentLease = await fetchCurrentLease(tenantId);
    
    // Fetch payment history
    const payments = await fetchPaymentHistory(tenantId);
    
    // Fetch maintenance requests
    const maintenanceRequests = await fetchMaintenanceRequests(tenantId);
    
    // Fetch documents
    const documents = await fetchDocuments(tenantId);
    
    // Fetch applications
    const applications = await fetchApplications(tenantId);
    
    return {
      currentLease,
      payments,
      maintenanceRequests,
      documents,
      applications,
    };
  } catch (error) {
    console.error('Error fetching tenant dashboard data:', error);
    throw error;
  }
}

/**
 * Fetch current lease information for tenant
 */
async function fetchCurrentLease(tenantId: string) {
  const { data, error } = await supabase
    .from('tenancy_agreements')
    .select(`
      id,
      rent_amount,
      start_date,
      end_date,
      agreement_status,
      units (
        unit_number,
        properties (
          name,
          address,
          city,
          state,
          zip_code,
          images
        )
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('agreement_status', 'active')
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching current lease:', error);
    return null;
  }
  
  if (!data || !data.units) {
    return null;
  }
  
  // Type-safe access to nested data
  const unit = data.units as { unit_number?: string; properties?: { 
    name?: string; 
    address?: string; 
    city?: string; 
    state?: string; 
    zip_code?: string; 
    images?: string[] 
  } };
  const property = unit.properties;
  
  return {
    propertyName: property?.name || 'N/A',
    propertyAddress: property ? `${property.address || ''}, ${property.city || ''}, ${property.state || ''} ${property.zip_code || ''}`.trim() : 'N/A',
    unitNumber: unit.unit_number || 'N/A',
    rentAmount: data.rent_amount || 0,
    leaseEndDate: data.end_date || '',
    propertyImage: property?.images?.[0] || undefined,
  };
}

/**
 * Fetch payment history for tenant
 */
async function fetchPaymentHistory(tenantId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, due_date, paid_at, status')
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching payment history:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    return [];
  }
  
  return data.map(payment => {
    const dueDate = new Date(payment.due_date);
    const monthYear = dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const dayMonth = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    let status: 'Paid' | 'Pending' | 'Upcoming' = 'Pending';
    if (payment.status === 'paid') {
      status = 'Paid';
    } else if (payment.status === 'pending' && dueDate > new Date()) {
      status = 'Upcoming';
    }
    
    return {
      month: monthYear,
      amount: `₦${payment.amount.toLocaleString()}`,
      date: dayMonth,
      status,
    };
  });
}

/**
 * Fetch maintenance requests for tenant
 */
async function fetchMaintenanceRequests(tenantId: string) {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('id, title, request_status, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error fetching maintenance requests:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    return [];
  }
  
  return data.map(request => {
    const createdDate = new Date(request.created_at);
    const formattedDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Format status for display
    const displayStatus = request.request_status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return {
      id: `#${request.id.substring(0, 4)}`,
      title: request.title,
      status: displayStatus,
      date: formattedDate,
    };
  });
}

/**
 * Fetch documents for tenant
 */
async function fetchDocuments(tenantId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('id, name, document_type, file_size, created_at, doc_url, mime_type')
    .eq('owner_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    return [];
  }
  
  return data.map(doc => {
    const uploadDate = new Date(doc.created_at);
    const formattedDate = uploadDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // Format file size
    const sizeInMB = (doc.file_size || 0) / (1024 * 1024);
    const formattedSize = sizeInMB >= 1 
      ? `${sizeInMB.toFixed(1)} MB` 
      : `${((doc.file_size || 0) / 1024).toFixed(0)} KB`;
    
    return {
      name: doc.name,
      type: doc.document_type ? doc.document_type.toUpperCase() : 'UNKNOWN',
      size: formattedSize,
      date: formattedDate,
      url: doc.doc_url,
    };
  });
}

/**
 * Fetch applications for tenant
 */
async function fetchApplications(tenantId: string) {
  try {
    const apps = await fetchApplicationsByTenant(tenantId);
    
    return apps.map(app => {
      // Get property and unit details from the app (they should be included in the query)
      const propertyName = (app as any).properties?.name || 'Unknown Property';
      const unitNumber = (app as any).units?.unit_number || 'N/A';
      
      return {
        id: app.id,
        propertyName,
        unitNumber,
        status: app.status,
        submittedAt: formatDateSafely(app.submittedAt, 'Unknown', { month: 'short', day: 'numeric' }),
        moveInDate: formatDateSafely(app.moveInDate, 'N/A', { month: 'short', day: 'numeric' }),
      };
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return [];
  }
}
