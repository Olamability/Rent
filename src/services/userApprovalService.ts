// Service for user approval workflow
import { supabase } from '@/lib/supabase';
import { AccountStatus } from '@/types';

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: 'tenant' | 'landlord' | 'admin' | 'super_admin';
  accountStatus: AccountStatus;
  phone?: string;
  createdAt: string;
  profileComplete?: boolean;
}

/**
 * Fetch all pending users (across all roles)
 */
export async function fetchPendingUsers(roleFilter?: string): Promise<PendingUser[]> {
  try {
    let query = supabase
      .from('users')
      .select('id, name, email, role, account_status, phone, created_at, profile_complete')
      .eq('account_status', 'pending')
      .order('created_at', { ascending: false });

    // Apply role filter if provided
    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pending users:', error);
      throw error;
    }

    return (data || []).map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.account_status as AccountStatus,
      phone: user.phone,
      createdAt: user.created_at,
      profileComplete: user.profile_complete,
    }));
  } catch (error) {
    console.error('Failed to fetch pending users:', error);
    throw error;
  }
}

/**
 * Approve a user account
 */
export async function approveUserAccount(
  userId: string,
  approvedBy: string,
  notes?: string
): Promise<void> {
  try {
    // Get user details before approval
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('email, name, role')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;
    if (!user) throw new Error('User not found');

    // Update user account status to approved
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        account_status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Log the approval action in audit logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: approvedBy,
        action: 'approve_user',
        entity_type: 'user',
        entity_id: userId,
        changes: {
          account_status: {
            from: 'pending',
            to: 'approved'
          },
          user_email: user.email,
          user_name: user.name,
          user_role: user.role,
          notes: notes || null,
          timestamp: new Date().toISOString()
        }
      });

    if (auditError) {
      console.warn('Failed to log approval action:', auditError);
      // Don't fail the approval if audit logging fails
    }

    // TODO: Send email notification to user about approval
    // Future enhancement: Implement via Edge Function or email service
    // For now, users will need to check their account status or receive in-app notification
    console.log(`User ${user.email} (${user.role}) approved by ${approvedBy}`);
  } catch (error) {
    console.error('Failed to approve user:', error);
    throw error;
  }
}

/**
 * Reject a user account
 */
export async function rejectUserAccount(
  userId: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  try {
    // Get user details before rejection
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('email, name, role')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;
    if (!user) throw new Error('User not found');

    // Update user account status to banned (rejected)
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        account_status: 'banned',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Log the rejection action in audit logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: rejectedBy,
        action: 'reject_user',
        entity_type: 'user',
        entity_id: userId,
        changes: {
          account_status: {
            from: 'pending',
            to: 'banned'
          },
          user_email: user.email,
          user_name: user.name,
          user_role: user.role,
          reason: reason,
          timestamp: new Date().toISOString()
        }
      });

    if (auditError) {
      console.warn('Failed to log rejection action:', auditError);
      // Don't fail the rejection if audit logging fails
    }

    // TODO: Send email notification to user about rejection
    // Future enhancement: Implement via Edge Function or email service
    // For now, users will need to contact support to understand rejection
    console.log(`User ${user.email} (${user.role}) rejected by ${rejectedBy}. Reason: ${reason}`);
  } catch (error) {
    console.error('Failed to reject user:', error);
    throw error;
  }
}

/**
 * Get pending users count by role
 */
export async function getPendingUsersCount(role?: string): Promise<number> {
  try {
    let query = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('account_status', 'pending');

    if (role) {
      query = query.eq('role', role);
    }

    const { count, error } = await query;

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Failed to get pending users count:', error);
    return 0;
  }
}

/**
 * Get pending users statistics
 */
export async function getPendingUsersStats(): Promise<{
  total: number;
  tenants: number;
  landlords: number;
  admins: number;
}> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('account_status', 'pending');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      tenants: data?.filter(u => u.role === 'tenant').length || 0,
      landlords: data?.filter(u => u.role === 'landlord').length || 0,
      admins: data?.filter(u => u.role === 'admin' || u.role === 'super_admin').length || 0,
    };

    return stats;
  } catch (error) {
    console.error('Failed to get pending users stats:', error);
    return { total: 0, tenants: 0, landlords: 0, admins: 0 };
  }
}
