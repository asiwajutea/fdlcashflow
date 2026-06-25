import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, KeyRound, CheckCircle2, XCircle, Loader2, ShieldCheck } from 'lucide-react';
import fdlLogo from '@/assets/fdl-logo.jpg';

// Password strength checker
function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)   score++;
  if (pw.length >= 12)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak',      color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Fair',      color: 'bg-amber-500' };
  if (score <= 3) return { score, label: 'Good',      color: 'bg-yellow-500' };
  if (score <= 4) return { score, label: 'Strong',    color: 'bg-emerald-500' };
  return                { score, label: 'Very Strong', color: 'bg-emerald-600' };
}

const ResetPassword = () => {
  const navigate      = useNavigate();
  const { toast }     = useToast();
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [showCf, setShowCf]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  // Supabase handles the recovery token in the URL hash automatically
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(!!data.session);
    });
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const strength = getStrength(password);
  const match    = confirm.length > 0 && password === confirm;
  const mismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Too short', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Mismatch', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast({ title: 'Password updated!', description: 'Your password has been changed successfully.' });
      setTimeout(() => navigate('/auth'), 3000);
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl overflow-hidden">

          <div className="bg-gradient-to-r from-primary to-primary/80 px-8 py-8 text-center">
            <img src={fdlLogo} alt="FDL" className="h-14 w-14 rounded-full object-cover mx-auto mb-4 ring-4 ring-white/20" />
            <h1 className="text-white font-bold text-xl">Set New Password</h1>
            <p className="text-white/70 text-sm mt-1">Choose a strong password</p>
          </div>

          <div className="px-8 py-8 space-y-6">
            {sessionReady === null ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Verifying reset link…
              </div>
            ) : sessionReady === false ? (
              <div className="text-center space-y-4">
                <XCircle className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-lg font-bold">Invalid or expired link</h2>
                <p className="text-sm text-muted-foreground">
                  This password reset link has expired or has already been used.
                </p>
                <Button asChild className="w-full"><Link to="/forgot-password">Request a new link</Link></Button>
              </div>
            ) : done ? (
              <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Password updated!</h2>
                <p className="text-sm text-muted-foreground">
                  Your password has been changed. Redirecting you to sign in…
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
                </div>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <ShieldCheck className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Create a new password</h2>
                  <p className="text-sm text-muted-foreground">
                    Make it at least 8 characters with a mix of letters, numbers, and symbols.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* New password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="new-pw">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-pw"
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        autoFocus
                        className="pr-10"
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {/* Strength meter */}
                    {password.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-muted'}`} />
                          ))}
                        </div>
                        <p className={`text-xs font-medium ${strength.score <= 2 ? 'text-red-500' : strength.score <= 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {strength.label} password
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-pw">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-pw"
                        type={showCf ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="Re-enter your password"
                        className={`pr-10 ${mismatch ? 'border-destructive' : match ? 'border-emerald-500' : ''}`}
                      />
                      <button type="button" onClick={() => setShowCf(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {match    && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Passwords match</p>}
                    {mismatch && <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" /> Passwords don't match</p>}
                  </div>

                  {/* Requirements */}
                  <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground">Password must contain:</p>
                    {[
                      { label: 'At least 8 characters',           met: password.length >= 8 },
                      { label: 'At least one uppercase letter',    met: /[A-Z]/.test(password) },
                      { label: 'At least one number',              met: /[0-9]/.test(password) },
                    ].map(r => (
                      <div key={r.label} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${r.met ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
                        <span className={r.met ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}>{r.label}</span>
                      </div>
                    ))}
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={loading || password.length < 8 || password !== confirm}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {loading ? 'Updating…' : 'Update Password'}
                  </Button>
                </form>
              </>
            )}

            <div className="pt-2 border-t text-center">
              <Link to="/auth" className="text-sm text-primary hover:underline">← Back to Sign In</Link>
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

export default ResetPassword;
