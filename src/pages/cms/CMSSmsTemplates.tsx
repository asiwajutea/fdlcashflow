import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase-db';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send, Save, Plus, Trash2 } from 'lucide-react';

interface SmsTemplate {
  id: string;
  key: string;
  name: string;
  body: string;
  variables: string[];
  is_active: boolean;
}

interface Holiday {
  date: string;
  label: string;
}

const CMSSmsTemplates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [testPhone, setTestPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: tpls }, { data: lg }, { data: hol }] = await Promise.all([
      db.from('sms_templates').select('*').order('name'),
      db.from('sms_logs').select('*').order('created_at', { ascending: false }).limit(50),
      db.from('app_settings').select('value').eq('key', 'holidays').maybeSingle(),
    ]);
    setTemplates(tpls || []);
    setLogs(lg || []);
    
    // Parse holidays JSON into an array for the form
    try {
      setHolidays(JSON.parse(hol?.value || '[]'));
    } catch (e) {
      setHolidays([]);
    }
    
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateField = (id: string, patch: Partial<SmsTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  const save = async (t: SmsTemplate) => {
    setSaving(t.id);
    const { error } = await db.from('sms_templates').update({
      name: t.name, body: t.body, is_active: t.is_active,
    }).eq('id', t.id);
    setSaving(null);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: `${t.name} updated` });
    }
  };

  const sendTest = async (t: SmsTemplate) => {
    if (!testPhone) {
      toast({ title: 'Phone required', description: 'Enter a test phone number above', variant: 'destructive' });
      return;
    }
    const vars: Record<string, string> = {};
    (t.variables || []).forEach(v => { vars[v] = `[${v}]`; });
    vars.name = vars.name === `[name]` ? 'Test' : vars.name;
    const { error } = await supabase.functions.invoke('send-sms', {
      body: { to: testPhone, template_key: t.key, vars },
    });
    if (error) {
      toast({ title: 'Send failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Test sent', description: `SMS dispatched to ${testPhone}` });
      load();
    }
  };

  // Holiday Form Handlers
  const addHoliday = () => {
    setHolidays([...holidays, { date: '', label: '' }]);
  };

  const updateHoliday = (index: number, field: keyof Holiday, value: string) => {
    const newHolidays = [...holidays];
    newHolidays[index][field] = value;
    setHolidays(newHolidays);
  };

  const removeHoliday = (index: number) => {
    setHolidays(holidays.filter((_, i) => i !== index));
  };

  const saveHolidays = async () => {
    // Filter out completely empty rows before saving
    const validHolidays = holidays.filter(h => h.date.trim() !== '' || h.label.trim() !== '');
    const jsonString = JSON.stringify(validHolidays);

    const { error } = await db.from('app_settings').upsert({ key: 'holidays', value: jsonString });
    
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Holidays saved' });
      setHolidays(validHolidays); // Update state to remove any empty rows that were filtered out
    }
  };

  return (
    <DashboardLayout title="SMS Templates">
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates" className="gap-2"><MessageSquare className="h-4 w-4" /> Templates</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test SMS</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Test phone (e.g. 2348012345678)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground self-center">Use the "Send test" button on a template to dispatch.</p>
            </CardContent>
          </Card>

          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : templates.map(t => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {t.name}
                    <Badge variant={t.is_active ? 'default' : 'secondary'}>{t.is_active ? 'Active' : 'Inactive'}</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{t.key}</p>
                </div>
                <Switch checked={t.is_active} onCheckedChange={(v) => updateField(t.id, { is_active: v })} />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={t.name} onChange={(e) => updateField(t.id, { name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Body ({t.body.length} chars)</Label>
                  <Textarea
                    value={t.body}
                    onChange={(e) => updateField(t.id, { body: e.target.value })}
                    rows={3}
                    className="font-mono text-sm"
                  />
                  {(t.variables?.length ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Variables: {(t.variables || []).map(v => <code key={v} className="mx-1">{`{{${v}}}`}</code>)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => save(t)} disabled={saving === t.id}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => sendTest(t)}>
                    <Send className="h-4 w-4 mr-1" /> Send test
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="holidays">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Holiday Schedule</CardTitle>
              <p className="text-xs text-muted-foreground">
                Define the dates and names for upcoming holidays. The daily SMS job sends the "holiday" template to all approved users on these dates.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {holidays.map((h, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Input
                      placeholder="MM-DD or YYYY-MM-DD"
                      value={h.date}
                      onChange={(e) => updateHoliday(index, 'date', e.target.value)}
                      className="w-48 font-mono text-sm"
                    />
                    <Input
                      placeholder="Holiday Name (e.g. New Year)"
                      value={h.label}
                      onChange={(e) => updateHoliday(index, 'label', e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeHoliday(index)} 
                      className="text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {holidays.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center border rounded-md border-dashed">
                    No holidays configured. Click "Add Holiday" below to create one.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button size="sm" variant="outline" onClick={addHoliday}>
                  <Plus className="h-4 w-4 mr-1" /> Add Holiday
                </Button>
                <Button size="sm" onClick={saveHolidays}>
                  <Save className="h-4 w-4 mr-1" /> Save Holidays
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader><CardTitle className="text-base">Last 50 messages</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Body</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{l.template_key || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{l.recipient_phone}</TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'sent' ? 'default' : 'destructive'}>{l.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-md truncate">{l.body}</TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No SMS sent yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default CMSSmsTemplates;
