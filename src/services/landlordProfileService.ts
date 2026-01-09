// Landlord Profile Service
// Handles all CRUD operations for landlord profiles in Supabase

import { supabase } from '@/lib/supabase';
import type { LandlordProfile, User } from '@/types';
import { updateProfileCompletionStatus } from '@/lib/profileCompletionUtils';

// Database column name mapping
// Frontend uses camelCase, database uses snake_case
interface DatabaseLandlordProfile {
  id?: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  national_id?: string;
  is_pro?: boolean;
  subscription_plan?: 'free' | 'pro';
  subscription_status?: 'active' | 'cancelled' | 'expired';
  subscription_expiry?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  business_info?: {
    registeredBusiness?: boolean;
    businessName?: string;
    businessRegistrationNumber?: string;
    taxId?: string;
  };
  bank_details?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    routingNumber?: string;
  };
  verification_documents?: {
    idCardUrl?: string;
    proofOfOwnershipUrl?: string;
    businessRegistrationUrl?: string;
  };
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch landlord profile by user ID
 */
export async function fetchLandlordProfile(userId: string): Promise<LandlordProfile | null> {
  try {
    const { data, error } = await supabase
      .from('landlord_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching landlord profile:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    // Convert database format to frontend format
    return convertFromDatabaseFormat(data);
  } catch (error) {
    console.error('Failed to fetch landlord profile:', error);
    throw error;
  }
}

/**
 * Create a new landlord profile
 */
export async function createLandlordProfile(
  userId: string,
  profile: Partial<LandlordProfile>
): Promise<LandlordProfile> {
  try {
    const dbProfile = convertToDatabaseFormat(userId, profile);

    const { data, error } = await supabase
      .from('landlord_profiles')
      .insert(dbProfile)
      .select()
      .single();

    if (error) {
      console.error('Error creating landlord profile:', error);
      throw error;
    }

    return convertFromDatabaseFormat(data);
  } catch (error) {
    console.error('Failed to create landlord profile:', error);
    throw error;
  }
}

/**
 * Update existing landlord profile
 */
export async function updateLandlordProfile(
  userId: string,
  profile: Partial<LandlordProfile>
): Promise<LandlordProfile> {
  try {
    const dbProfile = convertToDatabaseFormat(userId, profile);
    
    // Remove user_id from update payload as it's the key field and shouldn't change
    const { user_id, ...updateData } = dbProfile;

    const { data, error } = await supabase
      .from('landlord_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating landlord profile:', error);
      throw error;
    }

    return convertFromDatabaseFormat(data);
  } catch (error) {
    console.error('Failed to update landlord profile:', error);
    throw error;
  }
}

/**
 * Upsert landlord profile (create if doesn't exist, update if exists)
 * Uses Supabase's native upsert for atomic operation
 */
export async function upsertLandlordProfile(
  userId: string,
  profile: Partial<LandlordProfile>
): Promise<LandlordProfile> {
  try {
    const dbProfile = convertToDatabaseFormat(userId, profile);

    const { data, error } = await supabase
      .from('landlord_profiles')
      .upsert(dbProfile, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting landlord profile:', error);
      
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
    console.error('Failed to upsert landlord profile:', error);
    // Re-throw if it's already a custom error message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to save profile. Please try again.');
  }
}

/**
 * Upsert landlord profile with profile completion status update
 * This function saves the profile AND updates the profile_complete/profile_completeness fields
 */
export async function upsertLandlordProfileWithCompletion(
  userId: string,
  user: Pick<User, 'name' | 'email' | 'phone'>,
  profile: Partial<LandlordProfile>
): Promise<{ profile: LandlordProfile; profileComplete: boolean; profileCompleteness: number }> {
  try {
    // First, save the profile
    const savedProfile = await upsertLandlordProfile(userId, profile);
    
    // Then update the profile completion status in users table
    const completionStatus = await updateProfileCompletionStatus(userId, 'landlord', user, savedProfile);
    
    return {
      profile: savedProfile,
      ...completionStatus,
    };
  } catch (error) {
    console.error('Failed to save landlord profile with completion status:', error);
    throw error;
  }
}

/**
 * Delete landlord profile
 */
export async function deleteLandlordProfile(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('landlord_profiles')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting landlord profile:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to delete landlord profile:', error);
    throw error;
  }
}

/**
 * Convert database format (snake_case) to frontend format (camelCase)
 */
function convertFromDatabaseFormat(dbProfile: DatabaseLandlordProfile): LandlordProfile {
  return {
    firstName: dbProfile.first_name,
    lastName: dbProfile.last_name,
    dateOfBirth: dbProfile.date_of_birth,
    nationalId: dbProfile.national_id,
    address: dbProfile.address,
    businessInfo: dbProfile.business_info,
    bankDetails: dbProfile.bank_details,
    verificationDocuments: dbProfile.verification_documents,
    subscriptionPlan: dbProfile.subscription_plan,
    subscriptionStatus: dbProfile.subscription_status,
  };
}

/**
 * Convert frontend format (camelCase) to database format (snake_case)
 */
function convertToDatabaseFormat(
  userId: string,
  profile: Partial<LandlordProfile>
): Partial<DatabaseLandlordProfile> {
  return {
    user_id: userId,
    first_name: profile.firstName,
    last_name: profile.lastName,
    date_of_birth: profile.dateOfBirth,
    national_id: profile.nationalId,
    address: profile.address,
    business_info: profile.businessInfo,
    bank_details: profile.bankDetails,
    verification_documents: profile.verificationDocuments,
    subscription_plan: profile.subscriptionPlan,
    subscription_status: profile.subscriptionStatus,
  };
}
