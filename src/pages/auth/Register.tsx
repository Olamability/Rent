// src/pages/auth/Register.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Mail, Lock, User, Phone, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

const Register = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<'tenant' | 'landlord'>('tenant');
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Full name is required');
      return false;
    }
    
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Valid email is required');
      return false;
    }
    
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);

    // Validate form
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // ✅ Use Supabase Auth directly - database triggers handle profile creation
      // Send role in metadata so the trigger can properly set it
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            role: userType, // tenant or landlord - trigger will use this
          },
        },
      });

      if (signUpError) {
        console.error('Registration error:', signUpError);
        
        // Handle specific error cases
        // Supabase Auth errors may have 'status' or 'message' properties
        const errorMessage = signUpError.message?.toLowerCase() || '';
        const errorStatus = (signUpError as any)?.status;
        
        if (errorStatus === 422 || errorMessage.includes('already') || 
            errorMessage.includes('exists') || errorMessage.includes('registered')) {
          setError('This email is already registered. Please try logging in instead.');
        } else {
          setError(signUpError.message || 'Registration failed. Please try again.');
        }
        return;
      }

      if (!data.user) {
        setError('Registration failed. Please try again.');
        return;
      }

      // ✅ SUCCESS - Database triggers handled profile creation atomically
      setSuccess(true);
      setError(''); // Clear any previous errors
      
      // Redirect after 3 seconds
      setTimeout(() => navigate('/login'), 3000);

    } catch (err: unknown) {
      console.error('Unexpected registration error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(`An unexpected error occurred: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
            <Building2 className="w-7 h-7 text-accent-foreground" />
          </div>
          <span className="text-2xl font-bold">RentFlow</span>
        </Link>

        {/* Registration Card */}
        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-foreground mb-2">Create an account</h1>
          <p className="text-muted-foreground mb-6">Join RentFlow to simplify property management</p>

          {error && (
            <Alert variant={success ? "default" : "destructive"} className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-success text-success bg-success/10">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Registration successful! Please check your email to confirm your account. Once confirmed, you can log in and complete your profile. Your account will require administrator approval after profile completion.
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={userType} onValueChange={(v) => setUserType(v as 'tenant' | 'landlord')} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tenant">I'm a Tenant</TabsTrigger>
              <TabsTrigger value="landlord">I'm a Landlord</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="name" 
                  name="name" 
                  type="text" 
                  placeholder="John Doe" 
                  className="pl-10" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  className="pl-10" 
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="phone" 
                  name="phone" 
                  type="tel" 
                  placeholder="+1 (555) 000-0000" 
                  className="pl-10" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  placeholder="•••••••• (min. 8 characters)" 
                  className="pl-10" 
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">Must be at least 8 characters long</p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10" 
                  value={formData.confirmPassword} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                />
              </div>
            </div>

            {/* Approval Note */}
            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> After confirming your email, you can log in and complete your profile. Your account will require administrator approval after profile completion before you can access all features.
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="mr-2">⏳</span>
                  Creating account...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Account Created!
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-accent font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          {/* Information Note */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Registration Flow:</strong> After registration, confirm your email, then log in to complete your profile. Once your profile is complete, an administrator will review and approve your account.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="text-accent hover:underline">Terms of Service</Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;