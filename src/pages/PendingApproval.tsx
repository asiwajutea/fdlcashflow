import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Clock, LogOut, RefreshCw, Globe, BookOpen, Calendar, Lightbulb, Users, Sparkles, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

const explore = [
  { to: '/', label: 'Home', icon: Globe, desc: 'Explore the Footprints Dynasty landing page' },
  { to: '/about', label: 'About Us', icon: Users, desc: 'Get to know our story and mission' },
  { to: '/services', label: 'Services', icon: Sparkles, desc: 'See what we offer' },
  { to: '/events', label: 'Events', icon: Calendar, desc: 'Upcoming and past events' },
  { to: '/innovations', label: 'Innovations', icon: Lightbulb, desc: 'Projects we are building' },
  { to: '/blog', label: 'Blog', icon: BookOpen, desc: 'Stories on heritage, EdTech and culture' },
];

const PendingApproval = () => {
  const navigate = useNavigate();
  const { user, fullName, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  const firstName = (fullName || user?.email || 'there').split(' ')[0];

  const handleRefresh = async () => {
    if (!user) return;
    setChecking(true);
    const { data } = await (supabase as any)
      .from('profiles').select('approval_status').eq('id', user.id).maybeSingle();
    setChecking(false);
    if (data?.approval_status === 'approved') {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('profile-approval-' + user.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload: any) => {
        if (payload.new?.approval_status === 'approved') navigate('/dashboard');
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-8">
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 sm:p-8 text-primary-foreground">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <Clock className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm opacity-80">Welcome, {firstName}!</p>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Your account is awaiting verification</h1>
                <p className="text-sm sm:text-base opacity-90 mt-2 max-w-2xl">
                  Thanks for signing up. An admin will review and verify your account shortly — usually within one business day. You'll get full access to your dashboard the moment it's approved.
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleRefresh} disabled={checking} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking…' : 'Check status'}
              </Button>
              <Button variant="ghost" onClick={async () => { await signOut(); navigate('/auth'); }}>
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </Button>
              <Button variant="ghost" onClick={() => navigate('/inbox')}>
                <Mail className="h-4 w-4 mr-2" /> Open Inbox
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">We'll automatically take you to your dashboard the moment your account is approved.</p>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">While you wait, explore the website</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {explore.map(({ to, label, icon: Icon, desc }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="text-left p-4 rounded-xl border bg-card hover:bg-accent/30 transition-colors group flex items-start gap-3"
              >
                <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
