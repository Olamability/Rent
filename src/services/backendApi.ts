// Backend API Service
// This service provides typed interfaces for all backend API endpoints
// It acts as a bridge between the frontend services and the backend API

import { apiClient, shouldUseBackend } from '@/lib/apiClient';
import type { UserRole } from '@/types';

/**
 * Authentication API
 */
export const authAPI = {
  /**
   * Register a new user
   */
  async register(data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role: UserRole;
  }) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.post('/auth/register', data);
  },

  /**
   * Login user
   */
  async login(data: { email: string; password: string }) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.post('/auth/login', data);
  },

  /**
   * Logout user
   */
  async logout() {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.post('/auth/logout');
  },

  /**
   * Get current user session
   */
  async getSession() {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.get('/auth/session');
  },
};

/**
 * User API
 */
export const userAPI = {
  /**
   * Get user by ID
   */
  async getUser(userId: string) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.get(`/user/${userId}`);
  },

  /**
   * Update user profile
   */
  async updateUser(userId: string, data: Record<string, unknown>) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.put(`/user/${userId}`, data);
  },

  /**
   * Get user profile with role-specific data
   */
  async getUserProfile(userId: string) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.get(`/user/${userId}/profile`);
  },
};

/**
 * Properties API
 */
export const propertiesAPI = {
  /**
   * Get all properties
   */
  async getProperties(params?: {
    landlord_id?: string;
    city?: string;
    state?: string;
    property_type?: string;
    limit?: number;
    offset?: number;
  }) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString();
    return apiClient.get(`/properties${query ? `?${query}` : ''}`);
  },

  /**
   * Get property by ID
   */
  async getProperty(propertyId: string) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.get(`/properties/${propertyId}`);
  },

  /**
   * Create a new property
   */
  async createProperty(data: Record<string, unknown>) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.post('/properties', data);
  },

  /**
   * Update property
   */
  async updateProperty(propertyId: string, data: Record<string, unknown>) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.put(`/properties/${propertyId}`, data);
  },

  /**
   * Delete property
   */
  async deleteProperty(propertyId: string) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.delete(`/properties/${propertyId}`);
  },

  /**
   * Get public marketplace listings
   */
  async getMarketplaceListings(params?: {
    limit?: number;
    city?: string;
    state?: string;
    min_rent?: number;
    max_rent?: number;
    bedrooms?: number;
  }) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString();
    return apiClient.get(`/properties/marketplace${query ? `?${query}` : ''}`);
  },
};

/**
 * Units API
 */
export const unitsAPI = {
  /**
   * Get units for a property
   */
  async getUnits(propertyId: string) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.get(`/properties/${propertyId}/units`);
  },

  /**
   * Get unit by ID
   */
  async getUnit(unitId: string) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.get(`/units/${unitId}`);
  },

  /**
   * Create a new unit
   */
  async createUnit(propertyId: string, data: Record<string, unknown>) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.post(`/properties/${propertyId}/units`, data);
  },

  /**
   * Update unit
   */
  async updateUnit(unitId: string, data: Record<string, unknown>) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.put(`/units/${unitId}`, data);
  },

  /**
   * Delete unit
   */
  async deleteUnit(unitId: string) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.delete(`/units/${unitId}`);
  },
};

/**
 * Payments API
 */
export const paymentsAPI = {
  /**
   * Get payment history for a tenant
   */
  async getPaymentHistory(tenantId: string, params?: { limit?: number }) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    const queryParams = new URLSearchParams();
    if (params?.limit) {
      queryParams.append('limit', String(params.limit));
    }
    
    const query = queryParams.toString();
    return apiClient.get(`/payments/tenant/${tenantId}${query ? `?${query}` : ''}`);
  },

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.get(`/payments/${paymentId}`);
  },

  /**
   * Create a payment
   */
  async createPayment(data: Record<string, unknown>) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.post('/payments', data);
  },

  /**
   * Update payment status
   */
  async updatePayment(paymentId: string, data: Record<string, unknown>) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.put(`/payments/${paymentId}`, data);
  },

  /**
   * Verify payment from Paystack
   */
  async verifyPayment(reference: string) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.post('/payments/verify', { reference });
  },
};

/**
 * Maintenance API
 */
export const maintenanceAPI = {
  /**
   * Get maintenance requests
   */
  async getMaintenanceRequests(params?: {
    tenant_id?: string;
    landlord_id?: string;
    status?: string;
    priority?: string;
    limit?: number;
  }) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString();
    return apiClient.get(`/maintenance${query ? `?${query}` : ''}`);
  },

  /**
   * Get maintenance request by ID
   */
  async getMaintenanceRequest(requestId: string) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.get(`/maintenance/${requestId}`);
  },

  /**
   * Create maintenance request
   */
  async createMaintenanceRequest(data: Record<string, unknown>) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.post('/maintenance', data);
  },

  /**
   * Update maintenance request
   */
  async updateMaintenanceRequest(requestId: string, data: Record<string, unknown>) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.put(`/maintenance/${requestId}`, data);
  },

  /**
   * Add update to maintenance request
   */
  async addMaintenanceUpdate(requestId: string, data: Record<string, unknown>) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.post(`/maintenance/${requestId}/updates`, data);
  },
};

/**
 * Admin API
 */
export const adminAPI = {
  /**
   * Register admin with verification code
   */
  async register(data: {
    email: string;
    password: string;
    full_name: string;
    phone: string;
    admin_code: string;
  }) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.post('/admin/register', data);
  },

  /**
   * Get all users (admin only)
   */
  async getUsers(params?: {
    role?: UserRole;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const query = queryParams.toString();
    return apiClient.get(`/admin/users${query ? `?${query}` : ''}`);
  },

  /**
   * Update user status (approve, suspend, ban)
   */
  async updateUserStatus(userId: string, status: string) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.put(`/admin/users/${userId}/status`, { status });
  },

  /**
   * Get platform statistics
   */
  async getStatistics() {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.get('/admin/statistics');
  },

  /**
   * Create announcement
   */
  async createAnnouncement(data: Record<string, unknown>) {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.post('/admin/announcements', data);
  },
};

/**
 * Test API connection
 */
export const testAPI = {
  /**
   * Test backend connection
   */
  async test() {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.get('/test');
  },

  /**
   * Health check
   */
  async health() {
    if (!shouldUseBackend()) {
      throw new Error('Backend API is not enabled');
    }
    
    return apiClient.get('/health');
  },
};

// Export all API modules
export default {
  auth: authAPI,
  user: userAPI,
  properties: propertiesAPI,
  units: unitsAPI,
  payments: paymentsAPI,
  maintenance: maintenanceAPI,
  admin: adminAPI,
  test: testAPI,
};
