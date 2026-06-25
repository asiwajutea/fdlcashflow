import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import fdlLogo from '@/assets/fdl-logo.jpg';

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      // Cooldown for resend
      setCooldown(60);
      const t = setInterval(() => setCooldown(c => { if (c <= 1) { clearInterval(t); } return c - 1; }), 1000);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-8 py-8 text-center">
            <img src={fdlLogo} alt="FDL" className="h-14 w-14 rounded-full object-cover mx-auto mb-4 ring-4 ring-white/20" />
            <h1 className="text-white font-bold text-xl">Forgot Password</h1>
            <p className="text-white/70 text-sm mt-1">We'll send you a reset link</p>
          </div>

          <div className="px-8 py-8 space-y-6">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Check your email</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We sent a password reset link to <strong className="text-foreground">{email}</strong>.
                  The link expires in 1 hour.
                </p>

                <div className="bg-muted/40 rounded-xl p-4 space-y-3 text-left">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Steps</p>
                  {[
                    'Open the email from Footprints Dynasty',
                    'Click "Reset Password" in the email',
                    'Choose a strong new password',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-sm text-foreground">{s}</p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">Didn't receive it? Check spam, or resend below.</p>

                <Button
                  onClick={handleSubmit as any}
                  disabled={loading || cooldown > 0}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend reset email'}
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Mail className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Reset your password</h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your account email and we'll send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="reset-email">Email address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      autoFocus
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={loading || !email.trim()}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    {loading ? 'Sending…' : 'Send Reset Link'}
                  </Button>
                </form>
              </>
            )}

            <div className="pt-2 border-t text-center">
              <Link to="/auth" className="text-sm text-primary hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Footprints Dynasty Limited
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
