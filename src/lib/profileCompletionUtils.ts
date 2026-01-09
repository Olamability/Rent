// Profile Completion Utilities
// Helper functions to check and update profile completion status

import { supabase } from './supabase';
import type { User, TenantProfile, LandlordProfile } from '@/types';

/**
 * Helper to check if a value is filled/valid
 */
const isFilled = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !isNaN(value) && value > 0;
  if (typeof value === 'boolean') return true;
  return false;
};

/**
 * Check if tenant profile is complete (all required fields filled)
 */
export const isTenantProfileComplete = (
  user: Pick<User, 'name' | 'email' | 'phone'>,
  profile: Partial<TenantProfile> | null | undefined
): boolean => {
  // Basic user info - Required fields
  const basicComplete = isFilled(user.name) && isFilled(user.email) && isFilled(user.phone);
  
  // If no profile data, can't be complete (consistent with percentage calculation)
  if (!profile) return false;

  // Personal info - Required fields
  const personalComplete = 
    isFilled(profile.firstName) &&
    isFilled(profile.lastName) &&
    isFilled(profile.dateOfBirth) &&
    isFilled(profile.nationalId);

  // Address fields - Required
  const addressComplete =
    isFilled(profile.address?.street) &&
    isFilled(profile.address?.city) &&
    isFilled(profile.address?.state) &&
    isFilled(profile.address?.zipCode);

  // Employment info - Required fields
  const employmentComplete =
    isFilled(profile.employment?.status) &&
    isFilled(profile.employment?.employer) &&
    isFilled(profile.employment?.position) &&
    isFilled(profile.employment?.monthlyIncome);

  // Emergency contact - Required fields
  const emergencyComplete =
    isFilled(profile.emergencyContact?.name) &&
    isFilled(profile.emergencyContact?.relationship) &&
    isFilled(profile.emergencyContact?.phone);

  // All sections must be complete for profile to be considered complete
  return basicComplete && personalComplete && addressComplete && employmentComplete && emergencyComplete;
};

/**
 * Check if landlord profile is complete (all required fields filled)
 */
export const isLandlordProfileComplete = (
  user: Pick<User, 'name' | 'email' | 'phone'>,
  profile: Partial<LandlordProfile> | null | undefined
): boolean => {
  // Basic user info - Required fields
  const basicComplete = isFilled(user.name) && isFilled(user.email) && isFilled(user.phone);
  
  // If no profile data, can't be complete (consistent with percentage calculation)
  if (!profile) return false;

  // Personal info - Required fields
  const personalComplete =
    isFilled(profile.firstName) &&
    isFilled(profile.lastName) &&
    isFilled(profile.dateOfBirth) &&
    isFilled(profile.nationalId);

  // Address fields - Required
  const addressComplete =
    isFilled(profile.address?.street) &&
    isFilled(profile.address?.city) &&
    isFilled(profile.address?.state) &&
    isFilled(profile.address?.zipCode);

  // Business info - Only required if registered as business
  let businessComplete = true;
  if (profile.businessInfo?.registeredBusiness) {
    businessComplete =
      isFilled(profile.businessInfo.businessName) &&
      isFilled(profile.businessInfo.businessRegistrationNumber);
  }

  // Bank details - Required fields for rent collection
  const bankComplete =
    isFilled(profile.bankDetails?.bankName) &&
    isFilled(profile.bankDetails?.accountNumber) &&
    isFilled(profile.bankDetails?.accountName);

  // All sections must be complete for profile to be considered complete
  return basicComplete && personalComplete && addressComplete && businessComplete && bankComplete;
};

/**
 * Calculate tenant profile completeness percentage
 * Returns 0-100 representing the percentage of required fields that are filled
 * Note: Even without a profile object, basic fields contribute to the percentage
 */
export const calculateTenantCompleteness = (
  user: Pick<User, 'name' | 'email' | 'phone'>,
  profile: Partial<TenantProfile> | null | undefined
): number => {
  let completed = 0;
  let total = 0;

  // Basic user info - Required fields
  const basicFields = [user.name, user.email, user.phone];
  total += basicFields.length;
  completed += basicFields.filter(isFilled).length;

  // If no profile data, return percentage based on basic fields only
  if (!profile) return Math.round((completed / total) * 100);

  // Personal info - Required fields
  const personalFields = [
    profile.firstName,
    profile.lastName,
    profile.dateOfBirth,
    profile.nationalId,
  ];
  total += personalFields.length;
  completed += personalFields.filter(isFilled).length;

  // Address fields - Required
  const addressFields = [
    profile.address?.street,
    profile.address?.city,
    profile.address?.state,
    profile.address?.zipCode,
  ];
  total += addressFields.length;
  completed += addressFields.filter(isFilled).length;

  // Employment info - Required fields
  const employmentFields = [
    profile.employment?.status,
    profile.employment?.employer,
    profile.employment?.position,
    profile.employment?.monthlyIncome,
  ];
  total += employmentFields.length;
  completed += employmentFields.filter(isFilled).length;

  // Emergency contact - Required fields
  const emergencyFields = [
    profile.emergencyContact?.name,
    profile.emergencyContact?.relationship,
    profile.emergencyContact?.phone,
  ];
  total += emergencyFields.length;
  completed += emergencyFields.filter(isFilled).length;

  return Math.round((completed / total) * 100);
};

/**
 * Calculate landlord profile completeness percentage
 * Returns 0-100 representing the percentage of required fields that are filled
 * Note: Even without a profile object, basic fields contribute to the percentage
 */
export const calculateLandlordCompleteness = (
  user: Pick<User, 'name' | 'email' | 'phone'>,
  profile: Partial<LandlordProfile> | null | undefined
): number => {
  let completed = 0;
  let total = 0;

  // Basic user info - Required fields
  const basicFields = [user.name, user.email, user.phone];
  total += basicFields.length;
  completed += basicFields.filter(isFilled).length;

  // If no profile data, return percentage based on basic fields only
  if (!profile) return Math.round((completed / total) * 100);

  // Personal info - Required fields
  const personalFields = [
    profile.firstName,
    profile.lastName,
    profile.dateOfBirth,
    profile.nationalId,
  ];
  total += personalFields.length;
  completed += personalFields.filter(isFilled).length;

  // Address fields - Required
  const addressFields = [
    profile.address?.street,
    profile.address?.city,
    profile.address?.state,
    profile.address?.zipCode,
  ];
  total += addressFields.length;
  completed += addressFields.filter(isFilled).length;

  // Business info - Only count if registered as business
  if (profile.businessInfo?.registeredBusiness) {
    const businessFields = [
      profile.businessInfo.businessName,
      profile.businessInfo.businessRegistrationNumber,
    ];
    total += businessFields.length;
    completed += businessFields.filter(isFilled).length;
  }

  // Bank details - Required fields for rent collection
  const bankFields = [
    profile.bankDetails?.bankName,
    profile.bankDetails?.accountNumber,
    profile.bankDetails?.accountName,
  ];
  total += bankFields.length;
  completed += bankFields.filter(isFilled).length;

  return Math.round((completed / total) * 100);
};

/**
 * Update user profile completion status in the database
 * This should be called after saving a tenant or landlord profile
 */
export const updateProfileCompletionStatus = async (
  userId: string,
  role: 'tenant' | 'landlord',
  user: Pick<User, 'name' | 'email' | 'phone'>,
  profile: Partial<TenantProfile | LandlordProfile> | null | undefined
): Promise<{ profileComplete: boolean; profileCompleteness: number }> => {
  try {
    let profileComplete: boolean;
    let profileCompleteness: number;

    if (role === 'tenant') {
      profileComplete = isTenantProfileComplete(user, profile as Partial<TenantProfile>);
      profileCompleteness = calculateTenantCompleteness(user, profile as Partial<TenantProfile>);
    } else {
      profileComplete = isLandlordProfileComplete(user, profile as Partial<LandlordProfile>);
      profileCompleteness = calculateLandlordCompleteness(user, profile as Partial<LandlordProfile>);
    }

    // Update the users table with completion status
    const { error } = await supabase
      .from('users')
      .update({
        profile_complete: profileComplete,
        profile_completeness: profileCompleteness,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile completion status:', error);
      throw error;
    }

    return { profileComplete, profileCompleteness };
  } catch (error) {
    console.error('Failed to update profile completion status:', error);
    throw error;
  }
};
