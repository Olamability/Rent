// Service for managing maintenance requests
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { createNotification } from './notificationService';

export interface MaintenanceRequest {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest_control' | 'cleaning' | 'locks_security' | 'landscaping' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  assignedToName?: string;
  estimatedCompletion?: string;
  completedAt?: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceUpdate {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  photos?: string[];
  createdAt: string;
}

/**
 * Fetch all maintenance requests for a tenant
 */
export async function fetchMaintenanceRequests(tenantId: string): Promise<MaintenanceRequest[]> {
  try {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching maintenance requests:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((request: unknown) => ({
      id: request.id,
      tenantId: request.tenant_id,
      propertyId: request.property_id,
      unitId: request.unit_id,
      title: request.title,
      description: request.description,
      category: request.category,
      priority: request.priority,
      status: request.request_status,
      assignedTo: request.assigned_to,
      assignedToName: request.assigned_to, // This is already a text field
      estimatedCompletion: request.estimated_completion,
      completedAt: request.completed_at,
      photos: request.images || [],
      createdAt: request.created_at,
      updatedAt: request.updated_at,
    }));
  } catch (error) {
    console.error('Failed to fetch maintenance requests:', error);
    throw error;
  }
}

/**
 * Fetch all maintenance requests for a landlord
 */
export async function fetchLandlordMaintenanceRequests(landlordId: string): Promise<MaintenanceRequest[]> {
  try {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        units!inner(
          unit_number,
          properties!inner(
            landlord_id
          )
        ),
        users!maintenance_requests_tenant_id_fkey(name)
      `)
      .eq('units.properties.landlord_id', landlordId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching landlord maintenance requests:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((request: unknown) => ({
      id: request.id,
      tenantId: request.tenant_id,
      propertyId: request.property_id,
      unitId: request.unit_id,
      title: request.title,
      description: request.description,
      category: request.category,
      priority: request.priority,
      status: request.request_status,
      assignedTo: request.assigned_to,
      assignedToName: request.assigned_to,
      estimatedCompletion: request.estimated_completion,
      completedAt: request.completed_at,
      photos: request.images || [],
      createdAt: request.created_at,
      updatedAt: request.updated_at,
    }));
  } catch (error) {
    console.error('Failed to fetch landlord maintenance requests:', error);
    throw error;
  }
}

/**
 * Fetch a single maintenance request by ID
 */
export async function fetchMaintenanceRequestById(requestId: string): Promise<MaintenanceRequest | null> {
  try {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching maintenance request:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      propertyId: data.property_id,
      unitId: data.unit_id,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: data.request_status,
      assignedTo: data.assigned_to,
      assignedToName: data.assigned_to, // This is already a text field
      estimatedCompletion: data.estimated_completion,
      completedAt: data.completed_at,
      photos: data.images || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Failed to fetch maintenance request:', error);
    throw error;
  }
}

/**
 * Create a new maintenance request
 */
export async function createMaintenanceRequest(request: {
  tenantId: string;
  landlordId: string;
  unitId: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest_control' | 'cleaning' | 'locks_security' | 'landscaping' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  images?: string[];
}): Promise<MaintenanceRequest> {
  try {
    // Verify that tenant has active tenancy for this unit
    const { canRaiseMaintenance } = await import('./tenancyFlowService');
    const canRaise = await canRaiseMaintenance(request.tenantId, request.unitId);
    
    if (!canRaise) {
      throw new Error('You can only raise maintenance requests for units where you have an active tenancy');
    }

    // Create the maintenance request
    // Note: maintenance_requests table doesn't have tenancy_id field
    // The tenant-unit relationship is tracked via tenant_id and unit_id
    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert({
        tenant_id: request.tenantId,
        landlord_id: request.landlordId,
        unit_id: request.unitId,
        title: request.title,
        description: request.description,
        category: request.category,
        priority: request.priority,
        request_status: 'pending',
        images: request.images || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating maintenance request:', error);
      throw error;
    }

    // Get unit details for notification
    const { data: unit } = await supabase
      .from('units')
      .select('unit_number')
      .eq('id', request.unitId)
      .single();

    // Notify landlord about new maintenance request
    await createNotification({
      userId: request.landlordId,
      title: 'New Maintenance Request',
      message: `New ${request.priority} priority maintenance request for Unit ${unit?.unit_number || 'N/A'}: ${request.title}`,
      type: request.priority === 'urgent' ? 'warning' : 'info',
      actionUrl: '/landlord/maintenance',
    });

    return {
      id: data.id,
      tenantId: data.tenant_id,
      propertyId: data.property_id,
      unitId: data.unit_id,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: data.request_status,
      assignedTo: data.assigned_to,
      estimatedCompletion: data.estimated_completion,
      completedAt: data.completed_at,
      photos: data.images || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Failed to create maintenance request:', error);
    throw error;
  }
}

/**
 * Update a maintenance request
 */
export async function updateMaintenanceRequest(
  requestId: string,
  updates: Partial<{
    title: string;
    description: string;
    category: string;
    priority: string;
    requestStatus: string;
    assignedTo: string;
    estimatedCompletion: string;
    images: string[];
  }>
): Promise<MaintenanceRequest> {
  try {
    // Convert camelCase to snake_case for database
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.requestStatus !== undefined) dbUpdates.request_status = updates.requestStatus;
    if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
    if (updates.estimatedCompletion !== undefined) dbUpdates.estimated_completion = updates.estimatedCompletion;
    if (updates.images !== undefined) dbUpdates.images = updates.images;

    const { data, error } = await supabase
      .from('maintenance_requests')
      .update(dbUpdates)
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error updating maintenance request:', error);
      throw error;
    }

    // If status was updated, notify the tenant
    if (updates.requestStatus) {
      const statusMessage = 
        updates.requestStatus === 'completed' ? 'Your maintenance request has been completed!' :
        updates.requestStatus === 'in_progress' ? 'Work has started on your maintenance request.' :
        updates.requestStatus === 'assigned' ? 'Your maintenance request has been assigned.' :
        'Your maintenance request status has been updated.';

      await createNotification({
        userId: data.tenant_id,
        title: 'Maintenance Update',
        message: statusMessage,
        type: updates.requestStatus === 'completed' ? 'success' : 'info',
        actionUrl: '/tenant/maintenance',
      });
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      propertyId: data.property_id,
      unitId: data.unit_id,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: data.request_status,
      assignedTo: data.assigned_to,
      estimatedCompletion: data.estimated_completion,
      completedAt: data.completed_at,
      photos: data.images || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Failed to update maintenance request:', error);
    throw error;
  }
}

/**
 * Fetch updates/comments for a maintenance request
 */
export async function fetchMaintenanceUpdates(requestId: string): Promise<MaintenanceUpdate[]> {
  try {
    const { data, error } = await supabase
      .from('maintenance_updates')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching maintenance updates:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((update: unknown) => ({
      id: update.id,
      requestId: update.request_id,
      userId: update.user_id,
      userName: update.user_name,
      userRole: 'user',
      message: update.message,
      photos: update.images || [],
      createdAt: update.created_at,
    }));
  } catch (error) {
    console.error('Failed to fetch maintenance updates:', error);
    throw error;
  }
}

/**
 * Add an update/comment to a maintenance request
 */
export async function addMaintenanceUpdate(update: {
  requestId: string;
  userId: string;
  userName: string;
  message: string;
  images?: string[];
}): Promise<MaintenanceUpdate> {
  try {
    const { data, error } = await supabase
      .from('maintenance_updates')
      .insert({
        request_id: update.requestId,
        user_id: update.userId,
        user_name: update.userName,
        message: update.message,
        images: update.images || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding maintenance update:', error);
      throw error;
    }

    return {
      id: data.id,
      requestId: data.request_id,
      userId: data.user_id,
      userName: data.user_name,
      userRole: 'user',
      message: data.message,
      photos: data.images || [],
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('Failed to add maintenance update:', error);
    throw error;
  }
}

/**
 * Cancel a maintenance request
 */
export async function cancelMaintenanceRequest(requestId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ request_status: 'cancelled' })
      .eq('id', requestId);

    if (error) {
      console.error('Error cancelling maintenance request:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to cancel maintenance request:', error);
    throw error;
  }
}
