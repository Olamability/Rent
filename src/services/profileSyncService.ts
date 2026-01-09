// Profile Sync Utility
// Syncs user profile data from database after authentication

import { supabase } from '@/lib/supabase';
import { fetchTenantProfile } from './tenantProfileService';
import { fetchLandlordProfile } from './landlordProfileService';
import { fetchAdminProfile } from './adminProfileService';
import type { User, UserRole } from '@/types';

/**
 * Sync profile data from database for the authenticated user
 * This ensures the complete profile is loaded after login
 * Fetches both user basic data (phone, role, account_status) and role-specific profiles
 */
export async function syncUserProfile(user: User): Promise<Partial<User>> {
  try {
    const updates: Partial<User> = {};

    // First, fetch user data from users table to get phone, role, and account_status
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('phone, role, account_status')
      .eq('id', user.id)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user data:', userError);
      // For critical errors like user not found, throw to trigger fallback
      if (userError.code === 'PGRST116' || userError.message?.includes('JWT')) {
        throw new Error('User not found in database or authentication expired');
      }
      // For other errors, log but continue - user might still have basic profile
    } else if (userData) {
      // Update phone if available
      if (userData.phone) {
        updates.phone = userData.phone;
      }
      // Update role if different (important for admin role changes)
      if (userData.role && userData.role !== user.role) {
        updates.role = userData.role as UserRole;
      }
      // Add account_status for approval workflow
      if (userData.account_status) {
        updates.accountStatus = userData.account_status;
      }
    }

    // Then fetch role-specific profile based on the current/updated role
    const effectiveRole = updates.role || user.role;

    switch (effectiveRole) {
      case 'tenant': {
        const profile = await fetchTenantProfile(user.id);
        if (profile) {
          updates.profile = profile;
        }
        break;
      }
      
      case 'landlord': {
        const profile = await fetchLandlordProfile(user.id);
        if (profile) {
          updates.profile = profile;
        }
        break;
      }
      
      case 'admin':
      case 'super_admin': {
        const profile = await fetchAdminProfile(user.id);
        if (profile) {
          updates.profile = profile;
        }
        break;
      }
      
      default:
        // Unknown role - return updates we have so far
        break;
    }

    return updates;
  } catch (error) {
    console.error('Error syncing profile:', error);
    // If error is critical (user not found), re-throw
    if (error instanceof Error && error.message.includes('User not found')) {
      throw error;
    }
    // For other errors, return empty updates - don't block login
    return {};
  }
}
