/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getUserLocation, calculateDistance, type Coordinates } from '@/lib/geolocation';

interface PropertyWithDistance {
  id: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  [key: string]: any;
}

interface UseLocationSortOptions {
  autoRequest?: boolean;
}

export const useLocationSort = <T extends PropertyWithDistance>(
  properties: T[],
  options: UseLocationSortOptions = {}
) => {
  const { autoRequest = false } = options;
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);

  const requestUserLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    setHasRequestedLocation(true);

    try {
      const location = await getUserLocation();
      if (location) {
        setUserLocation(location);
      } else {
        setLocationError('Unable to get your location. Please enable location services.');
      }
    } catch (error) {
      setLocationError('Failed to get location. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  // Auto-request location if enabled
  useEffect(() => {
    if (autoRequest && !hasRequestedLocation) {
      requestUserLocation();
    }
  }, [autoRequest, hasRequestedLocation, requestUserLocation]);

  // Calculate distances and sort properties
  const sortedProperties = useMemo(() => {
    if (!userLocation) {
      return properties;
    }

    return [...properties]
      .map((property) => {
        if (property.latitude && property.longitude) {
          const distance = calculateDistance(userLocation, {
            latitude: property.latitude,
            longitude: property.longitude,
          });
          return { ...property, distance };
        }
        return property;
      })
      .sort((a, b) => {
        // Properties with distance come first, sorted by distance
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        if (a.distance !== undefined) return -1;
        if (b.distance !== undefined) return 1;
        return 0;
      });
  }, [properties, userLocation]);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setLocationError(null);
  }, []);

  return {
    sortedProperties,
    userLocation,
    isLoadingLocation,
    locationError,
    hasLocationEnabled: !!userLocation,
    requestUserLocation,
    clearLocation,
  };
};
