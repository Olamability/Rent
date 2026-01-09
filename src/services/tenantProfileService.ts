// Tenant Profile Service
// Handles all CRUD operations for tenant profiles in Supabase

import { supabase } from '@/lib/supabase';
import type { TenantProfile, User } from '@/types';
import { updateProfileCompletionStatus } from '@/lib/profileCompletionUtils';

// Database column name mapping
// Frontend uses camelCase, database uses snake_case
interface DatabaseTenantProfile {
  id?: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  national_id?: string;
  current_lease_id?: string;
  application_status?: 'pending' | 'approved' | 'rejected';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  employment?: {
    status?: 'employed' | 'self-employed' | 'unemployed' | 'student' | 'retired';
    employer?: string;
    position?: string;
    monthlyIncome?: number;
    yearsEmployed?: number;
  };
  emergency_contact?: {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  };
  refs?: Array<{
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  }>;
  previous_address?: {
    street?: string;
    city?: string;
    state?: string;
    duration?: string;
    landlordName?: string;
    landlordPhone?: string;
  };
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch tenant profile by user ID
 */
export async function fetchTenantProfile(userId: string): Promise<TenantProfile | null> {
  try {
    const { data, error } = await supabase
      .from('tenant_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching tenant profile:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    // Convert database format to frontend format
    return convertFromDatabaseFormat(data);
  } catch (error) {
    console.error('Failed to fetch tenant profile:', error);
    throw error;
  }
}

/**
 * Create a new tenant profile
 */
export async function createTenantProfile(
  userId: string,
  profile: Partial<TenantProfile>
): Promise<TenantProfile> {
  try {
    const dbProfile = convertToDatabaseFormat(userId, profile);

    const { data, error } = await supabase
      .from('tenant_profiles')
      .insert(dbProfile)
      .select()
      .single();

    if (error) {
      console.error('Error creating tenant profile:', error);
      throw error;
    }

    return convertFromDatabaseFormat(data);
  } catch (error) {
    console.error('Failed to create tenant profile:', error);
    throw error;
  }
}

/**
 * Update existing tenant profile
 */
export async function updateTenantProfile(
  userId: string,
  profile: Partial<TenantProfile>
): Promise<TenantProfile> {
  try {
    const dbProfile = convertToDatabaseFormat(userId, profile);
    
    // Remove user_id from update payload as it's the key field and shouldn't change
    const { user_id, ...updateData } = dbProfile;

    const { data, error } = await supabase
      .from('tenant_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating tenant profile:', error);
      throw error;
    }

    return convertFromDatabaseFormat(data);
  } catch (error) {
    console.error('Failed to update tenant profile:', error);
    throw error;
  }
}

/**
 * Upsert tenant profile (create if doesn't exist, update if exists)
 * Uses Supabase's native upsert for atomic operation
 */
export async function upsertTenantProfile(
  userId: string,
  profile: Partial<TenantProfile>
): Promise<TenantProfile> {
  try {
    const dbProfile = convertToDatabaseFormat(userId, profile);

    const { data, error } = await supabase
      .from('tenant_profiles')
      .upsert(dbProfile, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting tenant profile:', error);
      
      // Provide user-friendly error messages
      if (error.message?.includes('permission denied') || error.message?.includes('policy')) {
        throw new Error('Permission denied. Please ensure you are logged in and have the correct role. If this issue persists, contact support.');
      } else if (error.message?.includes('duplicate key') || error.message?.includes('unique')) {
        throw new Error('Profile already exists. Please try refreshing the page.');
      } else if (error.message?.includes('foreign key') || error.message?.includes('violates')) {
        throw new Error('Invalid user reference. Please log out and log in again.');
      } else {
        throw new Error(`Failed to save profile: ${error.message || 'Unknown error'}`);
      }
    }

    if (!data) {
      throw new Error('Profile data was not returned after save. Please try again.');
    }

    return convertFromDatabaseFormat(data);
  } catch (error) {
    console.error('Failed to upsert tenant profile:', error);
    // Re-throw if it's already a custom error message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to save profile. Please try again.');
  }
}

/**
 * Upsert tenant profile with profile completion status update
 * This function saves the profile AND updates the profile_complete/profile_completeness fields
 */
export async function upsertTenantProfileWithCompletion(
  userId: string,
  user: Pick<User, 'name' | 'email' | 'phone'>,
  profile: Partial<TenantProfile>
): Promise<{ profile: TenantProfile; profileComplete: boolean; profileCompleteness: number }> {
  try {
    // First, save the profile
    const savedProfile = await upsertTenantProfile(userId, profile);
    
    // Then update the profile completion status in users table
    const completionStatus = await updateProfileCompletionStatus(userId, 'tenant', user, savedProfile);
    
    return {
      profile: savedProfile,
      ...completionStatus,
    };
  } catch (error) {
    console.error('Failed to save tenant profile with completion status:', error);
    throw error;
  }
}

/**
 * Delete tenant profile
 */
export async function deleteTenantProfile(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('tenant_profiles')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting tenant profile:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to delete tenant profile:', error);
    throw error;
  }
}

/**
 * Convert database format (snake_case) to frontend format (camelCase)
 */
function convertFromDatabaseFormat(dbProfile: DatabaseTenantProfile): TenantProfile {
  return {
    firstName: dbProfile.first_name,
    lastName: dbProfile.last_name,
    dateOfBirth: dbProfile.date_of_birth,
    nationalId: dbProfile.national_id,
    address: {
      street: dbProfile.address?.street ?? '',
      city: dbProfile.address?.city ?? '',
      state: dbProfile.address?.state ?? '',
      zipCode: dbProfile.address?.zipCode ?? '',
      country: dbProfile.address?.country ?? '',
    },
    employment: dbProfile.employment
      ? {
          status: dbProfile.employment.status ?? 'unemployed',
          employer: dbProfile.employment.employer,
          position: dbProfile.employment.position,
          monthlyIncome: dbProfile.employment.monthlyIncome,
          yearsEmployed: dbProfile.employment.yearsEmployed,
        }
      : {
          status: 'unemployed',
        },
    emergencyContact: dbProfile.emergency_contact
      ? {
          name: dbProfile.emergency_contact.name ?? '',
          relationship: dbProfile.emergency_contact.relationship ?? '',
          phone: dbProfile.emergency_contact.phone ?? '',
          email: dbProfile.emergency_contact.email,
        }
      : { name: '', relationship: '', phone: '' },
    refs: dbProfile.refs
      ? dbProfile.refs.map(ref => ({
          name: ref.name ?? '',
          relationship: ref.relationship ?? '',
          phone: ref.phone ?? '',
          email: ref.email,
        }))
      : [],
    previousAddress: {
      street: dbProfile.previous_address?.street ?? '',
      city: dbProfile.previous_address?.city ?? '',
      state: dbProfile.previous_address?.state ?? '',
      duration: dbProfile.previous_address?.duration ?? '',
      landlordName: dbProfile.previous_address?.landlordName ?? '',
      landlordPhone: dbProfile.previous_address?.landlordPhone ?? '',
    },
  };
}

/**
 * Convert frontend format (camelCase) to database format (snake_case)
 */
function convertToDatabaseFormat(
  userId: string,
  profile: Partial<TenantProfile>
): Partial<DatabaseTenantProfile> {
  return {
    user_id: userId,
    first_name: profile.firstName,
    last_name: profile.lastName,
    date_of_birth: profile.dateOfBirth,
    national_id: profile.nationalId,
    address: profile.address,
    employment: profile.employment,
    emergency_contact: profile.emergencyContact,
    refs: profile.refs,
    previous_address: profile.previousAddress,
  };
}
