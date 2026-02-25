import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lock, UserPlus, Briefcase } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    passcode: ''
  });

  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    signupType: 'employee' as 'employee' | 'candidate'
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });
      if (authError) throw authError;

      // Check if user is a candidate (bypass passcode)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

      if (roleData?.role === 'candidate') {
        // Candidates skip passcode verification and go to dashboard
        toast({ title: "Success", description: "Login successful" });
        navigate('/');
        return;
      }

      // Non-candidate: verify passcode
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('passcode')
        .eq('id', authData.user.id)
        .single();
      
      if (profileError) throw profileError;
      
      if (!profileData.passcode || profileData.passcode === '00000000') {
        await supabase.auth.signOut();
        throw new Error('Your account is pending approval. Please contact the administrator for your access code.');
      }
      
      if (profileData.passcode !== loginData.passcode) {
        await supabase.auth.signOut();
        throw new Error('Invalid access code');
      }

      toast({ title: "Success", description: "Login successful" });
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (signupData.password !== signupData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (signupData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (!signupData.fullName.trim()) {
        throw new Error('Full name is required');
      }

      const isCandidate = signupData.signupType === 'candidate';

      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            full_name: signupData.fullName,
            role: isCandidate ? 'candidate' : 'employee',
            passcode: '00000000'
          },
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      if (isCandidate) {
        // Candidates can log in immediately — no passcode needed
        toast({
          title: "Account Created",
          description: "You can now log in and apply for jobs."
        });
      } else {
        // Sign out employees — need admin passcode
        await supabase.auth.signOut();
        toast({
          title: "Account Created",
          description: "Contact the administrator for your access code to complete login."
        });
      }

      setSignupData({ email: '', password: '', confirmPassword: '', fullName: '', signupType: 'employee' });
      setActiveTab('login');
    } catch (error: any) {
      toast({
        title: "Sign Up Failed",
        description: error.message || "Failed to create account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md p-8 financial-card">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-primary">Financial Dashboard</h1>
          <p className="text-muted-foreground">Footprints Dynasty Ltd</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="login-passcode">Access Code</Label>
                <Input
                  id="login-passcode"
                  type="password"
                  value={loginData.passcode}
                  onChange={(e) => setLoginData({ ...loginData, passcode: e.target.value })}
                  placeholder="8-digit code from admin"
                  required
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Contact administrator for your access code</p>
              </div>

              <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Signup Type Selector */}
              <div>
                <Label>I am signing up as</Label>
                <Select value={signupData.signupType} onValueChange={(v: 'employee' | 'candidate') => setSignupData({ ...signupData, signupType: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="candidate">
                      <span className="flex items-center gap-1">Job Applicant</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {signupData.signupType === 'candidate' && (
                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> You'll be able to browse and apply for open positions
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="signup-name">Full Name</Label>
                <Input id="signup-name" type="text" value={signupData.fullName} onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })} placeholder="John Doe" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" value={signupData.email} onChange={(e) => setSignupData({ ...signupData, email: e.target.value })} placeholder="your@email.com" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" value={signupData.password} onChange={(e) => setSignupData({ ...signupData, password: e.target.value })} placeholder="At least 6 characters" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="signup-confirm">Confirm Password</Label>
                <Input id="signup-confirm" type="password" value={signupData.confirmPassword} onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })} placeholder="Re-enter password" required className="mt-1" />
              </div>

              <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                <UserPlus className="h-4 w-4 mr-2" />
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <div className="text-center text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                {signupData.signupType === 'candidate' ? (
                  <>
                    <p className="font-medium">Job Applicant Registration</p>
                    <p>After signing up, you can log in immediately to browse and apply for jobs.</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">After signing up:</p>
                    <p>Contact your administrator to receive your access code for login.</p>
                  </>
                )}
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
