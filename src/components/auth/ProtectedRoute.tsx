import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';
import { isProfileComplete } from '@/lib/profileUtils';
import { getDashboardRoute, getProfileRoute } from '@/lib/routeUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
  requireCompleteProfile?: boolean;
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
  redirectTo = '/login',
  requireCompleteProfile = true,
}: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Block access for suspended or banned users
  // Allow pending users to complete profile first
  if (user) {
    if (user.accountStatus === 'suspended') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Account Suspended</h2>
            <p className="text-muted-foreground mb-6">
              Your account has been suspended. Please contact support for more information.
            </p>
            <button 
              onClick={() => logout()}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90"
            >
              Logout
            </button>
          </div>
        </div>
      );
    }
    
    if (user.accountStatus === 'banned') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Account Banned</h2>
            <p className="text-muted-foreground mb-6">
              Your account has been banned. Please contact support if you believe this is an error.
            </p>
            <button 
              onClick={() => logout()}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90"
            >
              Logout
            </button>
          </div>
        </div>
      );
    }
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user role
    return <Navigate to={getDashboardRoute(user.role)} replace />;
  }

  // Check profile completion for tenant and landlord routes
  // Priority order:
  // 1. If profile incomplete -> redirect to profile page (can only access profile)
  // 2. If profile complete but pending approval -> redirect to waiting page
  // 3. If approved -> allow full access
  if (user && (user.role === 'tenant' || user.role === 'landlord')) {
    const isProfilePage = location.pathname.includes('/profile');
    const isWaitingPage = location.pathname.includes('/waiting-for-approval');
    const profileComplete = isProfileComplete(user);
    
    // If profile is not complete, user can ONLY access profile page
    // Always redirect to profile page when incomplete (no sessionStorage check)
    if (!profileComplete && !isProfilePage && requireCompleteProfile) {
      // Redirect to profile page to complete profile
      return <Navigate to={getProfileRoute(user.role)} replace />;
    }
    
    // If profile is complete but account is pending, redirect to waiting page
    // Allow access to profile page for review/editing
    if (profileComplete && user.accountStatus === 'pending' && !isWaitingPage && !isProfilePage) {
      return <Navigate to="/waiting-for-approval" replace />;
    }
  }

  return <>{children}</>;
};
