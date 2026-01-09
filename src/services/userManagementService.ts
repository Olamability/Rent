// Service for admin user management
import { supabase } from '@/lib/supabase';
import { User, UserFilters } from '@/types/admin';

/**
 * Fetch all users with optional filters
 */
export async function fetchUsers(filters?: UserFilters): Promise<User[]> {
  try {
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.status) {
      query = query.eq('account_status', filters.status);
    }

    if (filters?.verified !== undefined) {
      query = query.eq('is_verified', filters.verified);
    }

    if (filters?.kycStatus) {
      query = query.eq('kyc_status', filters.kycStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(user => ({
      id: user.id,
      name: user.name || 'N/A',
      email: user.email,
      role: user.role,
      status: user.account_status || 'active',
      verified: user.is_verified || false,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      phone: user.phone,
      address: user.address,
      kycStatus: user.kyc_status || 'pending',
      fraudFlags: [], // Fraud flags would come from a separate table
    }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

/**
 * Search users by name or email
 */
export async function searchUsers(query: string): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error searching users:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(user => ({
      id: user.id,
      name: user.name || 'N/A',
      email: user.email,
      role: user.role,
      status: user.account_status || 'active',
      verified: user.is_verified || false,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      phone: user.phone,
      address: user.address,
      kycStatus: user.kyc_status || 'pending',
      fraudFlags: [],
    }));
  } catch (error) {
    console.error('Failed to search users:', error);
    throw error;
  }
}

/**
 * Get a single user by ID
 */
export async function fetchUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name || 'N/A',
      email: data.email,
      role: data.role,
      status: data.account_status || 'active',
      verified: data.is_verified || false,
      createdAt: data.created_at,
      lastLogin: data.last_login,
      phone: data.phone,
      address: data.address,
      kycStatus: data.kyc_status || 'pending',
      fraudFlags: [],
    };
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

/**
 * Update user status
 */
export async function updateUserStatus(userId: string, status: 'pending' | 'approved' | 'suspended' | 'banned'): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ account_status: status })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to update user status:', error);
    throw error;
  }
}

/**
 * Approve user account with audit logging
 */
export async function approveUser(userId: string, approvedBy?: string, notes?: string): Promise<void> {
  try {
    // Get user details before approval
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('email, name, role, account_status')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;
    if (!user) throw new Error('User not found');

    // Update status
    await updateUserStatus(userId, 'approved');

    // Log the approval action if approvedBy is provided
    if (approvedBy) {
      try {
        await supabase
          .from('audit_logs')
          .insert({
            user_id: approvedBy,
            action: 'approve_user',
            entity_type: 'user',
            entity_id: userId,
            changes: {
              account_status: {
                from: user.account_status,
                to: 'approved'
              },
              user_email: user.email,
              user_name: user.name,
              user_role: user.role,
              notes: notes || null,
              timestamp: new Date().toISOString()
            }
          });
      } catch (auditError) {
        console.warn('Failed to log approval action:', auditError);
        // Don't fail the approval if audit logging fails
      }
    }
  } catch (error) {
    console.error('Failed to approve user:', error);
    throw error;
  }
}

/**
 * Suspend user account
 */
export async function suspendUser(userId: string): Promise<void> {
  try {
    await updateUserStatus(userId, 'suspended');
  } catch (error) {
    console.error('Failed to suspend user:', error);
    throw error;
  }
}

/**
 * Ban user account
 */
export async function banUser(userId: string): Promise<void> {
  try {
    await updateUserStatus(userId, 'banned');
  } catch (error) {
    console.error('Failed to ban user:', error);
    throw error;
  }
}

/**
 * Reactivate user account (set to approved)
 */
export async function reactivateUser(userId: string): Promise<void> {
  try {
    await updateUserStatus(userId, 'approved');
  } catch (error) {
    console.error('Failed to reactivate user:', error);
    throw error;
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw error;
  }
}

/**
 * Update user details
 */
export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  try {
    const updateData: Record<string, unknown> = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.status !== undefined) updateData.account_status = updates.status;
    if (updates.verified !== undefined) updateData.is_verified = updates.verified;
    if (updates.kycStatus !== undefined) updateData.kyc_status = updates.kycStatus;

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
}

/**
 * Bulk delete users
 */
export async function bulkDeleteUsers(userIds: string[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .in('id', userIds);

    if (error) {
      console.error('Error bulk deleting users:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to bulk delete users:', error);
    throw error;
  }
}

/**
 * Bulk suspend users
 */
export async function bulkSuspendUsers(userIds: string[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ account_status: 'suspended' })
      .in('id', userIds);

    if (error) {
      console.error('Error bulk suspending users:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to bulk suspend users:', error);
    throw error;
  }
}

/**
 * Export users as CSV
 */
export async function exportUsersAsCSV(users: User[]): Promise<string> {
  const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Verified', 'Created At'];
  const rows = users.map(user => [
    user.id,
    user.name,
    user.email,
    user.role,
    user.status,
    user.verified ? 'Yes' : 'No',
    new Date(user.createdAt).toLocaleDateString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}
