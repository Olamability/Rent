import { useAuth } from "@/contexts/AuthContext";
import { adminNavLinks, superAdminNavLinks } from "@/config/navigation";

/**
 * Hook to get the appropriate navigation links based on user role
 * Returns super admin navigation for super_admin, admin navigation for admin
 */
export const useAdminNavigation = () => {
  const { user } = useAuth();
  
  if (user?.role === 'super_admin') {
    return superAdminNavLinks;
  }
  
  return adminNavLinks;
};
