// src/pages/auth/WaitingForApproval.tsx
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Clock, CheckCircle, Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute, getProfileRoute } from '@/lib/routeUtils';
import { isProfileComplete } from '@/lib/profileUtils';

const WaitingForApproval = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Redirect to appropriate page based on user status and profile completion
  useEffect(() => {
    if (!user) return;
    
    // Redirect to dashboard if user is approved
    if (user.accountStatus === 'approved') {
      navigate(getDashboardRoute(user.role), { replace: true });
      return;
    }
    
    // Redirect to profile page if profile is incomplete
    // (Waiting page is only for users with complete profiles)
    if (!isProfileComplete(user)) {
      navigate(getProfileRoute(user.role), { replace: true });
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
  };

  const handleViewProfile = () => {
    if (user?.role) {
      navigate(getProfileRoute(user.role));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
            <Building2 className="w-7 h-7 text-accent-foreground" />
          </div>
          <span className="text-2xl font-bold">RentFlow</span>
        </Link>

        {/* Main Card */}
        <Card className="border-2">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mb-4">
              <Clock className="w-10 h-10 text-warning" />
            </div>
            <CardTitle className="text-2xl">Profile Complete - Pending Approval</CardTitle>
            <CardDescription className="text-base mt-2">
              Your profile has been submitted and is waiting for administrator approval
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* User Info */}
            {user && (
              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-300">
                  <strong>Account Details:</strong>
                  <div className="mt-2 space-y-1">
                    <div>Email: <span className="font-medium">{user.email}</span></div>
                    <div>Role: <span className="font-medium capitalize">{user.role.replace('_', ' ')}</span></div>
                    <div>Status: <span className="font-medium text-warning">Pending Approval</span></div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* What happens next */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                What happens next?
              </h3>
              
              <ol className="space-y-3 text-sm text-muted-foreground ml-7">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground min-w-6">1.</span>
                  <span>
                    {user?.role === 'admin' || user?.role === 'super_admin' 
                      ? 'A super administrator will review your completed profile and admin verification code.'
                      : 'An administrator will review your completed profile and registration information.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground min-w-6">2.</span>
                  <span>You'll receive an email notification once your account is approved.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground min-w-6">3.</span>
                  <span>After approval, you can log in and access all features of your dashboard.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground min-w-6">4.</span>
                  <span>You can still access your profile page to review or update information while waiting.</span>
                </li>
              </ol>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4">
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Note:</strong> The approval process typically takes 24-48 hours during business days. 
                  If you have urgent questions, please contact support.
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleViewProfile}
                >
                  View Profile
                </Button>
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={() => window.location.reload()}
                >
                  Check Status
                </Button>
              </div>
            </div>

            {/* Footer Links */}
            <div className="pt-4 border-t text-center text-sm text-muted-foreground">
              <p>
                Need help?{' '}
                <Link to="/support" className="text-accent hover:underline font-medium">
                  Contact Support
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            This is a security feature to ensure only verified users access the platform.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WaitingForApproval;
