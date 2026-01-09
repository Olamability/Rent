// src/pages/auth/AdminForgotPassword.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Mail, ArrowLeft, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

const AdminForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get the current origin for redirect URL
      const redirectUrl = `${window.location.origin}/admin/login`;
      
      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (resetError) throw resetError;

      setSubmitted(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset link';
      setError(errorMessage);
      console.error('Password reset error:', err);
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
          {!submitted ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-6 h-6 text-accent" />
                <h1 className="text-2xl font-bold text-foreground">Admin Password Reset</h1>
              </div>
              <p className="text-muted-foreground mb-6">
                Enter your admin email address and we'll send you instructions to reset your password.
              </p>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Admin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="admin@company.com" 
                      className="pl-10" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use the email address associated with your admin account
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
                </Button>

                <Link 
                  to="/admin/login" 
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to admin login
                </Link>
              </form>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Check your email</h1>
              <p className="text-muted-foreground mb-6 text-center">
                We sent a password reset link to <strong>{email}</strong>
              </p>

              <Alert className="mb-6">
                <AlertDescription>
                  <strong>Important:</strong> For security reasons, the reset link will expire in 1 hour. 
                  If you don't receive the email within a few minutes, please check your spam folder.
                </AlertDescription>
              </Alert>

              <Alert className="mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <AlertDescription className="text-blue-800 dark:text-blue-300">
                  Didn't receive the email?{' '}
                  <button 
                    onClick={() => {
                      setSubmitted(false);
                      setEmail('');
                    }} 
                    className="text-accent font-medium hover:underline"
                  >
                    Try again
                  </button>
                </AlertDescription>
              </Alert>

              <Link to="/admin/login">
                <Button className="w-full">Back to Admin Login</Button>
              </Link>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact your system administrator
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
