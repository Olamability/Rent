// src/pages/auth/AdminLogin.tsx
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Building2, Mail, Lock, AlertCircle, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { useAuth } from "@/contexts/AuthContext";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [userType, setUserType] = useState<"admin" | "super_admin">("admin");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } =
    useForm<LoginFormData>({
      resolver: zodResolver(loginSchema),
      defaultValues: { role: userType },
    });

  // Redirect based on role
  const redirectBasedOnRole = useCallback(
    (role: string) => {
      if (role === 'super_admin') {
        navigate("/superadmin/dashboard", { replace: true });
      } else if (role === 'admin') {
        navigate("/admin/dashboard", { replace: true });
      } else {
        // If user is not admin, redirect to their appropriate dashboard
        const dashboardRoutes: Record<string, string> = {
          landlord: '/landlord/dashboard',
          tenant: '/tenant/dashboard',
        };
        navigate(dashboardRoutes[role] || '/login', { replace: true });
      }
    },
    [navigate]
  );

  // Redirect after authentication
  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role) {
      redirectBasedOnRole(user.role);
    }
  }, [authLoading, isAuthenticated, user, redirectBasedOnRole]);

  // Submit handler
  const onSubmit = async (data: LoginFormData) => {
    setError("");
    setLoading(true);

    try {
      await login(data.email, data.password, userType);
    } catch (err) {
      const error = err as Error & { correctRole?: "tenant" | "landlord" | "admin" | "super_admin" };
      
      if (error?.correctRole && (error.correctRole === 'tenant' || error.correctRole === 'landlord')) {
        setError(`You are registered as a ${error.correctRole}, not an admin. Please use the regular login page.`);
      } else {
        setError(error?.message || "Invalid email or password");
      }
      
      // Auto-correct role if backend says it's admin/super_admin
      if (error?.correctRole && (error.correctRole === 'admin' || error.correctRole === 'super_admin')) {
        setUserType(error.correctRole);
        setValue("role", error.correctRole);
      }
    } finally {
      setLoading(false);
    }
  };

  // Registration message and verification status support
  useEffect(() => {
    // Handle registration pending message
    if (location.state?.message) {
      setError(location.state.message);
    }
    
    // Handle email verification success
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('✅ Email verified successfully! Your account is pending admin approval. You can login once approved.');
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
            <Building2 className="w-7 h-7 text-accent-foreground" />
          </div>
          <span className="text-2xl font-bold">RentFlow</span>
        </Link>

        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold">Admin Login</h1>
          </div>
          <p className="text-muted-foreground mb-6">
            Sign in to your admin account
          </p>

          {successMessage && (
            <Alert variant="success" className="mb-6">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs
            value={userType}
            onValueChange={(v) => {
              setUserType(v as "admin" | "super_admin");
              setValue("role", v as "admin" | "super_admin");
            }}
            className="mb-6"
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="super_admin">Super Admin</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("role")} value={userType} />

            <div>
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5" />
                <Input
                  className="pl-10"
                  disabled={loading}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5" />
                <Input
                  type="password"
                  className="pl-10"
                  disabled={loading}
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            
            <div className="text-center">
              <Link 
                to="/admin/forgot-password" 
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          </form>

          <div className="mt-6 space-y-2">
            <p className="text-center text-sm">
              Don't have an admin account?{" "}
              <Link to="/admin/register" className="text-accent hover:underline">
                Register
              </Link>
            </p>
            <p className="text-center text-sm">
              <Link to="/login" className="text-muted-foreground hover:text-foreground hover:underline">
                ← Back to regular login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
