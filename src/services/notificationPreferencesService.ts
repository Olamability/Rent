// Notification Preferences Service
// Handles user notification settings

import { supabase } from '@/lib/supabase';

export interface NotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  rentReminders: boolean;
  maintenanceUpdates: boolean;
  paymentConfirmations: boolean;
  marketingEmails: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailNotifications: true,
  smsNotifications: true,
  pushNotifications: false,
  rentReminders: true,
  maintenanceUpdates: true,
  paymentConfirmations: true,
  marketingEmails: false,
};

/**
 * Get notification preferences for a user
 * Stored in user metadata since there's no dedicated table
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    // Get preferences from user metadata
    const { data: { user } } = await supabase.auth.getUser();
    const preferences = user?.user_metadata?.notification_preferences;

    return {
      ...DEFAULT_PREFERENCES,
      ...preferences,
    };
  } catch (error) {
    console.error('Failed to get notification preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update notification preferences for a user
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  try {
    // Get current preferences
    const currentPreferences = await getNotificationPreferences(userId);
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
    };

    // Update user metadata
    const { error } = await supabase.auth.updateUser({
      data: {
        notification_preferences: updatedPreferences,
      },
    });

    if (error) {
      throw error;
    }

    return updatedPreferences;
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    throw error;
  }
}
