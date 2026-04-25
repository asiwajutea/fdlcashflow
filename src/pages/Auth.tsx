import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lock, UserPlus, Briefcase, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface LookupItem { id: string; name: string; }

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<'credentials' | 'passcode'>('credentials');
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });

  const [signupData, setSignupData] = useState({
    email: '', password: '', confirmPassword: '', fullName: '',
    signupType: 'employee' as 'employee' | 'candidate',
    birthday: '', gender: '', positionId: '', departmentId: '',
    projectId: '', teamId: '', employmentStartDate: '', employeeId: '', phone: ''
  });

  const [positions, setPositions] = useState<LookupItem[]>([]);
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [projects, setProjects] = useState<LookupItem[]>([]);
  const [teams, setTeams] = useState<LookupItem[]>([]);

  useEffect(() => {
    // Lookups are readable to authenticated users only; for signup we still fetch
    // (anon key) — for now we attempt and gracefully fall back to empty.
    const loadLookups = async () => {
      const [p, d, pr, t] = await Promise.all([
        (supabase as any).from('positions').select('id,name').eq('is_active', true).order('display_order'),
        (supabase as any).from('departments').select('id,name').eq('is_active', true).order('display_order'),
        (supabase as any).from('projects').select('id,name').eq('is_active', true).order('display_order'),
        (supabase as any).from('teams').select('id,name').eq('is_active', true).order('display_order'),
      ]);
      setPositions(p.data || []);
      setDepartments(d.data || []);
      setProjects(pr.data || []);
      setTeams(t.data || []);
    };
    loadLookups();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginData.email, password: loginData.password
      });
      if (authError) throw authError;
      const userId = authData.user.id;
      setStoredUserId(userId);

      const { data: roleData } = await supabase
        .from('user_roles').select('role').eq('user_id', userId).single();

      if (roleData?.role === 'candidate') {
        toast({ title: "Success", description: "Login successful" });
        navigate('/dashboard');
        return;
      }

      // Employee/admin: check approval status + acknowledged
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('approval_status, passcode_acknowledged')
        .eq('id', userId)
        .maybeSingle();

      const status = profileData?.approval_status || 'approved';
      const acknowledged = profileData?.passcode_acknowledged ?? true;

      if (status === 'pending') {
        await supabase.auth.signOut();
        setStoredUserId(null);
        toast({ title: "Pending Approval", description: "Your account is awaiting admin approval. You'll be able to sign in after an administrator approves your registration.", variant: "destructive" });
        return;
      }
      if (status === 'rejected') {
        await supabase.auth.signOut();
        setStoredUserId(null);
        toast({ title: "Access Denied", description: "Your registration was not approved. Please contact your administrator.", variant: "destructive" });
        return;
      }

      // Approved + first login (not acknowledged) → skip passcode, navigate with state
      if (!acknowledged && roleData?.role === 'employee') {
        toast({ title: "Welcome!", description: "Your account is now active. Please review your access code." });
        navigate('/dashboard', { state: { showAccessCode: true } });
        return;
      }

      setLoginStep('passcode');
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message || "Invalid credentials.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!storedUserId) throw new Error('Session expired. Please sign in again.');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles').select('passcode').eq('id', storedUserId).single();
      if (profileError) throw profileError;

      if (!profileData.passcode || profileData.passcode === '00000000') {
        await supabase.auth.signOut();
        setLoginStep('credentials');
        setPasscode('');
        setStoredUserId(null);
        toast({ title: "Verification Failed", description: 'Your account is pending approval. Please contact the administrator.', variant: "destructive" });
        return;
      }

      if (profileData.passcode !== passcode) {
        setPasscode('');
        toast({ title: "Invalid Code", description: 'Invalid access code. Please try again.', variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Login successful" });
      navigate('/dashboard');
    } catch (error: any) {
      setLoginStep('credentials');
      setPasscode('');
      setStoredUserId(null);
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = async () => {
    await supabase.auth.signOut();
    setLoginStep('credentials');
    setPasscode('');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (signupData.password !== signupData.confirmPassword) throw new Error('Passwords do not match');
      if (signupData.password.length < 6) throw new Error('Password must be at least 6 characters');
      if (!signupData.fullName.trim()) throw new Error('Full name is required');

      const isCandidate = signupData.signupType === 'candidate';

      // Employee-only mandatory checks
      if (!isCandidate) {
        if (!signupData.birthday) throw new Error('Birthday is required');
        if (!signupData.gender) throw new Error('Gender is required');
        if (!signupData.positionId) throw new Error('Position is required');
        if (!signupData.departmentId) throw new Error('Department is required');
        if (!signupData.projectId) throw new Error('Project is required');
        if (!signupData.teamId) throw new Error('Team is required');
        if (!signupData.employmentStartDate) throw new Error('Employment start date is required');
      }

      const metadata: Record<string, any> = {
        full_name: signupData.fullName,
        role: isCandidate ? 'candidate' : 'employee',
        passcode: '00000000'
      };
      if (!isCandidate) {
        metadata.birthday = signupData.birthday;
        metadata.gender = signupData.gender;
        metadata.position_id = signupData.positionId;
        metadata.department_id = signupData.departmentId;
        metadata.project_id = signupData.projectId;
        metadata.team_id = signupData.teamId;
        metadata.employment_start_date = signupData.employmentStartDate;
        metadata.employee_id = signupData.employeeId;
        metadata.phone = signupData.phone;
      }

      const { error } = await supabase.auth.signUp({
        email: signupData.email, password: signupData.password,
        options: { data: metadata, emailRedirectTo: window.location.origin }
      });
      if (error) throw error;

      if (isCandidate) {
        toast({ title: "Account Created", description: "You can now log in and apply for jobs." });
      } else {
        await supabase.auth.signOut();
        toast({ title: "Registration Submitted", description: "Your account is awaiting admin approval. You'll be able to sign in once an administrator approves your registration." });
      }
      setSignupData({
        email: '', password: '', confirmPassword: '', fullName: '', signupType: 'employee',
        birthday: '', gender: '', positionId: '', departmentId: '', projectId: '',
        teamId: '', employmentStartDate: '', employeeId: '', phone: ''
      });
      setActiveTab('login');
    } catch (error: any) {
      toast({ title: "Sign Up Failed", description: error.message || "Failed to create account", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isEmployee = signupData.signupType === 'employee';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-2xl p-8 financial-card">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            {loginStep === 'passcode' ? <ShieldCheck className="h-8 w-8 text-primary" /> : <Lock className="h-8 w-8 text-primary" />}
          </div>
          <h1 className="text-3xl font-bold mb-2 text-primary">FDL Workforce</h1>
          <p className="text-muted-foreground">
            {loginStep === 'passcode' ? 'Enter your access code to continue' : 'Footprints Dynasty Ltd'}
          </p>
        </div>

        {loginStep === 'passcode' ? (
          <form onSubmit={handlePasscodeSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Label className="text-center">8-Digit Access Code</Label>
              <InputOTP maxLength={8} value={passcode} onChange={setPasscode}>
                <InputOTPGroup>
                  {[0,1,2,3,4,5,6,7].map(i => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
              <p className="text-xs text-muted-foreground text-center">Enter your personal access code</p>
            </div>
            <Button type="submit" className="w-full bg-gradient-primary" disabled={loading || passcode.length < 8}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={handleBackToCredentials}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sign In
            </Button>
          </form>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 max-w-md mx-auto">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} placeholder="your@email.com" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative mt-1">
                    <Input id="login-password" type={showPassword ? "text" : "password"} value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} placeholder="••••••••" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label>I am signing up as</Label>
                  <Select value={signupData.signupType} onValueChange={(v: 'employee' | 'candidate') => setSignupData({ ...signupData, signupType: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="candidate"><span className="flex items-center gap-1">Job Applicant</span></SelectItem>
                    </SelectContent>
                  </Select>
                  {signupData.signupType === 'candidate' && (
                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> You'll be able to browse and apply for open positions
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="signup-name">Full Name *</Label>
                    <Input id="signup-name" value={signupData.fullName} onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })} placeholder="John Doe" required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input id="signup-email" type="email" value={signupData.email} onChange={(e) => setSignupData({ ...signupData, email: e.target.value })} placeholder="your@email.com" required className="mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="signup-password">Password *</Label>
                    <div className="relative mt-1">
                      <Input id="signup-password" type={showPassword ? "text" : "password"} value={signupData.password} onChange={(e) => setSignupData({ ...signupData, password: e.target.value })} placeholder="At least 6 characters" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="signup-confirm">Confirm Password *</Label>
                    <div className="relative mt-1">
                      <Input id="signup-confirm" type={showConfirmPassword ? "text" : "password"} value={signupData.confirmPassword} onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })} placeholder="Re-enter password" required />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {isEmployee && (
                  <>
                    <div className="border-t pt-4">
                      <p className="text-sm font-semibold mb-3 text-foreground">Employee Details</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="signup-birthday">Birthday *</Label>
                          <Input id="signup-birthday" type="date" value={signupData.birthday} onChange={(e) => setSignupData({ ...signupData, birthday: e.target.value })} required className="mt-1" />
                        </div>
                        <div>
                          <Label>Gender *</Label>
                          <Select value={signupData.gender} onValueChange={(v) => setSignupData({ ...signupData, gender: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select gender" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Position / Designation *</Label>
                          <Select value={signupData.positionId} onValueChange={(v) => setSignupData({ ...signupData, positionId: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select position" /></SelectTrigger>
                            <SelectContent>
                              {positions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Department *</Label>
                          <Select value={signupData.departmentId} onValueChange={(v) => setSignupData({ ...signupData, departmentId: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                            <SelectContent>
                              {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Project *</Label>
                          <Select value={signupData.projectId} onValueChange={(v) => setSignupData({ ...signupData, projectId: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select project" /></SelectTrigger>
                            <SelectContent>
                              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Team *</Label>
                          <Select value={signupData.teamId} onValueChange={(v) => setSignupData({ ...signupData, teamId: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select team" /></SelectTrigger>
                            <SelectContent>
                              {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="signup-start">Employment Start Date *</Label>
                          <Input id="signup-start" type="date" value={signupData.employmentStartDate} onChange={(e) => setSignupData({ ...signupData, employmentStartDate: e.target.value })} required className="mt-1" />
                        </div>
                        <div>
                          <Label htmlFor="signup-emp-id">Employee ID</Label>
                          <Input id="signup-emp-id" value={signupData.employeeId} onChange={(e) => setSignupData({ ...signupData, employeeId: e.target.value })} placeholder="Optional" className="mt-1" />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="signup-phone">Phone</Label>
                          <Input id="signup-phone" value={signupData.phone} onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })} placeholder="Optional" className="mt-1" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

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
                      <p>Your account will require admin approval. Once approved, log in to view your personal access code.</p>
                    </>
                  )}
                </div>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </Card>
    </div>
  );
};

export default Auth;
