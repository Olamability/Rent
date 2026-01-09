// Utility functions for user role display

import { Users, Home, Shield } from "lucide-react";

export type UserRole = 'tenant' | 'landlord' | 'admin' | 'super_admin';

/**
 * Get the appropriate icon for a user role
 */
export const getRoleIcon = (role: string) => {
  switch (role) {
    case 'tenant':
      return Users;
    case 'landlord':
      return Home;
    case 'admin':
    case 'super_admin':
      return Shield;
    default:
      return Users;
  }
};

/**
 * Get the appropriate badge color class for a user role
 */
export const getRoleBadgeColor = (role: string): string => {
  switch (role) {
    case 'tenant':
      return 'bg-blue-500/10 text-blue-500';
    case 'landlord':
      return 'bg-green-500/10 text-green-500';
    case 'admin':
      return 'bg-purple-500/10 text-purple-500';
    case 'super_admin':
      return 'bg-red-500/10 text-red-500';
    default:
      return 'bg-gray-500/10 text-gray-500';
  }
};

/**
 * Get a human-readable display name for a role
 */
export const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'tenant':
      return 'Tenant';
    case 'landlord':
      return 'Landlord';
    case 'admin':
      return 'Admin';
    case 'super_admin':
      return 'Super Admin';
    default:
      return role;
  }
};

/**
 * Get icon color class for a user role
 */
export const getRoleIconColor = (role: string): string => {
  switch (role) {
    case 'tenant':
      return 'text-blue-500';
    case 'landlord':
      return 'text-green-500';
    case 'admin':
      return 'text-purple-500';
    case 'super_admin':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};
