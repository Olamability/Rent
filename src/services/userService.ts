// User Service
// Handles common user operations across all roles

import { supabase } from '@/lib/supabase';
import type { User, UserRole } from '@/types';

/**
 * Fetch user by ID from users table
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
      email: data.email,
      name: data.name,
      role: data.role as UserRole,
      phone: data.phone,
      avatar: data.avatar,
      createdAt: new Date(data.created_at),
      isVerified: data.is_verified,
      profileComplete: data.profile_complete,
      profileCompleteness: data.profile_completeness,
    };
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}

/**
 * Update user basic information in users table
 */
export async function updateUserInfo(
  userId: string,
  updates: {
    name?: string;
    phone?: string;
    avatar?: string;
    profileComplete?: boolean;
    profileCompleteness?: number;
  }
): Promise<User> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role as UserRole,
      phone: data.phone,
      avatar: data.avatar,
      createdAt: new Date(data.created_at),
      isVerified: data.is_verified,
      profileComplete: data.profile_complete,
      profileCompleteness: data.profile_completeness,
    };
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to update last login:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Check if user exists by email
 */
export async function checkUserExists(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error checking user existence:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Failed to check user existence:', error);
    return false;
  }
}

/**
 * Sync user data from auth.users to public.users
 * This is useful when the trigger might have failed
 */
export async function syncUserFromAuth(userId: string): Promise<void> {
  try {
    // Get user from auth
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      throw new Error('Failed to get auth user');
    }

    // Check if user exists in public.users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingUser) {
      // User already exists, no sync needed
      return;
    }

    // Create user in public.users
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email!,
        name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User',
        role: (authData.user.user_metadata?.role || 'tenant') as UserRole,
        phone: authData.user.user_metadata?.phone,
        is_verified: !!authData.user.email_confirmed_at,
      });

    if (insertError) {
      console.error('Error syncing user from auth:', insertError);
      throw insertError;
    }
  } catch (error) {
    console.error('Failed to sync user from auth:', error);
    throw error;
  }
}
