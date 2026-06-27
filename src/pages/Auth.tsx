import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Lock, UserPlus, Briefcase, ArrowLeft, ArrowRight, ShieldCheck, Eye, EyeOff,
  User as UserIcon, Building2, FileText, Check, Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LookupItem { id: string; name: string; }

const STEPS = [
  { key: 'account', label: 'Account', icon: UserIcon },
  { key: 'personal', label: 'Personal', icon: UserIcon },
  { key: 'work', label: 'Work', icon: Building2 },
  { key: 'documents', label: 'Documents', icon: FileText },
] as const;

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo  = searchParams.get('redirect') || '/dashboard';
  const modeParam   = searchParams.get('mode'); // 'login' | 'signup'
  const roleParam   = searchParams.get('role'); // 'candidate' | 'employee'
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(modeParam === 'signup' ? 'signup' : 'login');
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<'credentials' | 'passcode'>('credentials');
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Signup wizard state
  const [step, setStep] = useState(0);
  const [signupData, setSignupData] = useState({
    email: '', password: '', confirmPassword: '', fullName: '',
    signupType: (roleParam === 'candidate' ? 'candidate' : 'employee') as 'employee' | 'candidate',
    birthday: '', gender: '', phone: '',
    positionId: '', departmentId: '', projectId: '', teamId: '',
    employmentStartDate: '', employeeId: ''
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);

  const [positions, setPositions] = useState<LookupItem[]>([]);
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [projects, setProjects] = useState<LookupItem[]>([]);
  const [teams, setTeams] = useState<LookupItem[]>([]);

  useEffect(() => {
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
        navigate(redirectTo);
        return;
      }

      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('approval_status, passcode_acknowledged')
        .eq('id', userId)
        .maybeSingle();

      const status = profileData?.approval_status || 'approved';
      const acknowledged = profileData?.passcode_acknowledged ?? true;

      if (status === 'pending') {
        // Keep them logged in but redirect to the awaiting-approval screen
        toast({ title: "Welcome!", description: "Your account is awaiting verification." });
        navigate('/pending-approval');
        return;
      }
      if (status === 'rejected') {
        await supabase.auth.signOut();
        setStoredUserId(null);
        toast({ title: "Access Denied", description: "Your registration was not approved.", variant: "destructive" });
        return;
      }

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
        setLoginStep('credentials'); setPasscode(''); setStoredUserId(null);
        toast({ title: "Verification Failed", description: 'Pending approval.', variant: "destructive" });
        return;
      }
      if (profileData.passcode !== passcode) {
        setPasscode('');
        toast({ title: "Invalid Code", description: 'Invalid access code.', variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Login successful" });
      navigate(redirectTo);
    } catch (error: any) {
      setLoginStep('credentials'); setPasscode(''); setStoredUserId(null);
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = async () => {
    await supabase.auth.signOut();
    setLoginStep('credentials'); setPasscode('');
  };

  const isEmployee = signupData.signupType === 'employee';
  const totalSteps = isEmployee ? STEPS.length : 1;

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!signupData.fullName.trim()) return 'Full name is required';
      if (!signupData.email.trim()) return 'Email is required';
      if (signupData.password.length < 6) return 'Password must be at least 6 characters';
      if (signupData.password !== signupData.confirmPassword) return 'Passwords do not match';
      return null;
    }
    if (!isEmployee) return null;
    if (s === 1) {
      if (!signupData.birthday) return 'Birthday is required';
      if (!signupData.gender) return 'Gender is required';
      if (!signupData.phone.trim()) return 'Phone number is required';
      return null;
    }
    if (s === 2) {
      if (!signupData.positionId) return 'Position is required';
      if (!signupData.departmentId) return 'Department is required';
      if (!signupData.projectId) return 'Project is required';
      return null;
    }
    return null; // documents step is fully optional
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) { toast({ title: 'Required', description: err, variant: 'destructive' }); return; }
    setStep(s => Math.min(s + 1, totalSteps - 1));
  };
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 10MB.', variant: 'destructive' });
      return;
    }
    setter(f);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    // Final validation across all required steps
    for (let i = 0; i < (isEmployee ? 3 : 1); i++) {
      const err = validateStep(i);
      if (err) { setStep(i); toast({ title: 'Required', description: err, variant: 'destructive' }); return; }
    }
    setLoading(true);
    try {
      const metadata: Record<string, any> = {
        full_name: signupData.fullName,
        role: isEmployee ? 'employee' : 'candidate',
        passcode: '00000000'
      };
      if (isEmployee) {
        metadata.birthday = signupData.birthday;
        metadata.gender = signupData.gender;
        metadata.phone = signupData.phone;
        metadata.position_id = signupData.positionId;
        metadata.department_id = signupData.departmentId;
        metadata.project_id = signupData.projectId;
        if (signupData.teamId) metadata.team_id = signupData.teamId;
        if (signupData.employmentStartDate) metadata.employment_start_date = signupData.employmentStartDate;
        if (signupData.employeeId) metadata.employee_id = signupData.employeeId;
      }

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: signupData.email, password: signupData.password,
        options: {
          data: metadata,
          // For candidates with a pending application, redirect back to the apply page
          // so the draft auto-submits. For everyone else, go to the app root.
          emailRedirectTo: (!isEmployee && redirectTo !== '/dashboard')
            ? `${window.location.origin}${redirectTo}`
            : window.location.origin
        }
      });
      if (error) throw error;

      const userId = signUpData.user?.id;
      // Optional file uploads (only if session exists, e.g. autoConfirm)
      if (userId && (cvFile || idFile)) {
        const updates: Record<string, any> = {};
        try {
          if (cvFile) {
            const ext = cvFile.name.split('.').pop() || 'pdf';
            const path = `${userId}/cv.${ext}`;
            const { error: upErr } = await supabase.storage.from('resumes').upload(path, cvFile, { upsert: true });
            if (!upErr) {
              const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(path);
              updates.cv_url = urlData.publicUrl;
            }
          }
          if (idFile) {
            const ext = idFile.name.split('.').pop() || 'pdf';
            const path = `${userId}/id-card.${ext}`;
            const { error: upErr } = await supabase.storage.from('documents').upload(path, idFile, { upsert: true });
            if (!upErr) updates.id_card_url = path;
          }
          if (Object.keys(updates).length > 0) {
            await (supabase as any).from('profiles').update(updates).eq('id', userId);
          }
        } catch (uploadErr) {
          console.warn('Document upload failed (will retry from profile):', uploadErr);
        }
      }

      if (isEmployee) {
        // Auto-login if a session is present (email auto-confirm on) — otherwise prompt to verify email
        if (signUpData.session) {
          toast({ title: "Welcome aboard!", description: "Account created. While we verify you, explore the site." });
          navigate('/pending-approval');
          return;
        }
        toast({ title: "Check your email", description: "We sent a verification link. Once you verify, sign in to continue." });
      } else {
        // Candidate — if they came from an application redirect, send them back after verifying
        if (redirectTo !== '/dashboard') {
          navigate(`/verify-email?email=${encodeURIComponent(signupData.email)}&redirect=${encodeURIComponent(redirectTo)}`);
          return;
        } else {
          navigate(`/verify-email?email=${encodeURIComponent(signupData.email)}`);
          return;
        }
      }

      if (!isEmployee) {
        // fallback already handled above
      } else {
        // Reset for employee
      }

      // Reset
      setSignupData({
        email: '', password: '', confirmPassword: '', fullName: '', signupType: 'employee',
        birthday: '', gender: '', phone: '',
        positionId: '', departmentId: '', projectId: '', teamId: '',
        employmentStartDate: '', employeeId: ''
      });
      setCvFile(null); setIdFile(null); setStep(0);
      setActiveTab('login');
    } catch (error: any) {
      toast({ title: "Sign Up Failed", description: error.message || "Failed to create account", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setStep(0); }} className="w-full">
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
                <div className="text-center">
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot your password?
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              {/* Stepper */}
              {isEmployee && (
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    {STEPS.map((s, i) => {
                      const Icon = s.icon;
                      const done = i < step;
                      const current = i === step;
                      return (
                        <React.Fragment key={s.key}>
                          <div className="flex flex-col items-center flex-1">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                              done && "bg-primary border-primary text-primary-foreground",
                              current && "border-primary text-primary bg-primary/10",
                              !done && !current && "border-muted text-muted-foreground"
                            )}>
                              {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                            </div>
                            <span className={cn("text-xs mt-1 font-medium", current ? "text-primary" : "text-muted-foreground")}>
                              {s.label}
                            </span>
                          </div>
                          {i < STEPS.length - 1 && (
                            <div className={cn("h-0.5 flex-1 -mt-5 mx-1", i < step ? "bg-primary" : "bg-muted")} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              <form onSubmit={handleSignUp} className="space-y-5">
                {/* STEP 0: Account */}
                {step === 0 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Create Your Account</h3>
                      <p className="text-sm text-muted-foreground">Tell us who you are and choose a password.</p>
                    </div>

                    <div>
                      <Label>I am signing up as</Label>
                      <Select value={signupData.signupType} onValueChange={(v: 'employee' | 'candidate') => { setSignupData({ ...signupData, signupType: v }); setStep(0); }}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="candidate">Job Applicant</SelectItem>
                        </SelectContent>
                      </Select>
                      {signupData.signupType === 'candidate' && (
                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> You'll browse and apply for open positions
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="signup-name">Full Name *</Label>
                        <Input id="signup-name" value={signupData.fullName} onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })} placeholder="John Doe" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="signup-email">Email *</Label>
                        <Input id="signup-email" type="email" value={signupData.email} onChange={(e) => setSignupData({ ...signupData, email: e.target.value })} placeholder="your@email.com" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="signup-password">Password *</Label>
                        <div className="relative mt-1">
                          <Input id="signup-password" type={showPassword ? "text" : "password"} value={signupData.password} onChange={(e) => setSignupData({ ...signupData, password: e.target.value })} placeholder="At least 6 characters" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="signup-confirm">Confirm Password *</Label>
                        <div className="relative mt-1">
                          <Input id="signup-confirm" type={showConfirmPassword ? "text" : "password"} value={signupData.confirmPassword} onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })} placeholder="Re-enter password" />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 1: Personal Info (employee only) */}
                {isEmployee && step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Personal Information</h3>
                      <p className="text-sm text-muted-foreground">A few personal details to complete your profile.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="signup-birthday">Birthday *</Label>
                        <Input id="signup-birthday" type="date" value={signupData.birthday} onChange={(e) => setSignupData({ ...signupData, birthday: e.target.value })} className="mt-1" />
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
                      <div className="md:col-span-2">
                        <Label htmlFor="signup-phone">Phone Number *</Label>
                        <Input id="signup-phone" value={signupData.phone} onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })} placeholder="+234..." className="mt-1" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Work Details */}
                {isEmployee && step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Work Details</h3>
                      <p className="text-sm text-muted-foreground">Help us assign you to the right team.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Position / Designation *</Label>
                        <Select value={signupData.positionId} onValueChange={(v) => setSignupData({ ...signupData, positionId: v })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select position" /></SelectTrigger>
                          <SelectContent>{positions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Department *</Label>
                        <Select value={signupData.departmentId} onValueChange={(v) => setSignupData({ ...signupData, departmentId: v })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                          <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Project *</Label>
                        <Select value={signupData.projectId} onValueChange={(v) => setSignupData({ ...signupData, projectId: v })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select project" /></SelectTrigger>
                          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Team <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Select value={signupData.teamId} onValueChange={(v) => setSignupData({ ...signupData, teamId: v })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select team" /></SelectTrigger>
                          <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="signup-start">Employment Start Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Input id="signup-start" type="date" value={signupData.employmentStartDate} onChange={(e) => setSignupData({ ...signupData, employmentStartDate: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="signup-emp-id">Employee ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Input id="signup-emp-id" value={signupData.employeeId} onChange={(e) => setSignupData({ ...signupData, employeeId: e.target.value })} placeholder="Optional" className="mt-1" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Documents (optional) */}
                {isEmployee && step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Documents <span className="text-sm font-normal text-muted-foreground">(optional)</span></h3>
                      <p className="text-sm text-muted-foreground">Upload now or skip — you can always add these later from your Profile page.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="border-2 border-dashed border-muted rounded-lg p-4">
                        <Label className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> CV / Resume</Label>
                        <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFile(e, setCvFile)} />
                        {cvFile && <p className="text-xs text-primary mt-2 flex items-center gap-1"><Check className="h-3 w-3" /> {cvFile.name}</p>}
                      </div>
                      <div className="border-2 border-dashed border-muted rounded-lg p-4">
                        <Label className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> ID Card</Label>
                        <Input type="file" accept=".pdf,image/*" onChange={(e) => handleFile(e, setIdFile)} />
                        {idFile && <p className="text-xs text-primary mt-2 flex items-center gap-1"><Check className="h-3 w-3" /> {idFile.name}</p>}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">Skip if you'd rather upload from your Profile page after approval.</p>
                  </div>
                )}

                {/* Step navigation */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  {step > 0 ? (
                    <Button type="button" variant="outline" onClick={goBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                  ) : <span />}

                  {step < totalSteps - 1 ? (
                    <Button type="button" onClick={goNext} className="bg-gradient-primary ml-auto">
                      Next <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="submit" className="bg-gradient-primary ml-auto" disabled={loading}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {loading ? 'Creating...' : 'Create Account'}
                    </Button>
                  )}
                </div>

                {step === totalSteps - 1 && (
                  <div className="text-center text-sm text-muted-foreground bg-muted/50 p-3 rounded-md mt-2">
                    {isEmployee ? (
                      <>
                        <p className="font-medium">After signing up:</p>
                        <p>Your account will require admin approval. Once approved, log in to view your personal access code.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">Job Applicant Registration</p>
                        <p>Sign up and log in immediately to browse and apply for jobs.</p>
                      </>
                    )}
                  </div>
                )}
              </form>
            </TabsContent>
          </Tabs>
        )}
      </Card>
    </div>
  );
};

export default Auth;
