/**
 * Geolocation utilities for property search
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in miles
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const EARTH_RADIUS_MILES = 3959; // Earth's radius in miles
  const DISTANCE_PRECISION_MULTIPLIER = 10; // For rounding to 1 decimal place
  
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
    Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_MILES * c;
  
  return Math.round(distance * DISTANCE_PRECISION_MULTIPLIER) / DISTANCE_PRECISION_MULTIPLIER;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Get user's current location using the Geolocation API
 * @returns Promise with user coordinates or null if denied/unavailable
 */
export const getUserLocation = (): Promise<Coordinates | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  });
};

/**
 * Format distance for display
 * @param distance Distance in miles
 * @returns Formatted string (e.g., "2.5 mi", "< 0.1 mi")
 */
export const formatDistance = (distance: number): string => {
  if (distance < 0.1) {
    return '< 0.1 mi';
  }
  return `${distance} mi`;
};
