// src/pages/auth/AdminRegister.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Mail, Lock, User, Phone, AlertCircle, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

const AdminRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    password: '', 
    confirmPassword: '',
    adminCode: '' // Special admin code for verification - role is determined by this code
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

    if (!formData.adminCode.trim()) {
      setError('Admin verification code is required');
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
      // ✅ Use Supabase Auth directly - database triggers handle:
      // 1. Admin code verification (validate_admin_registration trigger)
      // 2. Profile creation (handle_new_user trigger)
      // 3. Code marking as used (handle_new_user trigger)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            role: 'admin', // We request admin, but the code determines the actual role
            admin_code: formData.adminCode, // This will be validated by the database trigger
          },
        },
      });

      if (signUpError) {
        console.error('Admin registration error:', signUpError);
        
        // Handle specific error cases
        // Supabase Auth errors may have 'status' or 'message' properties
        const errorMessage = signUpError.message?.toLowerCase() || '';
        const errorStatus = (signUpError as any)?.status;
        
        // Check for admin code validation errors (from database trigger)
        if (errorMessage.includes('admin') && errorMessage.includes('code')) {
          setError('Invalid or expired verification code. Please check your code and try again.');
        } else if (errorStatus === 422 || errorMessage.includes('already') || 
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

      // ✅ SUCCESS - Database triggers handled everything atomically
      setSuccess(true);
      setError('');
      
      console.log('Admin registration successful! User ID:', data.user.id);
      
      // Redirect to admin login after a short delay
      setTimeout(() => {
        navigate('/admin/login', { 
          state: { 
            message: 'Registration successful! Your account is pending administrator approval. You will be notified once approved.',
            email: formData.email
          } 
        });
      }, 2000);
      
    } catch (err) {
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
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
            <Building2 className="w-7 h-7 text-accent-foreground" />
          </div>
          <span className="text-2xl font-bold">RentFlow</span>
        </Link>

        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold">Admin Registration</h1>
          </div>
          <p className="text-muted-foreground mb-6">
            Create your admin account - verification code required
          </p>

          {success && (
            <Alert variant="success" className="mb-6">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Registration successful! Please check your email to verify your account. Your account is pending approval by an administrator.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  name="name"
                  placeholder="John Doe"
                  className="pl-10"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading || success}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  name="email"
                  type="email"
                  placeholder="admin@company.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading || success}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  name="phone"
                  type="tel"
                  placeholder="+1234567890"
                  className="pl-10"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading || success}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Admin Verification Code</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  name="adminCode"
                  type="password"
                  placeholder="Enter admin code"
                  className="pl-10"
                  value={formData.adminCode}
                  onChange={handleChange}
                  disabled={loading || success}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Get this code from your system administrator. The code determines whether you'll be an admin or super admin.
              </p>
            </div>

            <div>
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading || success}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading || success}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || success}>
              {loading ? "Creating Account..." : "Create Admin Account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm">
            Already have an admin account?{" "}
            <Link to="/admin/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;
