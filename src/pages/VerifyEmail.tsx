import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, Loader2, Mail } from 'lucide-react';
import fdlLogo from '@/assets/fdl-logo.jpg';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const emailParam = searchParams.get('email') || '';
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [resending, setResending]           = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verified, setVerified]             = useState(false);

  // ── Listen for auth state change ──────────────────────────────────────────
  // When the user clicks the verification link in their email, Supabase fires
  // SIGNED_IN / USER_UPDATED with an email_confirmed_at set. We catch that here
  // and also check the current session on mount in case they're already verified.
  useEffect(() => {
    // Check immediately on mount (covers the case where the tab was already open
    // when the email link was clicked in another tab)
    const checkSession = async () => {
      // getUser() always hits the server — never returns stale cached data
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.email_confirmed_at) {
        handleVerified();
      }
    };
    checkSession();

    // Subscribe to auth state changes — fires when user clicks email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle all events that could mean email is now confirmed
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (session?.user?.email_confirmed_at) {
          handleVerified();
          return;
        }
        // Session exists but email_confirmed_at not set in cached token
        // Force a fresh fetch from the server
        const { data: fresh } = await supabase.auth.getUser();
        if (fresh?.user?.email_confirmed_at) {
          handleVerified();
        }
      }
    });

    // Also poll every 4s as a fallback (some email clients open link in background)
    const interval = setInterval(checkSession, 4000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleVerified = () => {
    setVerified(true);
    // Short delay so user sees the success state before redirect
    setTimeout(() => navigate(redirectTo, { replace: true }), 2500);
  };

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0 || !emailParam) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailParam,
        options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
      });
      if (error) throw error;
      setResendCooldown(60);
      toast({ title: 'Verification email resent', description: `New link sent to ${emailParam}` });
    } catch (e: any) {
      toast({ title: 'Failed to resend', description: e.message, variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-8 py-8 text-center">
            <img src={fdlLogo} alt="FDL" className="h-14 w-14 rounded-full object-cover mx-auto mb-4 ring-4 ring-white/20" />
            <h1 className="text-white font-bold text-xl">Footprints Dynasty</h1>
            <p className="text-white/70 text-sm mt-1">FDL Workforce Platform</p>
          </div>

          <div className="px-8 py-8 space-y-6">

            {verified ? (
              /* ── Verified state ── */
              <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Email Verified!</h2>
                <p className="text-sm text-muted-foreground">Your email has been confirmed. Taking you in now…</p>
                <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
                </div>
              </div>
            ) : (
              /* ── Pending state ── */
              <>
                <div className="text-center">
                  <div className="relative inline-flex">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Mail className="h-10 w-10 text-primary" />
                    </div>
                    <span className="absolute top-0 right-0 h-6 w-6 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold">!</span>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-foreground">Check your inbox</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We sent a verification link to{' '}
                    {emailParam
                      ? <strong className="text-foreground">{emailParam}</strong>
                      : 'your email address'}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click the link in the email to activate your account. This page detects verification automatically.
                  </p>
                </div>

                {/* Steps */}
                <div className="bg-muted/40 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What to do</p>
                  {[
                    'Open the email from Footprints Dynasty',
                    'Click the "Verify Email" button',
                    'This page will detect it and log you in automatically',
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-sm text-foreground">{text}</p>
                    </div>
                  ))}
                </div>

                {/* Auto-check indicator */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  Checking for verification automatically…
                </div>

                {/* Resend */}
                <div className="space-y-2">
                  <Button
                    onClick={handleResend}
                    disabled={resending || resendCooldown > 0 || !emailParam}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    {resending
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                      : resendCooldown > 0
                        ? <><RefreshCw className="h-4 w-4" /> Resend in {resendCooldown}s</>
                        : <><RefreshCw className="h-4 w-4" /> Resend verification email</>}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Didn't receive it? Check your spam folder first.
                  </p>
                </div>

                {/* Manual check button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={async () => {
                    // getUser() always fetches fresh from the server (bypasses cache)
                    const { data } = await supabase.auth.getUser();
                    if (data?.user?.email_confirmed_at) {
                      handleVerified();
                    } else {
                      // Also try refreshing the session
                      const { data: refreshed } = await supabase.auth.refreshSession();
                      if (refreshed?.session?.user?.email_confirmed_at) {
                        handleVerified();
                      } else {
                        toast({ title: 'Not yet verified', description: 'Please click the link in your email first, then try again.' });
                      }
                    }
                  }}
                >
                  I've verified my email — check again
                </Button>
              </>
            )}

            <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
              <Link to="/auth" className="hover:text-primary transition-colors">← Back to Sign In</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">Need help?</Link>
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

export default VerifyEmail;
