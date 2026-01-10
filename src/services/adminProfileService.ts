// Admin Profile Service
/* eslint-disable @typescript-eslint/no-explicit-any */
// Handles CRUD operations for admin profiles in Supabase

import { supabase } from '@/lib/supabase';
import type { AdminProfile } from '@/types';

// Database column name mapping for admin_profiles table
interface DatabaseAdminProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  department?: string;
  is_super_admin: boolean;
  permissions?: any; // JSONB
  created_at: string;
  updated_at: string;
}

/**
 * Fetch admin profile data by user ID
 * Works for both 'admin' and 'super_admin' roles
 * Queries the admin_profiles table which has role-specific fields
 */
export async function fetchAdminProfile(userId: string): Promise<AdminProfile | null> {
  try {
    const { data, error } = await supabase
      .from('admin_profiles')
      .select('id, user_id, first_name, last_name, department, is_super_admin, permissions, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching admin profile:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    // Convert snake_case to camelCase
    const profile: AdminProfile = {
      id: data.id,
      userId: data.user_id,
      firstName: data.first_name,
      lastName: data.last_name,
      department: data.department,
      isSuperAdmin: data.is_super_admin,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    };

    return profile;
  } catch (error) {
    console.error('Failed to fetch admin profile:', error);
    throw error;
  }
}

/**
 * Update admin profile data in admin_profiles table
 * Works for both 'admin' and 'super_admin' roles
 */
export async function updateAdminProfile(
  userId: string,
  profile: Partial<AdminProfile>
): Promise<AdminProfile> {
  try {
    // Convert camelCase to snake_case for database
    const updateData: any = {};
    if (profile.firstName !== undefined) updateData.first_name = profile.firstName;
    if (profile.lastName !== undefined) updateData.last_name = profile.lastName;
    if (profile.department !== undefined) updateData.department = profile.department;
    if (profile.permissions !== undefined) updateData.permissions = profile.permissions;

    const { data, error } = await supabase
      .from('admin_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select('id, user_id, first_name, last_name, department, is_super_admin, permissions, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error updating admin profile:', error);
      
      // Provide user-friendly error messages
      if (error.message?.includes('permission denied') || error.message?.includes('policy')) {
        throw new Error('Permission denied. Please ensure you are logged in and have admin privileges.');
      } else if (error.message?.includes('foreign key') || error.message?.includes('violates')) {
        throw new Error('Invalid user reference. Please log out and log in again.');
      } else {
        throw new Error(`Failed to save profile: ${error.message || 'Unknown error'}`);
      }
    }

    if (!data) {
      throw new Error('Profile data was not returned after save. Please try again.');
    }

    // Convert snake_case to camelCase
    const updatedProfile: AdminProfile = {
      id: data.id,
      userId: data.user_id,
      firstName: data.first_name,
      lastName: data.last_name,
      department: data.department,
      isSuperAdmin: data.is_super_admin,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    };

    return updatedProfile;
  } catch (error) {
    console.error('Failed to update admin profile:', error);
    // Re-throw if it's already a custom error message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to save profile. Please try again.');
  }
}

/**
 * Upsert admin profile and update profile completeness in users table
 */
export async function upsertAdminProfile(
  userId: string,
  profile: Partial<AdminProfile>
): Promise<AdminProfile> {
  // First update the admin_profiles table
  const updatedProfile = await updateAdminProfile(userId, profile);
  
  // Then calculate and update profile completeness in users table
  try {
    // Fetch user data to calculate completeness
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name, email, phone')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching user data for completeness calculation:', userError);
      // Don't throw - profile was saved successfully, just skip completeness update
      return updatedProfile;
    }
    
    // Calculate profile completeness
    const basicFields = [userData.name, userData.email, userData.phone];
    const profileFields = [updatedProfile.firstName, updatedProfile.lastName];
    
    const totalFields = basicFields.length + profileFields.length;
    const completedFields = [...basicFields, ...profileFields].filter(field => 
      field !== null && field !== undefined && String(field).trim().length > 0
    ).length;
    
    const profileCompleteness = Math.round((completedFields / totalFields) * 100);
    const profileComplete = profileCompleteness === 100;
    
    // Update users table with completeness status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        profile_complete: profileComplete,
        profile_completeness: profileCompleteness,
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error updating profile completeness in users table:', updateError);
      // Don't throw - profile was saved, just log the error
    }
  } catch (error) {
    console.error('Error calculating/updating profile completeness:', error);
    // Don't throw - profile was saved successfully
  }
  
  return updatedProfile;
}
