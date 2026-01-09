// src/pages/auth/ForgotPassword.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      setSubmitted(true);
    } catch (err: unknown) {
      alert(err.message || 'Failed to send reset link');
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
              <h1 className="text-2xl font-bold text-foreground mb-2">Forgot password?</h1>
              <p className="text-muted-foreground mb-6">No worries, we'll send you reset instructions.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="you@example.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Reset Password'}
                </Button>

                <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to login
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
                  Didn't receive the email? Check your spam folder or{' '}
                  <button onClick={() => setSubmitted(false)} className="text-accent font-medium hover:underline">
                    try again
                  </button>
                </AlertDescription>
              </Alert>

              <Link to="/login">
                <Button className="w-full">Back to Login</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
