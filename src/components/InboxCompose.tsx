import React, { useState, useEffect, useRef } from 'react';
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
import { Send, X, ChevronDown, Search, Paperclip, Smile, Loader2 } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface InboxComposeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}

interface UserRow { id: string; full_name: string; role?: string }
interface AttachmentDraft { file: File; previewUrl?: string }

export const InboxCompose: React.FC<InboxComposeProps> = ({ open, onOpenChange, onSent }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingUsers(true);
    (async () => {
      // Fetch profiles, then filter by can_message_user RPC server-side
      const { data: profiles } = await (supabase as any).from('profiles').select('id, full_name').eq('approval_status', 'approved');
      const candidates = (profiles || []).filter((p: any) => p.id !== user?.id);
      // Batch-check permission for each
      const checks = await Promise.all(candidates.map(async (p: any) => {
        const { data } = await (supabase as any).rpc('can_message_user', { _recipient_id: p.id });
        return data ? p : null;
      }));
      const allowed: UserRow[] = checks.filter(Boolean).map((p: any) => ({ id: p.id, full_name: p.full_name || 'Unknown' }));
      allowed.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      setUsers(allowed);
      setLoadingUsers(false);
    })();
  }, [open, user]);

  const toggleRecipient = (id: string) => {
    setRecipientIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const drafts: AttachmentDraft[] = Array.from(files).map((f) => ({ file: f }));
    setAttachments((prev) => [...prev, ...drafts]);
  };

  const removeAttachment = (idx: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== idx));

  const insertEmoji = (e: EmojiClickData) => {
    setBody((prev) => prev + e.emoji);
  };

  const uploadAttachments = async (messageId: string) => {
    if (!user || attachments.length === 0) return;
    for (const att of attachments) {
      const ext = att.file.name.split('.').pop() || 'bin';
      const path = `${user.id}/${messageId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('message-attachments').upload(path, att.file, { contentType: att.file.type });
      if (upErr) { console.error('upload err', upErr); continue; }
      const { data: pub } = supabase.storage.from('message-attachments').getPublicUrl(path);
      await (supabase as any).from('message_attachments').insert({
        message_id: messageId,
        file_url: pub.publicUrl,
        file_name: att.file.name,
        mime_type: att.file.type,
        size_bytes: att.file.size,
      });
    }
  };

  const handleSend = async () => {
    if (!user || recipientIds.length === 0 || (!body.trim() && attachments.length === 0)) return;
    setSending(true);
    const rows = recipientIds.map((rid) => ({
      sender_id: user.id,
      recipient_id: rid,
      subject,
      body,
    }));
    const { data, error } = await (supabase as any).from('messages').insert(rows).select('id');
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setSending(false);
      return;
    }
    // Upload attachments per inserted message (replicate across each recipient)
    if (data && attachments.length > 0) {
      await Promise.all((data as any[]).map((m) => uploadAttachments(m.id)));
    }
    toast({ title: `Message sent to ${recipientIds.length} recipient${recipientIds.length > 1 ? 's' : ''}` });
    setRecipientIds([]);
    setSubject('');
    setBody('');
    setAttachments([]);
    onOpenChange(false);
    onSent();
    setSending(false);
  };

  const filtered = users.filter((u) => u.full_name.toLowerCase().includes(search.toLowerCase()));
  const selectedUsers = users.filter((u) => recipientIds.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Message</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>To</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between mt-1 font-normal">
                  <span className="truncate text-left">
                    {recipientIds.length === 0 ? (loadingUsers ? 'Loading recipients…' : 'Select recipients') : `${recipientIds.length} selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-9" />
                  </div>
                </div>
                <div className="max-h-64 overflow-auto">
                  {loadingUsers ? (
                    <div className="p-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Checking permissions…</div>
                  ) : filtered.length === 0 ? (
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
            <div className="flex items-center gap-2 mt-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} className="gap-1">
                <Paperclip className="h-4 w-4" /> Attach
              </Button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" variant="ghost" className="gap-1">
                    <Smile className="h-4 w-4" /> Emoji
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-0" align="start">
                  <EmojiPicker onEmojiClick={insertEmoji} width={300} height={350} />
                </PopoverContent>
              </Popover>
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {attachments.map((a, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {a.file.name}
                    <button onClick={() => removeAttachment(i)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleSend} disabled={sending || recipientIds.length === 0 || (!body.trim() && attachments.length === 0)} className="w-full gap-2">
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : `Send Message${recipientIds.length > 1 ? ` (${recipientIds.length})` : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
