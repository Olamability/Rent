// src/pages/auth/Login.tsx
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Building2, Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/routeUtils";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [userType, setUserType] = useState<
    "tenant" | "landlord"
  >("tenant");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } =
    useForm<LoginFormData>({
      resolver: zodResolver(loginSchema),
      defaultValues: { role: userType },
    });

  // ✅ SINGLE redirect point (DB role only)
  const redirectBasedOnRole = useCallback(
    (role: UserRole) => {
      navigate(getDashboardRoute(role), { replace: true });
    },
    [navigate]
  );

  // ✅ Redirect AFTER AuthContext confirms auth
  // Add safety check to prevent redirect loops
  useEffect(() => {
    // Only redirect if we have a valid authenticated user with a role
    // and we're not already in a loading state
    if (!authLoading && isAuthenticated && user?.role) {
      console.log('[Login] User authenticated, redirecting to dashboard:', user.role);
      redirectBasedOnRole(user.role);
    }
  }, [authLoading, isAuthenticated, user, redirectBasedOnRole]);

  // ✅ Submit handler (NO timeout, NO redirect here)
  const onSubmit = async (data: LoginFormData) => {
    setError("");
    setLoading(true);

    try {
      await login(data.email, data.password, userType);
    } catch (err) {
      const error = err as Error & { correctRole?: "tenant" | "landlord" | "admin" | "super_admin" };
      setError(error?.message || "Invalid email or password");
      // Auto-correct role if backend says so
      if (error?.correctRole) {
        setUserType(error.correctRole);
        setValue("role", error.correctRole);
      }
    } finally {
      setLoading(false);
    }
  };

  // Registration message and verification status support
  useEffect(() => {
    // Handle any message from registration
    if (location.state?.message) {
      setError(location.state.message);
    }
    
    // Handle email verification success
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('✅ Email verified successfully! You can now login to your account.');
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
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to your account to continue
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
              setUserType(v as "tenant" | "landlord");
              setValue("role", v as "tenant" | "landlord");
            }}
            className="mb-6"
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="tenant">Tenant</TabsTrigger>
              <TabsTrigger value="landlord">Landlord</TabsTrigger>
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
          </form>

          <p className="mt-6 text-center text-sm">
            Don’t have an account?{" "}
            <Link to="/register" className="text-accent hover:underline">
              Sign up
            </Link>
          </p>
          <p className="mt-2 text-center text-sm">
            <Link to="/admin/login" className="text-muted-foreground hover:text-foreground hover:underline">
              Admin Login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
