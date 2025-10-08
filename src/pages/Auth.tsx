import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lock } from 'lucide-react';
const Auth = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passcode: ''
  });
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // First authenticate with email and password
      const {
        data: authData,
        error: authError
      } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      if (authError) throw authError;

      // Then verify passcode
      const {
        data: profileData,
        error: profileError
      } = await supabase.from('profiles').select('passcode').eq('id', authData.user.id).single();
      if (profileError) throw profileError;
      if (profileData.passcode !== formData.passcode) {
        await supabase.auth.signOut();
        throw new Error('Invalid passcode');
      }
      toast({
        title: "Success",
        description: "Login successful"
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please check your email, password, and access code.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md p-8 financial-card">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Financial Dashboard</h1>
          <p className="text-muted-foreground">Footprints Dynasty Ltd</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={e => setFormData({
            ...formData,
            email: e.target.value
          })} placeholder="your@email.com" required className="mt-1" />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={formData.password} onChange={e => setFormData({
            ...formData,
            password: e.target.value
          })} placeholder="••••••••" required className="mt-1" />
          </div>

          <div>
            <Label htmlFor="passcode">Access Code</Label>
            <Input id="passcode" type="password" value={formData.passcode} onChange={e => setFormData({
            ...formData,
            passcode: e.target.value
          })} placeholder="Access code" required className="mt-1" />
          </div>

          <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Contact administrator for access</p>
        </div>
      </Card>
    </div>;
};
export default Auth;