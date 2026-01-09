// Audit Log Service
/* eslint-disable @typescript-eslint/no-explicit-any */
// Handles fetching and creating audit log entries

import { supabase } from '@/lib/supabase';

// TypeScript interface for database audit log record
interface AuditLogRecord {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, unknown>;
  created_at: string;
  ip_address?: string;
  users?: { name?: string } | null;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  admin_id?: string;
  admin_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes?: any;
  created_at: string;
  ip_address?: string;
}

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Fetch audit logs with optional filters and pagination
 */
export async function fetchAuditLogs(
  filters: AuditLogFilters = {},
  page: number = 1,
  pageSize: number = 25
): Promise<{
  logs: AuditLogEntry[];
  total: number;
  error?: string;
}> {
  try {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        users!audit_logs_user_id_fkey(name)
      `, { count: 'exact' });

    // Apply filters
    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    // Apply pagination and ordering
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return {
        logs: [],
        total: 0,
        error: error.message,
      };
    }

    // Transform data to include admin name
    const logs = (data || []).map((log: AuditLogRecord) => ({
      id: log.id,
      user_id: log.user_id,
      admin_name: log.users?.name || 'System',
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      changes: log.changes,
      created_at: log.created_at,
      ip_address: log.ip_address,
    }));

    return {
      logs,
      total: count || 0,
    };
  } catch (err) {
    console.error('Unexpected error fetching audit logs:', err);
    return {
      logs: [],
      total: 0,
      error: 'Failed to fetch audit logs',
    };
  }
}

/**
 * Create a new audit log entry
 */
export async function createAuditLog(entry: {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes?: Record<string, unknown>;
  ip_address?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      ...entry,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error creating audit log:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error creating audit log:', err);
    return {
      success: false,
      error: 'Failed to create audit log',
    };
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(
  startDate?: string,
  endDate?: string
): Promise<{
  totalLogs: number;
  uniqueAdmins: number;
  actionCounts: Record<string, number>;
}> {
  try {
    let query = supabase.from('audit_logs').select('*');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit log stats:', error);
      return {
        totalLogs: 0,
        uniqueAdmins: 0,
        actionCounts: {},
      };
    }

    const logs = data || [];
    const uniqueAdmins = new Set(logs.map(log => log.user_id)).size;
    const actionCounts: Record<string, number> = {};

    logs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    return {
      totalLogs: logs.length,
      uniqueAdmins,
      actionCounts,
    };
  } catch (err) {
    console.error('Unexpected error fetching audit log stats:', err);
    return {
      totalLogs: 0,
      uniqueAdmins: 0,
      actionCounts: {},
    };
  }
}

/**
 * Export audit logs to CSV
 */
export function exportAuditLogsToCSV(logs: AuditLogEntry[]): string {
  const headers = ['Timestamp', 'Admin', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Changes'];
  const rows = logs.map(log => [
    new Date(log.created_at).toLocaleString(),
    log.admin_name || 'Unknown',
    log.action,
    log.entity_type,
    log.entity_id,
    log.ip_address || 'N/A',
    JSON.stringify(log.changes || {}),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}
