// Property Service Adapter
// This adapter provides a unified interface for property operations
// It can use either the backend API or direct Supabase calls based on configuration

import { shouldUseBackend } from '@/lib/apiClient';
import { propertiesAPI, unitsAPI } from './backendApi';
import * as directPropertyService from './propertyService';

/**
 * Fetch public marketplace listings
 * Uses backend API if enabled, otherwise falls back to direct Supabase
 */
export async function fetchPublicMarketplaceListings(limit?: number) {
  if (shouldUseBackend()) {
    try {
      const response = await propertiesAPI.getMarketplaceListings({ limit });
      if (response.error) {
        console.error('Backend API error, falling back to direct Supabase:', response.error);
        return directPropertyService.fetchPublicMarketplaceListings(limit);
      }
      return response.data;
    } catch (error) {
      console.error('Backend API failed, falling back to direct Supabase:', error);
      return directPropertyService.fetchPublicMarketplaceListings(limit);
    }
  }
  
  return directPropertyService.fetchPublicMarketplaceListings(limit);
}

/**
 * Fetch property details
 */
export async function fetchPropertyDetails(propertyId: string) {
  if (shouldUseBackend()) {
    try {
      const response = await propertiesAPI.getProperty(propertyId);
      if (response.error) {
        console.error('Backend API error, falling back to direct Supabase:', response.error);
        return directPropertyService.fetchPropertyById(propertyId);
      }
      return response.data;
    } catch (error) {
      console.error('Backend API failed, falling back to direct Supabase:', error);
      return directPropertyService.fetchPropertyById(propertyId);
    }
  }
  
  return directPropertyService.fetchPropertyById(propertyId);
}

/**
 * Fetch landlord properties
 */
export async function fetchLandlordProperties(landlordId: string) {
  if (shouldUseBackend()) {
    try {
      const response = await propertiesAPI.getProperties({ landlord_id: landlordId });
      if (response.error) {
        console.error('Backend API error, falling back to direct Supabase:', response.error);
        return directPropertyService.fetchLandlordProperties(landlordId);
      }
      return response.data;
    } catch (error) {
      console.error('Backend API failed, falling back to direct Supabase:', error);
      return directPropertyService.fetchLandlordProperties(landlordId);
    }
  }
  
  return directPropertyService.fetchLandlordProperties(landlordId);
}

/**
 * Create a new property
 */
export async function createProperty(propertyData: Record<string, unknown>) {
  if (shouldUseBackend()) {
    try {
      const response = await propertiesAPI.createProperty(propertyData);
      if (response.error) {
        console.error('Backend API error, falling back to direct Supabase:', response.error);
        return directPropertyService.createProperty(propertyData);
      }
      return response.data;
    } catch (error) {
      console.error('Backend API failed, falling back to direct Supabase:', error);
      return directPropertyService.createProperty(propertyData);
    }
  }
  
  return directPropertyService.createProperty(propertyData);
}

/**
 * Update property
 */
export async function updateProperty(propertyId: string, updates: Record<string, unknown>) {
  if (shouldUseBackend()) {
    try {
      const response = await propertiesAPI.updateProperty(propertyId, updates);
      if (response.error) {
        console.error('Backend API error, falling back to direct Supabase:', response.error);
        return directPropertyService.updateProperty(propertyId, updates);
      }
      return response.data;
    } catch (error) {
      console.error('Backend API failed, falling back to direct Supabase:', error);
      return directPropertyService.updateProperty(propertyId, updates);
    }
  }
  
  return directPropertyService.updateProperty(propertyId, updates);
}

/**
 * Delete property
 */
export async function deleteProperty(propertyId: string) {
  if (shouldUseBackend()) {
    try {
      const response = await propertiesAPI.deleteProperty(propertyId);
      if (response.error) {
        console.error('Backend API error, falling back to direct Supabase:', response.error);
        // There's no direct delete in the original service, so we'll just return the error
        throw new Error(response.error.message);
      }
      return response.data;
    } catch (error) {
      console.error('Backend API failed, falling back to direct Supabase:', error);
      throw error;
    }
  }
  
  // Direct Supabase doesn't have deleteProperty exported, would need to be implemented
  throw new Error('Delete property not implemented in direct service');
}

/**
 * Fetch units for a property
 */
export async function fetchPropertyUnits(propertyId: string) {
  if (shouldUseBackend()) {
    try {
      const response = await unitsAPI.getUnits(propertyId);
      if (response.error) {
        console.error('Backend API error, falling back to direct Supabase:', response.error);
        return directPropertyService.fetchPropertyUnits(propertyId);
      }
      return response.data;
    } catch (error) {
      console.error('Backend API failed, falling back to direct Supabase:', error);
      return directPropertyService.fetchPropertyUnits(propertyId);
    }
  }
  
  return directPropertyService.fetchPropertyUnits(propertyId);
}

/**
 * Create a new unit
 */
export async function createUnit(propertyId: string, unitData: Record<string, unknown>) {
  if (shouldUseBackend()) {
    try {
      const response = await unitsAPI.createUnit(propertyId, unitData);
      if (response.error) {
        console.error('Backend API error, falling back to direct Supabase:', response.error);
        return directPropertyService.createUnit(propertyId, unitData);
      }
      return response.data;
    } catch (error) {
      console.error('Backend API failed, falling back to direct Supabase:', error);
      return directPropertyService.createUnit(propertyId, unitData);
    }
  }
  
  return directPropertyService.createUnit(propertyId, unitData);
}

/**
 * Update unit
 */
export async function updateUnit(unitId: string, updates: Record<string, unknown>) {
  if (shouldUseBackend()) {
    try {
      const response = await unitsAPI.updateUnit(unitId, updates);
      if (response.error) {
        console.error('Backend API error, falling back to direct Supabase:', response.error);
        return directPropertyService.updateUnit(unitId, updates);
      }
      return response.data;
    } catch (error) {
      console.error('Backend API failed, falling back to direct Supabase:', error);
      return directPropertyService.updateUnit(unitId, updates);
    }
  }
  
  return directPropertyService.updateUnit(unitId, updates);
}

/**
 * Delete unit
 */
export async function deleteUnit(unitId: string) {
  if (shouldUseBackend()) {
    try {
      const response = await unitsAPI.deleteUnit(unitId);
      if (response.error) {
        console.error('Backend API error, falling back to direct Supabase:', response.error);
        // There's no direct delete in the original service, so we'll just return the error
        throw new Error(response.error.message);
      }
      return response.data;
    } catch (error) {
      console.error('Backend API failed, falling back to direct Supabase:', error);
      throw error;
    }
  }
  
  // Direct Supabase doesn't have deleteUnit exported, would need to be implemented
  throw new Error('Delete unit not implemented in direct service');
}

// Re-export other functions from direct service
// These are utility functions or complex operations that don't need backend API
export {
  fetchPropertyById,
  fetchAvailableProperties,
  incrementUnitViewCount,
  uploadPropertyImages,
  deletePropertyImage,
  searchProperties,
  // ... any other exports from propertyService
} from './propertyService';
