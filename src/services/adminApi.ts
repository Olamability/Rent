// API Service Layer for Admin Operations
/* eslint-disable @typescript-eslint/no-explicit-any */
// This provides a clean interface for all backend API calls

import { 
  User, 
  UserFilters, 
  SupportTicket, 
  TicketFilters, 
  Subscription, 
  SubscriptionFilters,
  SystemConfig,
  AuditLog,
  PlatformAnnouncement,
  PaginationParams
} from '@/types/admin';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Token management helper
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('adminToken');
  }
  return null;
};

// Generic API request handler
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'An error occurred');
    }

    return { success: true, data };
  } catch (error) {
    console.error('API Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// User Management APIs
export const userApi = {
  // List users with filters and pagination
  list: async (filters: UserFilters = {}, pagination: PaginationParams = { page: 1, pageSize: 10 }) => {
    const params = new URLSearchParams();
    params.append('page', pagination.page.toString());
    params.append('pageSize', pagination.pageSize.toString());
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return apiRequest<{ users: User[]; total: number }>(`/admin/users?${params}`);
  },

  // Get single user details
  getById: async (id: string) => {
    return apiRequest<User>(`/admin/users/${id}`);
  },

  // Update user
  update: async (id: string, data: Partial<User>) => {
    return apiRequest<User>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete user
  delete: async (id: string) => {
    return apiRequest<void>(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Suspend user
  suspend: async (id: string, reason: string) => {
    return apiRequest<User>(`/admin/users/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Approve user
  approve: async (id: string) => {
    return apiRequest<User>(`/admin/users/${id}/approve`, {
      method: 'POST',
    });
  },

  // Flag user for fraud
  flagFraud: async (id: string, reason: string) => {
    return apiRequest<User>(`/admin/users/${id}/flag-fraud`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Bulk operations
  bulkAction: async (action: 'suspend' | 'delete' | 'approve', userIds: string[]) => {
    return apiRequest<void>(`/admin/users/bulk-action`, {
      method: 'POST',
      body: JSON.stringify({ action, userIds }),
    });
  },

  // Export users
  export: async (filters: UserFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return apiRequest<Blob>(`/admin/users/export?${params}`);
  },
};

// Support Ticket APIs
export const ticketApi = {
  // List tickets
  list: async (filters: TicketFilters = {}, pagination: PaginationParams = { page: 1, pageSize: 10 }) => {
    const params = new URLSearchParams();
    params.append('page', pagination.page.toString());
    params.append('pageSize', pagination.pageSize.toString());
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return apiRequest<{ tickets: SupportTicket[]; total: number }>(`/admin/tickets?${params}`);
  },

  // Get ticket details
  getById: async (id: string) => {
    return apiRequest<SupportTicket>(`/admin/tickets/${id}`);
  },

  // Update ticket status
  updateStatus: async (id: string, status: SupportTicket['status']) => {
    return apiRequest<SupportTicket>(`/admin/tickets/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // Add message to ticket
  addMessage: async (id: string, message: string, isInternal: boolean = false) => {
    return apiRequest<SupportTicket>(`/admin/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, isInternal }),
    });
  },

  // Export tickets
  export: async (filters: TicketFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return apiRequest<Blob>(`/admin/tickets/export?${params}`);
  },
};

// Subscription APIs
export const subscriptionApi = {
  // List subscriptions
  list: async (filters: SubscriptionFilters = {}, pagination: PaginationParams = { page: 1, pageSize: 10 }) => {
    const params = new URLSearchParams();
    params.append('page', pagination.page.toString());
    params.append('pageSize', pagination.pageSize.toString());
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return apiRequest<{ subscriptions: Subscription[]; total: number }>(`/admin/subscriptions?${params}`);
  },

  // Get subscription details
  getById: async (id: string) => {
    return apiRequest<Subscription>(`/admin/subscriptions/${id}`);
  },

  // Update subscription
  update: async (id: string, data: Partial<Subscription>) => {
    return apiRequest<Subscription>(`/admin/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Export subscriptions
  export: async (filters: SubscriptionFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return apiRequest<Blob>(`/admin/subscriptions/export?${params}`);
  },
};

// Analytics APIs
export const analyticsApi = {
  // Get user growth data
  getUserGrowth: async (range: string = '30d') => {
    return apiRequest<any>(`/admin/analytics/user-growth?range=${range}`);
  },

  // Get revenue data
  getRevenue: async (range: string = '30d') => {
    return apiRequest<any>(`/admin/analytics/revenue?range=${range}`);
  },

  // Get user distribution
  getDistribution: async () => {
    return apiRequest<any>(`/admin/analytics/distribution`);
  },

  // Get activity metrics
  getActivity: async (range: string = '7d') => {
    return apiRequest<any>(`/admin/analytics/activity?range=${range}`);
  },

  // Export analytics
  export: async (range: string = '30d') => {
    return apiRequest<Blob>(`/admin/analytics/export?range=${range}`);
  },
};

// System Configuration APIs
export const configApi = {
  // List configurations
  list: async () => {
    return apiRequest<SystemConfig[]>(`/admin/config`);
  },

  // Get configuration
  getById: async (id: string) => {
    return apiRequest<SystemConfig>(`/admin/config/${id}`);
  },

  // Create configuration
  create: async (data: Omit<SystemConfig, 'id' | 'updatedAt' | 'updatedBy'>) => {
    return apiRequest<SystemConfig>(`/admin/config`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update configuration
  update: async (id: string, data: Partial<SystemConfig>) => {
    return apiRequest<SystemConfig>(`/admin/config/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete configuration
  delete: async (id: string) => {
    return apiRequest<void>(`/admin/config/${id}`, {
      method: 'DELETE',
    });
  },
};

// Audit Log APIs
export const auditLogApi = {
  // List audit logs
  list: async (filters: any = {}, pagination: PaginationParams = { page: 1, pageSize: 25 }) => {
    const params = new URLSearchParams();
    params.append('page', pagination.page.toString());
    params.append('pageSize', pagination.pageSize.toString());
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return apiRequest<{ logs: AuditLog[]; total: number }>(`/admin/audit-log?${params}`);
  },

  // Create audit log (usually done automatically by backend)
  create: async (data: Omit<AuditLog, 'id' | 'timestamp'>) => {
    return apiRequest<AuditLog>(`/admin/audit-log`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Export audit logs
  export: async (filters: any = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return apiRequest<Blob>(`/admin/audit-log/export?${params}`);
  },
};

// Platform Announcements APIs
export const announcementApi = {
  // List announcements
  list: async () => {
    return apiRequest<PlatformAnnouncement[]>(`/admin/announcements`);
  },

  // Get announcement
  getById: async (id: string) => {
    return apiRequest<PlatformAnnouncement>(`/admin/announcements/${id}`);
  },

  // Create announcement
  create: async (data: Omit<PlatformAnnouncement, 'id'>) => {
    return apiRequest<PlatformAnnouncement>(`/admin/announcements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update announcement
  update: async (id: string, data: Partial<PlatformAnnouncement>) => {
    return apiRequest<PlatformAnnouncement>(`/admin/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete announcement
  delete: async (id: string) => {
    return apiRequest<void>(`/admin/announcements/${id}`, {
      method: 'DELETE',
    });
  },

  // Toggle announcement active status
  toggleActive: async (id: string) => {
    return apiRequest<PlatformAnnouncement>(`/admin/announcements/${id}/toggle`, {
      method: 'PUT',
    });
  },
};

// Dashboard APIs
export const dashboardApi = {
  // Get dashboard stats
  getStats: async () => {
    return apiRequest<any>(`/admin/dashboard/stats`);
  },

  // Get recent activity
  getActivity: async (limit: number = 10) => {
    return apiRequest<any>(`/admin/dashboard/activity?limit=${limit}`);
  },

  // Get platform health
  getHealth: async () => {
    return apiRequest<any>(`/admin/dashboard/health`);
  },

  // Get alerts
  getAlerts: async () => {
    return apiRequest<any>(`/admin/dashboard/alerts`);
  },
};

// Export all APIs
export const adminApi = {
  users: userApi,
  tickets: ticketApi,
  subscriptions: subscriptionApi,
  analytics: analyticsApi,
  config: configApi,
  auditLog: auditLogApi,
  announcements: announcementApi,
  dashboard: dashboardApi,
};
