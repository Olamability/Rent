// Service for managing system configuration
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string; // Required to match admin type
  category: 'general' | 'payment' | 'email' | 'security' | 'api' | 'feature_flags' | 'features';
  isSensitive?: boolean;
  updatedBy: string; // Required to match admin type
  updatedByName?: string;
  updatedAt: string;
  createdAt?: string;
}

/**
 * Fetch all system configurations with optional filters
 */
export async function fetchSystemConfigs(
  filters?: {
    category?: string;
  }
): Promise<SystemConfig[]> {
  try {
    let query = supabase
      .from('system_config')
      .select(`
        id,
        config_key,
        config_value,
        description,
        config_category,
        is_sensitive,
        updated_by,
        updated_at,
        created_at,
        updater:users!system_config_updated_by_fkey (
          name
        )
      `)
      .order('config_category')
      .order('config_key');

    // Apply filters
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('config_category', filters.category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching system configs:', error);
      throw error;
    }

    return (data || []).map((config: any) => ({
      id: config.id,
      key: config.config_key,
      value: config.is_sensitive ? '********' : config.config_value,
      description: config.description || 'No description', // Always provide description
      category: config.config_category,
      isSensitive: config.is_sensitive,
      updatedBy: config.updated_by || 'system', // Always provide updatedBy
      updatedByName: config.updater?.name || undefined,
      updatedAt: config.updated_at,
      createdAt: config.created_at,
    }));
  } catch (error) {
    console.error('Error in fetchSystemConfigs:', error);
    throw error;
  }
}

/**
 * Fetch a specific configuration by key
 */
export async function getConfigByKey(key: string): Promise<SystemConfig | null> {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select(`
        id,
        config_key,
        config_value,
        description,
        config_category,
        is_sensitive,
        updated_by,
        updated_at,
        created_at
      `)
      .eq('config_key', key)
      .maybeSingle();

    if (error) {
      console.error('Error fetching config by key:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      key: data.config_key,
      value: data.config_value,
      description: data.description || 'No description',
      category: data.config_category,
      isSensitive: data.is_sensitive,
      updatedBy: data.updated_by || undefined,
      updatedAt: data.updated_at,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('Error in getConfigByKey:', error);
    throw error;
  }
}

/**
 * Create a new system configuration
 */
export async function createSystemConfig(
  config: Omit<SystemConfig, 'id' | 'createdAt' | 'updatedAt' | 'updatedByName'>,
  userId: string
): Promise<SystemConfig> {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .insert({
        config_key: config.key,
        config_value: config.value,
        description: config.description || null,
        config_category: config.category,
        is_sensitive: config.isSensitive,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating system config:', error);
      throw error;
    }

    return {
      id: data.id,
      key: data.config_key,
      value: data.config_value,
      description: data.description || 'No description',
      category: data.config_category,
      isSensitive: data.is_sensitive,
      updatedBy: data.updated_by || undefined,
      updatedAt: data.updated_at,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('Error in createSystemConfig:', error);
    throw error;
  }
}

/**
 * Update an existing system configuration
 */
export async function updateSystemConfig(
  configId: string,
  updates: Partial<Omit<SystemConfig, 'id' | 'key' | 'createdAt' | 'updatedAt' | 'updatedByName'>>,
  userId: string
): Promise<void> {
  try {
    const updateData: any = {
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    if (updates.value !== undefined) updateData.config_value = updates.value;
    if (updates.description !== undefined) updateData.description = updates.description || null;
    if (updates.category !== undefined) updateData.config_category = updates.category;
    if (updates.isSensitive !== undefined) updateData.is_sensitive = updates.isSensitive;

    const { error } = await supabase
      .from('system_config')
      .update(updateData)
      .eq('id', configId);

    if (error) {
      console.error('Error updating system config:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateSystemConfig:', error);
    throw error;
  }
}

/**
 * Delete a system configuration
 */
export async function deleteSystemConfig(configId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('system_config')
      .delete()
      .eq('id', configId);

    if (error) {
      console.error('Error deleting system config:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteSystemConfig:', error);
    throw error;
  }
}

/**
 * Get configuration counts by category
 */
export async function getConfigCategoryCounts(): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_category');

    if (error) {
      console.error('Error fetching config category counts:', error);
      throw error;
    }

    const counts: Record<string, number> = {
      general: 0,
      payment: 0,
      email: 0,
      security: 0,
      api: 0,
      feature_flags: 0,
    };

    (data || []).forEach((config: unknown) => {
      counts[config.config_category] = (counts[config.config_category] || 0) + 1;
    });

    return counts;
  } catch (error) {
    console.error('Error in getConfigCategoryCounts:', error);
    throw error;
  }
}

/**
 * Initialize default system configurations (run once during setup)
 */
export async function initializeDefaultConfigs(adminUserId: string): Promise<void> {
  try {
    const defaultConfigs = [
      {
        key: 'PLATFORM_NAME',
        value: 'RentFlow',
        description: 'The name of the platform displayed across the application',
        category: 'general' as const,
        isSensitive: false,
      },
      {
        key: 'SUPPORT_EMAIL',
        value: 'support@rentflow.com',
        description: 'Primary support email address',
        category: 'general' as const,
        isSensitive: false,
      },
      {
        key: 'PAYMENT_GATEWAY',
        value: 'Paystack',
        description: 'Primary payment gateway for processing transactions',
        category: 'payment' as const,
        isSensitive: false,
      },
      {
        key: 'SMTP_HOST',
        value: 'smtp.gmail.com',
        description: 'SMTP server host for sending emails',
        category: 'email' as const,
        isSensitive: false,
      },
      {
        key: 'SMTP_PORT',
        value: '587',
        description: 'SMTP server port',
        category: 'email' as const,
        isSensitive: false,
      },
      {
        key: 'MAX_LOGIN_ATTEMPTS',
        value: '5',
        description: 'Maximum number of failed login attempts before account lockout',
        category: 'security' as const,
        isSensitive: false,
      },
      {
        key: 'SESSION_TIMEOUT',
        value: '3600',
        description: 'Session timeout in seconds (1 hour)',
        category: 'security' as const,
        isSensitive: false,
      },
    ];

    for (const config of defaultConfigs) {
      // Check if config already exists
      const existing = await getConfigByKey(config.key);
      if (!existing) {
        await createSystemConfig(config, adminUserId);
      }
    }
  } catch (error) {
    console.error('Error initializing default configs:', error);
    throw error;
  }
}
