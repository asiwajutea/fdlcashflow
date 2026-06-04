import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase-db';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, MinusCircle, X, Settings2, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

type Policy = {
  id?: number;
  all_users_mode: 'anyone' | 'restricted';
  allow_same_department: boolean;
  allow_same_team: boolean;
  allow_managers: boolean;
};
type UserOpt = { id: string; full_name: string };
type BlockRow = { blocked_user_id: string; except_user_ids: string[] };

const ChatPolicies = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<Policy>({
    all_users_mode: 'anyone', allow_same_department: false, allow_same_team: false, allow_managers: true,
  });
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [pickerOpen, setPickerOpen] = useState<null | 'blocked' | { kind: 'except'; blockedId: string }>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data: pol }, { data: blockRows }, { data: us }] = await Promise.all([
      db.from('chat_global_policy').select('*').eq('id', 1).maybeSingle(),
      db.from('chat_user_blocks').select('blocked_user_id, except_user_ids'),
      db.from('profiles').select('id, full_name').eq('approval_status', 'approved').order('full_name').limit(1000),
    ]);
    if (pol) setPolicy(pol as Policy);
    setBlocks((blockRows || []).map((b: any) => ({
      blocked_user_id: b.blocked_user_id,
      except_user_ids: b.except_user_ids || [],
    })));
    setUsers((us || []) as UserOpt[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (role && role !== 'admin') return <Navigate to="/dashboard" replace />;

  const savePolicy = async (next: Partial<Policy>) => {
    const merged = { ...policy, ...next };
    setPolicy(merged);
    setSaving(true);
    const { error } = await db.from('chat_global_policy').update(merged).eq('id', 1);
    setSaving(false);
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
  };

  const blockedIds = useMemo(() => blocks.map((b) => b.blocked_user_id), [blocks]);

  const toggleBlocked = async (id: string) => {
    setSaving(true);
    if (blockedIds.includes(id)) {
      setBlocks((prev) => prev.filter((b) => b.blocked_user_id !== id));
      await db.from('chat_user_blocks').delete().eq('blocked_user_id', id);
    } else {
      setBlocks((prev) => [...prev, { blocked_user_id: id, except_user_ids: [] }]);
      await db.from('chat_user_blocks').insert({ blocked_user_id: id, except_user_ids: [] });
    }
    setSaving(false);
  };

  const toggleExcept = async (blockedId: string, exceptId: string) => {
    const row = blocks.find((b) => b.blocked_user_id === blockedId);
    if (!row) return;
    const next = row.except_user_ids.includes(exceptId)
      ? row.except_user_ids.filter((x) => x !== exceptId)
      : [...row.except_user_ids, exceptId];
    setBlocks((prev) => prev.map((b) => b.blocked_user_id === blockedId ? { ...b, except_user_ids: next } : b));
    setSaving(true);
    await db.from('chat_user_blocks').update({ except_user_ids: next }).eq('blocked_user_id', blockedId);
    setSaving(false);
  };

  const userName = (id: string) => users.find((u) => u.id === id)?.full_name || id.slice(0, 8);
  const filteredUsers = users.filter((u) => !pickerSearch || u.full_name?.toLowerCase().includes(pickerSearch.toLowerCase()));

  const currentSelection: string[] = pickerOpen === 'blocked'
    ? blockedIds
    : (pickerOpen && typeof pickerOpen === 'object'
      ? (blocks.find((b) => b.blocked_user_id === pickerOpen.blockedId)?.except_user_ids || [])
      : []);

  const togglePick = (id: string) => {
    if (pickerOpen === 'blocked') toggleBlocked(id);
    else if (pickerOpen && typeof pickerOpen === 'object') toggleExcept(pickerOpen.blockedId, id);
  };

  const pickerTitle = pickerOpen === 'blocked'
    ? 'Select users blocked from receiving messages'
    : (pickerOpen && typeof pickerOpen === 'object' ? `Allow these users to message ${userName(pickerOpen.blockedId)}` : '');

  if (loading) {
    return <DashboardLayout title="Messaging Policies"><div className="p-6 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Messaging Policies">
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Messaging Policies</h2>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <Card>
          <CardHeader><CardTitle>Who can message whom</CardTitle></CardHeader>
          <CardContent>
            <RadioGroup
              value={policy.all_users_mode}
              onValueChange={(v) => savePolicy({ all_users_mode: v as any })}
              className="space-y-4"
            >
              <div className="rounded-md border p-4 bg-muted/30 space-y-3">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="anyone" id="all-anyone" />
                  <Label htmlFor="all-anyone" className="cursor-pointer">
                    Users <strong>can</strong> start conversations with <strong>anyone</strong>
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="restricted" id="all-restricted" />
                  <div className="flex-1">
                    <Label htmlFor="all-restricted" className="cursor-pointer">
                      Users <strong>can't</strong> start conversations with other users
                    </Label>
                    {policy.all_users_mode === 'restricted' && (
                      <div className="ml-2 mt-3 space-y-2 pl-4 border-l">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={policy.allow_managers} onCheckedChange={(v) => savePolicy({ allow_managers: !!v })} id="mgrs" />
                          <Label htmlFor="mgrs" className="text-sm">Unless they are their direct manager / direct report</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox checked={policy.allow_same_department} onCheckedChange={(v) => savePolicy({ allow_same_department: !!v })} id="dept" />
                          <Label htmlFor="dept" className="text-sm">Unless they share the same department</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox checked={policy.allow_same_team} onCheckedChange={(v) => savePolicy({ allow_same_team: !!v })} id="team" />
                          <Label htmlFor="team" className="text-sm">Unless they share the same team</Label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </RadioGroup>

            <div className="mt-4 rounded-md border p-4 bg-destructive/5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <MinusCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium">Users <strong>can never</strong> message</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {blockedIds.length === 0 && <span className="text-xs text-muted-foreground">No users blocked</span>}
                    {blocks.map((b) => (
                      <Badge key={b.blocked_user_id} variant="secondary" className="gap-1 pr-1">
                        {userName(b.blocked_user_id)}
                        {b.except_user_ids.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">· except {b.except_user_ids.length}</span>
                        )}
                        <button title="Manage exceptions" className="ml-1 p-0.5 hover:bg-background rounded"
                          onClick={() => { setPickerOpen({ kind: 'except', blockedId: b.blocked_user_id }); setPickerSearch(''); }}>
                          <Settings2 className="h-3 w-3" />
                        </button>
                        <button title="Remove" onClick={() => toggleBlocked(b.blocked_user_id)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button variant="link" onClick={() => { setPickerOpen('blocked'); setPickerSearch(''); }}>
                {blockedIds.length > 0 ? `${blockedIds.length} selected` : 'Select users'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Admins can always message everyone, and every user can always message an admin — these rules govern all other directions.
        </p>

        <Dialog open={!!pickerOpen} onOpenChange={(o) => !o && setPickerOpen(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{pickerTitle}</DialogTitle></DialogHeader>
            <Input placeholder="Search…" value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} />
            <ScrollArea className="h-72 border rounded-md">
              {filteredUsers.map((u) => {
                const checked = currentSelection.includes(u.id);
                return (
                  <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={() => togglePick(u.id)} />
                    <p className="text-sm">{u.full_name}</p>
                  </label>
                );
              })}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ChatPolicies;
