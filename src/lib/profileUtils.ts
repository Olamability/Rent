import type { User, Tenant, Landlord, TenantProfile, LandlordProfile } from '@/types';

/**
 * Helper to check if a value is filled/valid
 */
const isFilled = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !isNaN(value);
  if (typeof value === 'boolean') return true;
  return false;
};

/**
 * Calculate profile completeness percentage for a tenant
 */
export const calculateTenantProfileCompleteness = (user: Tenant): number => {
  const profile = user.profile;
  let completed = 0;
  let total = 0;

  // Basic user info - Required fields
  const basicFields = [
    user.name,
    user.email,
    user.phone,
  ];
  total += basicFields.length;
  completed += basicFields.filter(isFilled).length;

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
 * Calculate profile completeness percentage for a landlord
 */
export const calculateLandlordProfileCompleteness = (user: Landlord): number => {
  const profile = user.profile;
  let completed = 0;
  let total = 0;

  // Basic user info - Required fields
  const basicFields = [
    user.name,
    user.email,
    user.phone,
  ];
  total += basicFields.length;
  completed += basicFields.filter(isFilled).length;

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
 * Calculate profile completeness percentage for any user type
 */
export const calculateProfileCompleteness = (user: User): number => {
  if (user.role === 'tenant') {
    return calculateTenantProfileCompleteness(user as Tenant);
  } else if (user.role === 'landlord') {
    return calculateLandlordProfileCompleteness(user as Landlord);
  }
  
  // For admin or other roles, just check basic fields
  const basicFields = [user.name, user.email, user.phone];
  const completed = basicFields.filter(Boolean).length;
  return Math.round((completed / basicFields.length) * 100);
};

/**
 * Check if profile is complete enough to access features
 */
export const isProfileComplete = (user: User): boolean => {
  const completeness = calculateProfileCompleteness(user);
  // Require 100% completion for both tenant and landlord
  return completeness >= 100;
};
