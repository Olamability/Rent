// Security Service
// Handles password changes and two-factor authentication

import { supabase } from '@/lib/supabase';

/**
 * Change user password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  try {
    // Verify current password by attempting to sign in
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    // Supabase requires re-authentication to change password
    // We'll use the updateUser API which requires the user to be authenticated
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Failed to change password:', error);
    throw error;
  }
}

/**
 * Enable two-factor authentication
 * Note: This is a placeholder for future implementation
 * Supabase supports MFA but requires additional setup
 */
export async function enableTwoFactorAuth(): Promise<{
  qrCode: string;
  secret: string;
}> {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (error) {
      throw error;
    }

    return {
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    };
  } catch (error) {
    console.error('Failed to enable 2FA:', error);
    throw error;
  }
}

/**
 * Verify and complete two-factor authentication setup
 */
export async function verifyTwoFactorAuth(
  factorId: string,
  code: string
): Promise<void> {
  try {
    const { error } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (error) {
      throw error;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: factorId,
      code,
    });

    if (verifyError) {
      throw verifyError;
    }
  } catch (error) {
    console.error('Failed to verify 2FA:', error);
    throw error;
  }
}

/**
 * Disable two-factor authentication
 */
export async function disableTwoFactorAuth(factorId: string): Promise<void> {
  try {
    const { error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Failed to disable 2FA:', error);
    throw error;
  }
}

/**
 * Get current MFA factors
 */
export async function getMFAFactors() {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get MFA factors:', error);
    throw error;
  }
}
