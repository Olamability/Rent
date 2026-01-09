// Role Management Service
// Handles role updates with proper validation and notifications

import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

/**
 * Role transition rules
 * Defines which role transitions are allowed for security
 */
const ALLOWED_ROLE_TRANSITIONS: Record<UserRole, UserRole[]> = {
  tenant: ['landlord', 'admin'], // Tenants can become landlords or promoted to admin
  landlord: ['tenant', 'admin'], // Landlords can become tenants or promoted to admin
  admin: ['admin', 'super_admin'], // Admins can be promoted to super admin
  super_admin: ['super_admin'], // Super admins cannot be demoted for security
};

/**
 * Check if a role transition is allowed
 */
export function isRoleTransitionAllowed(
  currentRole: UserRole,
  newRole: UserRole
): boolean {
  // Same role is always allowed
  if (currentRole === newRole) {
    return true;
  }

  // Check if transition is in allowed list
  const allowedTransitions = ALLOWED_ROLE_TRANSITIONS[currentRole] || [];
  return allowedTransitions.includes(newRole);
}

/**
 * Validate role change request
 * Prevents unauthorized role changes (e.g., tenant -> admin)
 */
export async function validateRoleChange(
  userId: string,
  newRole: UserRole
): Promise<{ valid: boolean; error?: string; currentRole?: UserRole }> {
  try {
    // Fetch current user role from database
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return {
        valid: false,
        error: 'User not found or unable to fetch current role',
      };
    }

    const currentRole = data.role as UserRole;

    // Check if transition is allowed
    if (!isRoleTransitionAllowed(currentRole, newRole)) {
      return {
        valid: false,
        error: `Role transition from ${currentRole} to ${newRole} is not allowed for security reasons`,
        currentRole,
      };
    }

    return {
      valid: true,
      currentRole,
    };
  } catch (err) {
    console.error('Error validating role change:', err);
    return {
      valid: false,
      error: 'Failed to validate role change',
    };
  }
}

/**
 * Update user role in database
 * Only should be called by admin users
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate the role change
    const validation = await validateRoleChange(userId, newRole);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Update the role in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return {
        success: false,
        error: 'Failed to update user role',
      };
    }

    // Create audit log entry
    try {
      await supabase.from('audit_logs').insert({
        admin_id: adminId,
        action: 'role_change',
        entity_type: 'user',
        entity_id: userId,
        changes: {
          field: 'role',
          old_value: validation.currentRole,
          new_value: newRole,
        },
        created_at: new Date().toISOString(),
      });
    } catch (auditError) {
      // Don't fail the role update if audit log fails
    }

    // Create notification for the user
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'role_change',
        title: 'Your Account Role Has Been Updated',
        message: `Your account role has been changed to ${newRole}. Please log out and log back in for changes to take effect.`,
        created_at: new Date().toISOString(),
        read: false,
      });
    } catch (notifError) {
      // Don't fail the role update if notification fails
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error('Error updating user role:', err);
    return {
      success: false,
      error: 'Unexpected error while updating role',
    };
  }
}

/**
 * Get role change history for a user
 */
export async function getRoleChangeHistory(
  userId: string
): Promise<Array<{
  timestamp: string;
  oldRole: UserRole;
  newRole: UserRole;
  changedBy: string;
}>> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('created_at, changes, admin_id, users!audit_logs_admin_id_fkey(name)')
      .eq('entity_type', 'user')
      .eq('entity_id', userId)
      .eq('action', 'role_change')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching role change history:', error);
      return [];
    }

    return (data || []).map((log: unknown) => ({
      timestamp: log.created_at,
      oldRole: log.changes?.old_value as UserRole,
      newRole: log.changes?.new_value as UserRole,
      changedBy: log.users?.name || 'Unknown Admin',
    }));
  } catch (err) {
    console.error('Error getting role change history:', err);
    return [];
  }
}
