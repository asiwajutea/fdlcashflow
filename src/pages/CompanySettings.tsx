import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save } from 'lucide-react';

interface CompanySettings {
  id?: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  logo_url: string;
  invoice_footer: string;
}

const CompanySettings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: 'FULLDATALINKING LTD',
    company_address: 'No. 9 Alhaji Basiru Street, Off Alidada Bus stop, Iyana-Ipaja, Lagos',
    company_phone: '08035102224',
    company_email: '',
    logo_url: '',
    invoice_footer: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchSettings();
    }
  }, [user, loading, navigate]);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .single();
    
    if (error) {
      console.error('Error fetching settings:', error);
      return;
    }
    
    if (data) {
      setSettings({
        id: data.id,
        company_name: data.company_name || '',
        company_address: data.company_address || '',
        company_phone: data.company_phone || '',
        company_email: data.company_email || '',
        logo_url: data.logo_url || '',
        invoice_footer: data.invoice_footer || ''
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (settings.id) {
        // Update existing
        const { error } = await supabase
          .from('company_settings')
          .update({
            company_name: settings.company_name,
            company_address: settings.company_address,
            company_phone: settings.company_phone,
            company_email: settings.company_email,
            logo_url: settings.logo_url,
            invoice_footer: settings.invoice_footer
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('company_settings')
          .insert({
            company_name: settings.company_name,
            company_address: settings.company_address,
            company_phone: settings.company_phone,
            company_email: settings.company_email,
            logo_url: settings.logo_url,
            invoice_footer: settings.invoice_footer
          })
          .select()
          .single();

        if (error) throw error;
        setSettings({ ...settings, id: data.id });
      }

      toast({
        title: "Success",
        description: "Company settings saved successfully"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Settings & Invoice Template Customization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                placeholder="Company Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_address">Company Address</Label>
              <Textarea
                id="company_address"
                value={settings.company_address}
                onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                placeholder="Company Address"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_phone">Phone Number</Label>
                <Input
                  id="company_phone"
                  value={settings.company_phone}
                  onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                  placeholder="Phone Number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_email">Email Address</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                  placeholder="company@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL (Optional)</Label>
              <Input
                id="logo_url"
                value={settings.logo_url}
                onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-sm text-muted-foreground">
                Upload your logo to an image hosting service and paste the URL here
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_footer">Invoice Footer Text (Optional)</Label>
              <Textarea
                id="invoice_footer"
                value={settings.invoice_footer}
                onChange={(e) => setSettings({ ...settings, invoice_footer: e.target.value })}
                placeholder="Thank you for your business"
                rows={2}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanySettings;
