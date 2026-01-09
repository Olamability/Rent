// Service for managing properties and units
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import type { MarketplaceListing } from '@/types';
import { 
  sanitizeString, 
  isValidUUID, 
  sanitizeObject,
  isValidNumber
} from '@/lib/sanitization';
import { 
  AppError, 
  ErrorCode, 
  parseSupabaseError, 
  logError, 
  validateOrThrow,
  assertDefined 
} from '@/lib/errorHandling';

// Constants
const DEFAULT_PROPERTY_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop';
const DEFAULT_UNIT_VALUES = {
  unitNumber: 'N/A',
  bedrooms: 0,
  bathrooms: 0,
  rentAmount: 0,
  listingStatus: 'unlisted' as const,
};
const DEFAULT_DEPOSIT_MULTIPLIER = 2; // Default deposit is 2x monthly rent
const DEFAULT_TOTAL_UNITS = 1; // Default for single-unit properties

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: 'apartment' | 'house' | 'condo' | 'townhouse';
  description?: string;
  images?: string[];
  amenities?: string[];
  latitude?: number;
  longitude?: number;
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  rentAmount: number;
  deposit?: number;
  squareFeet?: number;
  listingStatus: 'available' | 'applied' | 'rented' | 'unlisted';
  availableDate?: string;
  features?: string[];
  isOccupied?: boolean;
  currentTenantId?: string;
  isPublicListing?: boolean;
  isFeatured?: boolean;
  viewCount?: number;
}

// Database row interfaces (snake_case from Supabase)
interface DbUnit {
  id: string;
  property_id: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  deposit?: number;
  square_feet?: number;
  listing_status: string;
  available_date?: string;
  features?: string[];
  is_occupied?: boolean;
  current_tenant_id?: string;
  is_public_listing?: boolean;
  is_featured?: boolean;
  view_count?: number;
}

interface DbProperty {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  description?: string;
  images?: string[];
  amenities?: string[];
  latitude?: number;
  longitude?: number;
}

interface DbApplicationWithUnit {
  unit_id: string;
  application_status: string;
  units: DbUnit & {
    properties: DbProperty;
  };
}

export interface PropertyWithUnit extends Property {
  unitId: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  rentAmount: number;
  squareFeet?: number;
  listingStatus: string;
  image: string;
}

/**
 * Fetch public marketplace listings for homepage display
 * This shows available properties to unauthenticated users
 */
export async function fetchPublicMarketplaceListings(limit?: number): Promise<MarketplaceListing[]> {
  try {
    // Validate limit parameter
    if (limit !== undefined) {
      validateOrThrow(
        isValidNumber(limit, 1, 100),
        'Limit must be between 1 and 100'
      );
    }

    let query = supabase
      .from('public_property_listings')
      .select('*')
      .order('property_featured', { ascending: false })
      .order('unit_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      const appError = parseSupabaseError(error);
      logError(appError, { function: 'fetchPublicMarketplaceListings', limit });
      throw appError;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform the data to match MarketplaceListing type
    return data.map((item: any) => ({
      unitId: item.unit_id,
      unitNumber: sanitizeString(item.unit_number),
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      squareFeet: item.square_feet,
      rentAmount: item.rent_amount,
      deposit: item.deposit,
      features: Array.isArray(item.features) ? item.features.map(sanitizeString) : [],
      availableDate: item.available_date ? new Date(item.available_date) : undefined,
      isFeatured: item.unit_featured || item.property_featured,
      viewCount: item.view_count || 0,
      propertyId: item.property_id,
      propertyName: sanitizeString(item.property_name),
      address: sanitizeString(`${item.address}, ${item.city}, ${item.state}`),
      city: sanitizeString(item.city),
      state: sanitizeString(item.state),
      zipCode: sanitizeString(item.zip_code),
      propertyType: item.property_type,
      description: sanitizeString(item.description || ''),
      images: Array.isArray(item.images) ? item.images : [],
      amenities: Array.isArray(item.amenities) ? item.amenities.map(sanitizeString) : [],
      latitude: item.latitude,
      longitude: item.longitude,
      landlordId: item.landlord_id,
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = parseSupabaseError(error);
    logError(appError, { function: 'fetchPublicMarketplaceListings' });
    throw appError;
  }
}

/**
 * Increment view count for a unit
 */
export async function incrementUnitViewCount(unitId: string): Promise<void> {
  try {
    // Validate unit ID
    validateOrThrow(
      isValidUUID(unitId),
      'Invalid unit ID format'
    );

    const { error } = await supabase.rpc('increment_unit_view_count', {
      unit_id: unitId,
    });

    if (error) {
      logError(parseSupabaseError(error), { 
        function: 'incrementUnitViewCount', 
        unitId 
      });
      // Don't throw, this is not critical
    }
  } catch (error) {
    logError(error as Error, { function: 'incrementUnitViewCount' });
    // Don't throw, this is not critical
  }
}

/**
 * Fetch all available properties with their units for tenants to browse
 */
export async function fetchAvailableProperties(): Promise<PropertyWithUnit[]> {
  try {
    const { data, error } = await supabase
      .from('units')
      .select(`
        id,
        property_id,
        unit_number,
        bedrooms,
        bathrooms,
        rent_amount,
        square_feet,
        listing_status,
        available_date,
        properties (
          id,
          name,
          address,
          city,
          state,
          zip_code,
          property_type,
          description,
          images,
          amenities,
          latitude,
          longitude
        )
      `)
      .eq('listing_status', 'available')
      .order('rent_amount', { ascending: true });

    if (error) {
      const appError = parseSupabaseError(error);
      logError(appError, { function: 'fetchAvailableProperties' });
      throw appError;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform the data to match the expected format
    return data.map((unit: any) => {
      const property = unit.properties;
      
      if (!property) {
        throw new AppError(
          'Property data missing for unit',
          ErrorCode.DATABASE_ERROR,
          500,
          { unitId: unit.id }
        );
      }
      
      return {
        id: property.id,
        name: sanitizeString(property.name),
        address: sanitizeString(`${property.address}, ${property.city}, ${property.state}`),
        city: sanitizeString(property.city),
        state: sanitizeString(property.state),
        zipCode: sanitizeString(property.zip_code),
        propertyType: property.property_type,
        description: sanitizeString(property.description || ''),
        images: Array.isArray(property.images) ? property.images : [],
        amenities: Array.isArray(property.amenities) ? property.amenities.map(sanitizeString) : [],
        latitude: property.latitude,
        longitude: property.longitude,
        unitId: unit.id,
        unitNumber: sanitizeString(unit.unit_number),
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        rentAmount: unit.rent_amount,
        squareFeet: unit.square_feet,
        listingStatus: unit.listing_status,
        image: property.images?.[0] || DEFAULT_PROPERTY_IMAGE,
      };
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = parseSupabaseError(error);
    logError(appError, { function: 'fetchAvailableProperties' });
    throw appError;
  }
}

/**
 * Fetch properties where the tenant has an active application (approved but not yet paid)
 * These should appear in the marketplace with "Applied" badge
 */
export async function fetchAppliedPropertiesForTenant(tenantId: string): Promise<PropertyWithUnit[]> {
  try {
    // Validate tenant ID
    validateOrThrow(
      isValidUUID(tenantId),
      'Invalid tenant ID format'
    );

    // Get units where this tenant has an approved application
    // Note: We filter by both application_status='approved' AND listing_status='applied'
    // These statuses are synchronized by the application approval workflow:
    // - When landlord approves application -> listing_status changes to 'applied'
    // - When application is withdrawn -> listing_status reverts to 'available'
    // This ensures consistency between application state and unit availability
    const { data, error } = await supabase
      .from('property_applications')
      .select(`
        unit_id,
        application_status,
        units!inner (
          id,
          property_id,
          unit_number,
          bedrooms,
          bathrooms,
          rent_amount,
          square_feet,
          listing_status,
          available_date,
          properties (
            id,
            name,
            address,
            city,
            state,
            zip_code,
            property_type,
            description,
            images,
            amenities,
            latitude,
            longitude
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('application_status', 'approved')
      .eq('units.listing_status', 'applied');

    if (error) {
      const appError = parseSupabaseError(error);
      logError(appError, { function: 'fetchAppliedPropertiesForTenant', tenantId });
      throw appError;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform the data to match the expected format
    return data.map((application: DbApplicationWithUnit) => {
      const unit = application.units;
      const property = unit.properties;
      
      if (!property) {
        throw new AppError(
          'Property data missing for unit',
          ErrorCode.DATABASE_ERROR,
          500,
          { unitId: unit.id }
        );
      }
      
      return {
        id: property.id,
        name: sanitizeString(property.name),
        address: sanitizeString(`${property.address}, ${property.city}, ${property.state}`),
        city: sanitizeString(property.city),
        state: sanitizeString(property.state),
        zipCode: sanitizeString(property.zip_code),
        propertyType: property.property_type,
        description: sanitizeString(property.description || ''),
        images: Array.isArray(property.images) ? property.images : [],
        amenities: Array.isArray(property.amenities) ? property.amenities.map(sanitizeString) : [],
        latitude: property.latitude,
        longitude: property.longitude,
        unitId: unit.id,
        unitNumber: sanitizeString(unit.unit_number),
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        rentAmount: unit.rent_amount,
        squareFeet: unit.square_feet,
        listingStatus: 'applied' as const,
        image: property.images?.[0] || DEFAULT_PROPERTY_IMAGE,
      };
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = parseSupabaseError(error);
    logError(appError, { function: 'fetchAppliedPropertiesForTenant' });
    throw appError;
  }
}

/**
 * Fetch a specific property by ID with all its details
 */
export async function fetchPropertyById(propertyId: string): Promise<Property | null> {
  try {
    // Validate property ID
    validateOrThrow(
      isValidUUID(propertyId),
      'Invalid property ID format'
    );

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .maybeSingle();

    if (error) {
      const appError = parseSupabaseError(error);
      logError(appError, { function: 'fetchPropertyById', propertyId });
      throw appError;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      name: sanitizeString(data.name),
      address: sanitizeString(data.address),
      city: sanitizeString(data.city),
      state: sanitizeString(data.state),
      zipCode: sanitizeString(data.zip_code),
      propertyType: data.property_type,
      description: sanitizeString(data.description || ''),
      images: Array.isArray(data.images) ? data.images : [],
      amenities: Array.isArray(data.amenities) ? data.amenities.map(sanitizeString) : [],
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = parseSupabaseError(error);
    logError(appError, { function: 'fetchPropertyById' });
    throw appError;
  }
}

/**
 * Fetch all properties for a specific landlord
 */
export async function fetchLandlordProperties(landlordId: string): Promise<PropertyWithUnit[]> {
  try {
    // Validate landlord ID
    validateOrThrow(
      isValidUUID(landlordId),
      'Invalid landlord ID format'
    );

    const { data, error } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        address,
        city,
        state,
        zip_code,
        property_type,
        description,
        images,
        amenities,
        latitude,
        longitude,
        units (
          id,
          unit_number,
          bedrooms,
          bathrooms,
          rent_amount,
          square_feet,
          listing_status
        )
      `)
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false });

    if (error) {
      const appError = parseSupabaseError(error);
      logError(appError, { function: 'fetchLandlordProperties', landlordId });
      throw appError;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform the data - for properties with units, create a PropertyWithUnit for each unit
    // For properties without units, create a single PropertyWithUnit with default unit values
    const results: PropertyWithUnit[] = [];

    data.forEach((property: any) => {
      const units = property.units || [];
      
      if (units.length === 0) {
        // Property without units - show the property itself
        results.push({
          id: property.id,
          name: sanitizeString(property.name),
          address: sanitizeString(`${property.address}, ${property.city}, ${property.state}`),
          city: sanitizeString(property.city),
          state: sanitizeString(property.state),
          zipCode: sanitizeString(property.zip_code),
          propertyType: property.property_type,
          description: sanitizeString(property.description || ''),
          images: Array.isArray(property.images) ? property.images : [],
          amenities: Array.isArray(property.amenities) ? property.amenities.map(sanitizeString) : [],
          latitude: property.latitude,
          longitude: property.longitude,
          unitId: property.id, // Use property ID as unit ID placeholder
          unitNumber: DEFAULT_UNIT_VALUES.unitNumber,
          bedrooms: DEFAULT_UNIT_VALUES.bedrooms,
          bathrooms: DEFAULT_UNIT_VALUES.bathrooms,
          rentAmount: DEFAULT_UNIT_VALUES.rentAmount,
          listingStatus: DEFAULT_UNIT_VALUES.listingStatus,
          image: property.images?.[0] || DEFAULT_PROPERTY_IMAGE,
        });
      } else {
        // Property with units - show each unit
        units.forEach((unit: any) => {
          results.push({
            id: property.id,
            name: sanitizeString(property.name),
            address: sanitizeString(`${property.address}, ${property.city}, ${property.state}`),
            city: sanitizeString(property.city),
            state: sanitizeString(property.state),
            zipCode: sanitizeString(property.zip_code),
            propertyType: property.property_type,
            description: sanitizeString(property.description || ''),
            images: Array.isArray(property.images) ? property.images : [],
            amenities: Array.isArray(property.amenities) ? property.amenities.map(sanitizeString) : [],
            latitude: property.latitude,
            longitude: property.longitude,
            unitId: unit.id,
            unitNumber: sanitizeString(unit.unit_number),
            bedrooms: unit.bedrooms,
            bathrooms: unit.bathrooms,
            rentAmount: unit.rent_amount,
            squareFeet: unit.square_feet,
            listingStatus: unit.listing_status,
            image: property.images?.[0] || DEFAULT_PROPERTY_IMAGE,
          });
        });
      }
    });

    return results;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = parseSupabaseError(error);
    logError(appError, { function: 'fetchLandlordProperties' });
    throw appError;
  }
}

/**
 * Fetch all units for a specific property
 */
export async function fetchPropertyUnits(propertyId: string): Promise<Unit[]> {
  try {
    // Validate property ID
    validateOrThrow(
      isValidUUID(propertyId),
      'Invalid property ID format'
    );

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('property_id', propertyId)
      .order('unit_number', { ascending: true });

    if (error) {
      const appError = parseSupabaseError(error);
      logError(appError, { function: 'fetchPropertyUnits', propertyId });
      throw appError;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((unit: DbUnit): Unit => ({
      id: unit.id,
      propertyId: unit.property_id,
      unitNumber: sanitizeString(unit.unit_number),
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      rentAmount: unit.rent_amount,
      squareFeet: unit.square_feet,
      listingStatus: unit.listing_status as Unit['listingStatus'],
      availableDate: unit.available_date,
      isOccupied: unit.is_occupied || false,
      currentTenantId: unit.current_tenant_id || undefined,
      deposit: unit.deposit,
      features: Array.isArray(unit.features) ? unit.features : [],
      isPublicListing: unit.is_public_listing || false,
      isFeatured: unit.is_featured || false,
      viewCount: unit.view_count || 0,
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = parseSupabaseError(error);
    logError(appError, { function: 'fetchPropertyUnits' });
    throw appError;
  }
}

/**
 * Create a new property
 */
export async function createProperty(
  landlordId: string,
  propertyData: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    propertyType: 'apartment' | 'house' | 'condo' | 'townhouse';
    description?: string;
    totalUnits?: number;
    amenities?: string[];
    images?: string[];
  }
): Promise<Property> {
  try {
    // Validate landlord ID
    validateOrThrow(
      isValidUUID(landlordId),
      'Invalid landlord ID format'
    );

    // Validate required fields
    validateOrThrow(
      propertyData.name && propertyData.name.trim().length > 0,
      'Property name is required'
    );
    validateOrThrow(
      propertyData.address && propertyData.address.trim().length > 0,
      'Property address is required'
    );
    validateOrThrow(
      propertyData.city && propertyData.city.trim().length > 0,
      'City is required'
    );
    validateOrThrow(
      propertyData.state && propertyData.state.trim().length > 0,
      'State is required'
    );
    validateOrThrow(
      propertyData.zipCode && propertyData.zipCode.trim().length > 0,
      'Zip code is required'
    );
    validateOrThrow(
      ['apartment', 'house', 'condo', 'townhouse'].includes(propertyData.propertyType),
      'Invalid property type'
    );

    // Validate total units if provided
    if (propertyData.totalUnits !== undefined) {
      validateOrThrow(
        isValidNumber(propertyData.totalUnits, 0, 500),
        'Total units must be between 0 and 500'
      );
    }

    // Sanitize input data
    const sanitizedData = {
      landlord_id: landlordId,
      name: sanitizeString(propertyData.name),
      address: sanitizeString(propertyData.address),
      city: sanitizeString(propertyData.city),
      state: sanitizeString(propertyData.state),
      zip_code: sanitizeString(propertyData.zipCode),
      property_type: propertyData.propertyType,
      description: propertyData.description ? sanitizeString(propertyData.description) : null,
      total_units: propertyData.totalUnits || 0,
      amenities: propertyData.amenities || [],
      images: propertyData.images || [],
    };

    const { data, error } = await supabase
      .from('properties')
      .insert([sanitizedData])
      .select()
      .single();

    if (error) {
      const appError = parseSupabaseError(error);
      logError(appError, { function: 'createProperty', landlordId });
      throw appError;
    }

    assertDefined(data, 'Property data not returned after creation');

    return {
      id: data.id,
      name: sanitizeString(data.name),
      address: sanitizeString(data.address),
      city: sanitizeString(data.city),
      state: sanitizeString(data.state),
      zipCode: sanitizeString(data.zip_code),
      propertyType: data.property_type,
      description: sanitizeString(data.description || ''),
      images: Array.isArray(data.images) ? data.images : [],
      amenities: Array.isArray(data.amenities) ? data.amenities.map(sanitizeString) : [],
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = parseSupabaseError(error);
    logError(appError, { function: 'createProperty' });
    throw appError;
  }
}

/**
 * Create a new unit for a property
 */
export async function createUnit(
  propertyId: string,
  unitData: {
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
    rentAmount: number;
    deposit?: number;
    squareFeet?: number;
    features?: string[];
    availableDate?: string;
    listingStatus?: 'available' | 'applied' | 'rented' | 'unlisted';
  }
): Promise<Unit> {
  try {
    // Validate property ID
    validateOrThrow(
      isValidUUID(propertyId),
      'Invalid property ID format'
    );

    // Validate required fields
    validateOrThrow(
      unitData.unitNumber && unitData.unitNumber.trim().length > 0,
      'Unit number is required'
    );
    validateOrThrow(
      isValidNumber(unitData.bedrooms, 0, 20),
      'Bedrooms must be between 0 and 20'
    );
    validateOrThrow(
      isValidNumber(unitData.bathrooms, 0, 20),
      'Bathrooms must be between 0 and 20'
    );
    validateOrThrow(
      isValidNumber(unitData.rentAmount, 0),
      'Rent amount must be a positive number'
    );

    // Validate deposit if provided
    if (unitData.deposit !== undefined) {
      validateOrThrow(
        isValidNumber(unitData.deposit, 0),
        'Deposit must be a positive number'
      );
    }

    // Validate square feet if provided
    if (unitData.squareFeet !== undefined) {
      validateOrThrow(
        isValidNumber(unitData.squareFeet, 0),
        'Square feet must be a positive number'
      );
    }

    // Validate listing status if provided
    if (unitData.listingStatus !== undefined) {
      validateOrThrow(
        ['available', 'applied', 'rented', 'unlisted'].includes(unitData.listingStatus),
        'Invalid listing status'
      );
    }

    // Sanitize input data
    const sanitizedData = {
      property_id: propertyId,
      unit_number: sanitizeString(unitData.unitNumber),
      bedrooms: unitData.bedrooms,
      bathrooms: unitData.bathrooms,
      rent_amount: unitData.rentAmount,
      deposit: unitData.deposit || unitData.rentAmount * DEFAULT_DEPOSIT_MULTIPLIER,
      square_feet: unitData.squareFeet || null,
      features: unitData.features || [],
      available_date: unitData.availableDate || null,
      listing_status: unitData.listingStatus || 'available',
      // is_public_listing will be set automatically by the trigger
    };

    const { data, error } = await supabase
      .from('units')
      .insert([sanitizedData])
      .select()
      .single();

    if (error) {
      const appError = parseSupabaseError(error);
      logError(appError, { function: 'createUnit', propertyId });
      throw appError;
    }

    assertDefined(data, 'Unit data not returned after creation');

    return {
      id: data.id,
      propertyId: data.property_id,
      unitNumber: sanitizeString(data.unit_number),
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      rentAmount: data.rent_amount,
      squareFeet: data.square_feet,
      listingStatus: data.listing_status,
      availableDate: data.available_date,
      isOccupied: data.is_occupied || false,
      currentTenantId: data.current_tenant_id || undefined,
      deposit: data.deposit,
      features: Array.isArray(data.features) ? data.features : [],
      isPublicListing: data.is_public_listing || false,
      isFeatured: data.is_featured || false,
      viewCount: data.view_count || 0,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = parseSupabaseError(error);
    logError(appError, { function: 'createUnit' });
    throw appError;
  }
}

/**
 * Upload property images to Supabase storage
 */
export async function uploadPropertyImages(
  propertyId: string,
  images: File[]
): Promise<string[]> {
  try {
    validateOrThrow(
      isValidUUID(propertyId),
      'Invalid property ID format'
    );

    validateOrThrow(
      images.length > 0 && images.length <= 10,
      'Must upload between 1 and 10 images'
    );

    const uploadPromises = images.map(async (file, index) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new AppError(
          'Invalid file type. Only images are allowed',
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new AppError(
          'File size must be less than 5MB',
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${propertyId}/${Date.now()}-${index}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('property-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        logError(parseSupabaseError(error), { 
          function: 'uploadPropertyImages', 
          fileName 
        });
        throw parseSupabaseError(error);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      return publicUrl;
    });

    const imageUrls = await Promise.all(uploadPromises);
    return imageUrls;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = parseSupabaseError(error);
    logError(appError, { function: 'uploadPropertyImages' });
    throw appError;
  }
}

/**
 * Delete a property image from Supabase storage
 */
export async function deletePropertyImage(
  propertyId: string,
  imageUrl: string
): Promise<void> {
  try {
    validateOrThrow(
      isValidUUID(propertyId),
      'Invalid property ID format'
    );

    // Extract file path from URL
    // Expected format: https://<supabase-url>/storage/v1/object/public/property-images/<path>
    const bucketPath = '/property-images/';
    const bucketIndex = imageUrl.indexOf(bucketPath);
    
    if (bucketIndex === -1) {
      throw new AppError(
        'Invalid image URL format - bucket path not found',
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    const filePath = imageUrl.substring(bucketIndex + bucketPath.length);
    
    if (!filePath || filePath.trim().length === 0) {
      throw new AppError(
        'Invalid image URL format - empty file path',
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    const { error } = await supabase.storage
      .from('property-images')
      .remove([filePath]);

    if (error) {
      logError(parseSupabaseError(error), { 
        function: 'deletePropertyImage', 
        filePath 
      });
      throw parseSupabaseError(error);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = parseSupabaseError(error);
    logError(appError, { function: 'deletePropertyImage' });
    throw appError;
  }
}

/**
 * Update property details
 */
export async function updateProperty(
  propertyId: string,
  updateData: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    propertyType?: 'apartment' | 'house' | 'condo' | 'townhouse';
    description?: string;
    totalUnits?: number;
    amenities?: string[];
    images?: string[];
  }
): Promise<Property> {
  try {
    // Validate property ID
    validateOrThrow(
      isValidUUID(propertyId),
      'Invalid property ID format'
    );

    // Build update object with only provided fields
    const updateObject: any = {};

    if (updateData.name !== undefined) {
      validateOrThrow(
        updateData.name.trim().length > 0,
        'Property name cannot be empty'
      );
      updateObject.name = sanitizeString(updateData.name);
    }

    if (updateData.address !== undefined) {
      updateObject.address = sanitizeString(updateData.address);
    }

    if (updateData.city !== undefined) {
      updateObject.city = sanitizeString(updateData.city);
    }

    if (updateData.state !== undefined) {
      updateObject.state = sanitizeString(updateData.state);
    }

    if (updateData.zipCode !== undefined) {
      updateObject.zip_code = sanitizeString(updateData.zipCode);
    }

    if (updateData.propertyType !== undefined) {
      validateOrThrow(
        ['apartment', 'house', 'condo', 'townhouse'].includes(updateData.propertyType),
        'Invalid property type'
      );
      updateObject.property_type = updateData.propertyType;
    }

    if (updateData.description !== undefined) {
      updateObject.description = sanitizeString(updateData.description);
    }

    if (updateData.totalUnits !== undefined) {
      validateOrThrow(
        isValidNumber(updateData.totalUnits, 0, 500),
        'Total units must be between 0 and 500'
      );
      updateObject.total_units = updateData.totalUnits;
    }

    if (updateData.amenities !== undefined) {
      updateObject.amenities = updateData.amenities;
    }

    if (updateData.images !== undefined) {
      updateObject.images = updateData.images;
    }

    updateObject.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('properties')
      .update(updateObject)
      .eq('id', propertyId)
      .select()
      .single();

    if (error) {
      const appError = parseSupabaseError(error);
      logError(appError, { function: 'updateProperty', propertyId });
      throw appError;
    }

    assertDefined(data, 'Property data not returned after update');

    return {
      id: data.id,
      name: sanitizeString(data.name),
      address: sanitizeString(data.address),
      city: sanitizeString(data.city),
      state: sanitizeString(data.state),
      zipCode: sanitizeString(data.zip_code),
      propertyType: data.property_type,
      description: sanitizeString(data.description || ''),
      images: Array.isArray(data.images) ? data.images : [],
      amenities: Array.isArray(data.amenities) ? data.amenities.map(sanitizeString) : [],
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = parseSupabaseError(error);
    logError(appError, { function: 'updateProperty' });
    throw appError;
  }
}

/**
 * Update unit details
 */
export async function updateUnit(
  unitId: string,
  updateData: {
    unitNumber?: string;
    bedrooms?: number;
    bathrooms?: number;
    rentAmount?: number;
    squareFeet?: number;
    listingStatus?: 'available' | 'applied' | 'rented' | 'unlisted';
    availableDate?: string;
    isPublicListing?: boolean;
  }
): Promise<Unit> {
  try {
    // Validate unit ID
    validateOrThrow(
      isValidUUID(unitId),
      'Invalid unit ID format'
    );

    // Build update object with only provided fields
    const updateObject: any = {};

    if (updateData.unitNumber !== undefined) {
      updateObject.unit_number = sanitizeString(updateData.unitNumber);
    }

    if (updateData.bedrooms !== undefined) {
      validateOrThrow(
        isValidNumber(updateData.bedrooms, 0, 20),
        'Bedrooms must be between 0 and 20'
      );
      updateObject.bedrooms = updateData.bedrooms;
    }

    if (updateData.bathrooms !== undefined) {
      validateOrThrow(
        isValidNumber(updateData.bathrooms, 0, 20),
        'Bathrooms must be between 0 and 20'
      );
      updateObject.bathrooms = updateData.bathrooms;
    }

    if (updateData.rentAmount !== undefined) {
      validateOrThrow(
        isValidNumber(updateData.rentAmount, 0),
        'Rent amount must be a positive number'
      );
      updateObject.rent_amount = updateData.rentAmount;
    }

    if (updateData.squareFeet !== undefined) {
      validateOrThrow(
        isValidNumber(updateData.squareFeet, 0),
        'Square feet must be a positive number'
      );
      updateObject.square_feet = updateData.squareFeet;
    }

    if (updateData.listingStatus !== undefined) {
      validateOrThrow(
        ['available', 'applied', 'rented', 'unlisted'].includes(updateData.listingStatus),
        'Invalid listing status'
      );
      updateObject.listing_status = updateData.listingStatus;
      
      // Note: The database trigger will automatically set is_public_listing
      // based on listing_status, so we don't need to set it here
    }

    if (updateData.availableDate !== undefined) {
      updateObject.available_date = updateData.availableDate;
    }

    // Allow explicit override only if listingStatus is not being changed
    // This prevents conflicts between automatic and manual settings
    if (updateData.isPublicListing !== undefined && updateData.listingStatus === undefined) {
      updateObject.is_public_listing = updateData.isPublicListing;
    }

    updateObject.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('units')
      .update(updateObject)
      .eq('id', unitId)
      .select()
      .single();

    if (error) {
      const appError = parseSupabaseError(error);
      logError(appError, { function: 'updateUnit', unitId });
      throw appError;
    }

    assertDefined(data, 'Unit data not returned after update');

    return {
      id: data.id,
      propertyId: data.property_id,
      unitNumber: sanitizeString(data.unit_number),
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      rentAmount: data.rent_amount,
      squareFeet: data.square_feet,
      listingStatus: data.listing_status,
      availableDate: data.available_date,
      isOccupied: data.is_occupied || false,
      currentTenantId: data.current_tenant_id || undefined,
      deposit: data.deposit,
      features: Array.isArray(data.features) ? data.features : [],
      isPublicListing: data.is_public_listing || false,
      isFeatured: data.is_featured || false,
      viewCount: data.view_count || 0,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = parseSupabaseError(error);
    logError(appError, { function: 'updateUnit' });
    throw appError;
  }
}

/**
 * Search properties by filters
 */
export async function searchProperties(filters: {
  city?: string;
  state?: string;
  propertyType?: string;
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  bathrooms?: number;
}): Promise<PropertyWithUnit[]> {
  try {
    // Validate filter parameters
    if (filters.minRent !== undefined) {
      validateOrThrow(
        isValidNumber(filters.minRent, 0),
        'Minimum rent must be a positive number'
      );
    }
    if (filters.maxRent !== undefined) {
      validateOrThrow(
        isValidNumber(filters.maxRent, 0),
        'Maximum rent must be a positive number'
      );
    }
    if (filters.bedrooms !== undefined) {
      validateOrThrow(
        isValidNumber(filters.bedrooms, 0, 20),
        'Bedrooms must be between 0 and 20'
      );
    }
    if (filters.bathrooms !== undefined) {
      validateOrThrow(
        isValidNumber(filters.bathrooms, 0, 20),
        'Bathrooms must be between 0 and 20'
      );
    }

    let query = supabase
      .from('units')
      .select(`
        id,
        property_id,
        unit_number,
        bedrooms,
        bathrooms,
        rent_amount,
        square_feet,
        listing_status,
        available_date,
        properties (
          id,
          name,
          address,
          city,
          state,
          zip_code,
          property_type,
          description,
          images,
          amenities,
          latitude,
          longitude
        )
      `)
      .eq('listing_status', 'available');

    // Apply filters
    if (filters.bedrooms) {
      query = query.eq('bedrooms', filters.bedrooms);
    }
    if (filters.bathrooms) {
      query = query.gte('bathrooms', filters.bathrooms);
    }
    if (filters.minRent) {
      query = query.gte('rent_amount', filters.minRent);
    }
    if (filters.maxRent) {
      query = query.lte('rent_amount', filters.maxRent);
    }

    const { data, error } = await query.order('rent_amount', { ascending: true });

    if (error) {
      const appError = parseSupabaseError(error);
      logError(appError, { function: 'searchProperties', filters });
      throw appError;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Filter by property-level criteria and transform
    let results = data.map((unit: any) => {
      const property = unit.properties;
      
      if (!property) {
        throw new AppError(
          'Property data missing for unit',
          ErrorCode.DATABASE_ERROR,
          500,
          { unitId: unit.id }
        );
      }
      
      return {
        id: property.id,
        name: sanitizeString(property.name),
        address: sanitizeString(`${property.address}, ${property.city}, ${property.state}`),
        city: sanitizeString(property.city),
        state: sanitizeString(property.state),
        zipCode: sanitizeString(property.zip_code),
        propertyType: property.property_type,
        description: sanitizeString(property.description || ''),
        images: Array.isArray(property.images) ? property.images : [],
        amenities: Array.isArray(property.amenities) ? property.amenities.map(sanitizeString) : [],
        latitude: property.latitude,
        longitude: property.longitude,
        unitId: unit.id,
        unitNumber: sanitizeString(unit.unit_number),
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        rentAmount: unit.rent_amount,
        listingStatus: unit.listing_status,
        image: property.images?.[0] || DEFAULT_PROPERTY_IMAGE,
      };
    });

    // Apply property-level filters (sanitize search strings)
    if (filters.city) {
      const searchCity = sanitizeString(filters.city).toLowerCase();
      results = results.filter(p => 
        p.city.toLowerCase().includes(searchCity)
      );
    }
    if (filters.state) {
      const searchState = sanitizeString(filters.state).toLowerCase();
      results = results.filter(p => 
        p.state.toLowerCase().includes(searchState)
      );
    }
    if (filters.propertyType) {
      const searchType = sanitizeString(filters.propertyType).toLowerCase();
      results = results.filter(p => 
        p.propertyType.toLowerCase() === searchType
      );
    }

    return results;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const appError = parseSupabaseError(error);
    logError(appError, { function: 'searchProperties' });
    throw appError;
  }
}
