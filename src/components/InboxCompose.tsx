import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Send, X, ChevronDown, Search } from 'lucide-react';

interface InboxComposeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}

interface UserRow { id: string; full_name: string; role?: string }

export const InboxCompose: React.FC<InboxComposeProps> = ({ open, onOpenChange, onSent }) => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!open) return;
    const fetchUsers = async () => {
      // Fetch profiles + roles
      const [profilesRes, rolesRes] = await Promise.all([
        (supabase as any).from('profiles').select('id, full_name'),
        (supabase as any).from('user_roles').select('user_id, role'),
      ]);
      const roleMap = new Map((rolesRes.data || []).map((r: any) => [r.user_id, r.role]));
      let list: UserRow[] = (profilesRes.data || [])
        .filter((p: any) => p.id !== user?.id)
        .map((p: any) => ({ id: p.id, full_name: p.full_name || 'Unknown', role: roleMap.get(p.id) as string | undefined }));
      // Non-admins can only message admins
      if (!isAdmin) {
        list = list.filter((u) => u.role === 'admin');
      }
      list.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      setUsers(list);
    };
    fetchUsers();
  }, [open, user, isAdmin]);

  const toggleRecipient = (id: string) => {
    setRecipientIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (!user || recipientIds.length === 0 || !body.trim()) return;
    setSending(true);
    const rows = recipientIds.map((rid) => ({
      sender_id: user.id,
      recipient_id: rid,
      subject,
      body,
    }));
    const { error } = await (supabase as any).from('messages').insert(rows);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Message sent to ${recipientIds.length} recipient${recipientIds.length > 1 ? 's' : ''}` });
      setRecipientIds([]);
      setSubject('');
      setBody('');
      onOpenChange(false);
      onSent();
    }
    setSending(false);
  };

  const filtered = users.filter((u) => u.full_name.toLowerCase().includes(search.toLowerCase()));
  const selectedUsers = users.filter((u) => recipientIds.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>To {!isAdmin && <span className="text-xs text-muted-foreground">(admins only)</span>}</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between mt-1 font-normal">
                  <span className="truncate text-left">
                    {recipientIds.length === 0 ? 'Select recipients' : `${recipientIds.length} selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search..."
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-auto">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 text-center">No users available</p>
                  ) : (
                    filtered.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleRecipient(u.id)}
                        className={`w-full text-left p-2 hover:bg-accent text-sm flex items-center justify-between ${recipientIds.includes(u.id) ? 'bg-accent/50' : ''}`}
                      >
                        <span>{u.full_name}</span>
                        {recipientIds.includes(u.id) && <span className="text-xs text-primary">✓</span>}
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedUsers.map((u) => (
                  <Badge key={u.id} variant="secondary" className="gap-1">
                    {u.full_name}
                    <button onClick={() => toggleRecipient(u.id)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="mt-1" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." rows={5} className="mt-1" />
          </div>
          <Button onClick={handleSend} disabled={sending || recipientIds.length === 0 || !body.trim()} className="w-full gap-2">
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : `Send Message${recipientIds.length > 1 ? ` (${recipientIds.length})` : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
