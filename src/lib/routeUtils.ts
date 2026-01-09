// src/lib/routeUtils.ts
import type { UserRole } from '@/types';

/**
 * Map user roles to their dashboard routes
 */
export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  landlord: '/landlord/dashboard',
  tenant: '/tenant/dashboard',
  admin: '/admin/dashboard',
  super_admin: '/superadmin/dashboard',
};

/**
 * Map user roles to their profile routes
 */
export const PROFILE_ROUTES: Record<UserRole, string> = {
  landlord: '/landlord/profile',
  tenant: '/tenant/profile',
  admin: '/admin/profile',
  super_admin: '/superadmin/profile',
};

/**
 * Get the dashboard route for a given role
 * @throws {Error} If role is invalid
 */
export const getDashboardRoute = (role: UserRole): string => {
  const route = DASHBOARD_ROUTES[role];
  if (!route) {
    console.error(`Invalid role provided to getDashboardRoute: ${role}`);
    // Fallback to tenant dashboard as the most common case
    return DASHBOARD_ROUTES.tenant;
  }
  return route;
};

/**
 * Get the profile route for a given role
 * @throws {Error} If role is invalid
 */
export const getProfileRoute = (role: UserRole): string => {
  const route = PROFILE_ROUTES[role];
  if (!route) {
    console.error(`Invalid role provided to getProfileRoute: ${role}`);
    // Fallback to tenant profile as the most common case
    return PROFILE_ROUTES.tenant;
  }
  return route;
};
