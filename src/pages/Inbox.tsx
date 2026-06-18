import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { InboxCompose } from '@/components/InboxCompose';
import { Mail, MailOpen, Send, Reply, ArrowLeft, Plus, Clock, User, Paperclip, Smile, X, FileText } from 'lucide-react';
import { format } from 'date-fns';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  parent_message_id: string | null;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
}

interface MsgAttachment {
  id: string; message_id: string; file_url: string; file_name: string; mime_type?: string;
}

// Resolve display names for a list of user IDs.
// Falls back to auth.users email metadata when profiles.full_name is missing —
// this matters for candidates whose profile row may have no full_name.
async function resolveNames(userIds: string[]): Promise<Map<string, string>> {
  if (!userIds.length) return new Map();
  const { data: profiles } = await (supabase as any)
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);
  const map = new Map<string, string>();
  (profiles || []).forEach((p: any) => {
    if (p.full_name) map.set(p.id, p.full_name);
  });

  // For any IDs we couldn't resolve, try auth.users metadata via RPC
  const missing = userIds.filter(id => !map.has(id));
  if (missing.length) {
    try {
      // Use a public RPC that returns full_name / email for a list of user IDs
      // (SECURITY DEFINER so candidates can call it)
      const { data: authNames } = await (supabase as any).rpc('get_user_display_names', { user_ids: missing });
      (authNames || []).forEach((row: any) => {
        if (row.id && row.display_name) map.set(row.id, row.display_name);
      });
    } catch {
      // RPC may not exist — leave as Unknown
    }
  }
  return map;
}

const Inbox = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [messages, setMessages]           = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replies, setReplies]             = useState<Message[]>([]);
  const [attachmentsByMsg, setAttachmentsByMsg] = useState<Record<string, MsgAttachment[]>>({});
  const [replyText, setReplyText]         = useState('');
  const [replyOpen, setReplyOpen]         = useState(false);
  const [sending, setSending]             = useState(false);
  const [loading, setLoading]             = useState(true);
  const [composeOpen, setComposeOpen]     = useState(false);
  const [tab, setTab]                     = useState<'inbox' | 'sent'>('inbox');
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [replyEmojiOpen, setReplyEmojiOpen] = useState(false);
  // Mobile: 'list' | 'detail'
  const [mobileView, setMobileView]       = useState<'list' | 'detail'>('list');
  const replyFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    const query = tab === 'inbox'
      ? (supabase as any).from('messages').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false })
      : (supabase as any).from('messages').select('*').eq('sender_id', user.id).order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) { setLoading(false); return; }

    const userIds = [...new Set((data || []).flatMap((m: any) => [m.sender_id, m.recipient_id]))] as string[];
    const nameMap = await resolveNames(userIds);

    setMessages((data || []).map((m: any) => ({
      ...m,
      sender_name: nameMap.get(m.sender_id) || 'Unknown',
      recipient_name: nameMap.get(m.recipient_id) || 'Unknown',
    })));
    setLoading(false);
  }, [user, tab]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('inbox-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchMessages]);

  const selectMessage = async (msg: Message) => {
    let root: Message = msg;
    if (msg.parent_message_id) {
      const { data: parent } = await (supabase as any).from('messages').select('*').eq('id', msg.parent_message_id).maybeSingle();
      if (parent) {
        const parentIds = [parent.sender_id, parent.recipient_id] as string[];
        const parentNames = await resolveNames(parentIds);
        root = {
          ...parent,
          sender_name: parentNames.get(parent.sender_id) || msg.sender_name || 'Unknown',
          recipient_name: parentNames.get(parent.recipient_id) || msg.recipient_name || 'Unknown',
        };
      }
    }
    setSelectedMessage(root);
    setReplyText('');
    setReplyOpen(false);
    // Switch to detail view on mobile
    setMobileView('detail');

    if (!msg.is_read && msg.recipient_id === user?.id) {
      await (supabase as any).from('messages').update({ is_read: true }).eq('id', msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }

    const { data: replyData } = await (supabase as any)
      .from('messages').select('*').eq('parent_message_id', root.id).order('created_at', { ascending: true });

    let replyList: Message[] = [];
    if (replyData?.length) {
      const rIds = [...new Set(replyData.flatMap((m: any) => [m.sender_id, m.recipient_id]))] as string[];
      const rNames = await resolveNames(rIds);
      replyList = replyData.map((m: any) => ({
        ...m,
        sender_name: rNames.get(m.sender_id) || 'Unknown',
        recipient_name: rNames.get(m.recipient_id) || 'Unknown',
      }));
    }
    setReplies(replyList);

    const msgIds = [root.id, ...replyList.map(r => r.id)];
    const { data: atts } = await (supabase as any).from('message_attachments').select('*').in('message_id', msgIds);
    const grouped: Record<string, MsgAttachment[]> = {};
    (atts || []).forEach((a: MsgAttachment) => {
      grouped[a.message_id] = grouped[a.message_id] || [];
      grouped[a.message_id].push(a);
    });
    setAttachmentsByMsg(grouped);
  };

  const backToList = () => {
    setMobileView('list');
    setSelectedMessage(null);
  };

  const uploadReplyAttachments = async (messageId: string) => {
    if (!user || !replyAttachments.length) return;
    for (const file of replyAttachments) {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${user.id}/${messageId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('message-attachments').upload(path, file, { contentType: file.type });
      if (upErr) continue;
      const { data: pub } = supabase.storage.from('message-attachments').getPublicUrl(path);
      await (supabase as any).from('message_attachments').insert({
        message_id: messageId, file_url: pub.publicUrl, file_name: file.name, mime_type: file.type, size_bytes: file.size,
      });
    }
  };

  const handleReply = async () => {
    if (!user || !selectedMessage || (!replyText.trim() && !replyAttachments.length)) return;
    setSending(true);
    const recipientId = selectedMessage.sender_id === user.id ? selectedMessage.recipient_id : selectedMessage.sender_id;
    const { data, error } = await (supabase as any).from('messages').insert({
      sender_id: user.id,
      recipient_id: recipientId,
      subject: `Re: ${selectedMessage.subject}`,
      body: replyText,
      parent_message_id: selectedMessage.id,
    }).select('id').single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      if (data?.id) await uploadReplyAttachments(data.id);
      setReplyText(''); setReplyAttachments([]);
      toast({ title: 'Reply sent' });
      selectMessage(selectedMessage);
    }
    setSending(false);
  };

  const initials = (name?: string) => (name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Inbox">
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading…</div>
      </DashboardLayout>
    );
  }

  // ── Message list panel ────────────────────────────────────────────────
  const ListPanel = (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 p-3 border-b">
        <Button variant={tab === 'inbox' ? 'default' : 'outline'} size="sm" className="flex-1"
          onClick={() => { setTab('inbox'); backToList(); }}>
          Inbox {messages.filter(m => !m.is_read && tab === 'inbox').length > 0 && (
            <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">
              {messages.filter(m => !m.is_read).length}
            </Badge>
          )}
        </Button>
        <Button variant={tab === 'sent' ? 'default' : 'outline'} size="sm" className="flex-1"
          onClick={() => { setTab('sent'); backToList(); }}>
          Sent
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <MailOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No messages</p>
          </div>
        ) : messages.map(msg => {
          const name = tab === 'inbox' ? msg.sender_name : msg.recipient_name;
          const unread = !msg.is_read && tab === 'inbox';
          return (
            <div key={msg.id}
              className={`flex items-start gap-3 px-4 py-3.5 border-b cursor-pointer transition-colors hover:bg-accent/40
                ${selectedMessage?.id === msg.id ? 'bg-accent/30' : ''}
                ${unread ? 'bg-primary/5' : ''}`}
              onClick={() => selectMessage(msg)}>
              <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                <AvatarFallback className={`text-xs ${unread ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${unread ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>{name}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{format(new Date(msg.created_at), 'MMM d')}</span>
                </div>
                <p className={`text-sm truncate mt-0.5 ${unread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {msg.subject || '(No subject)'}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.body?.substring(0, 80)}</p>
              </div>
              {unread && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );

  // ── Message detail panel ──────────────────────────────────────────────
  const DetailPanel = selectedMessage ? (
    <div className="flex flex-col h-full">
      {/* Detail header */}
      <div className="flex items-start gap-3 px-4 py-4 border-b">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-0.5"
          onClick={backToList}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground leading-tight">{selectedMessage.subject || '(No subject)'}</h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />
              <strong className="text-foreground">{selectedMessage.sender_name}</strong>
            </span>
            <span>→ {selectedMessage.recipient_name}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(new Date(selectedMessage.created_at), 'PPP p')}
          </div>
        </div>
      </div>

      {/* Body + replies */}
      <ScrollArea className="flex-1 px-4 py-4">
        <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">{selectedMessage.body}</p>

        {(attachmentsByMsg[selectedMessage.id] || []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {attachmentsByMsg[selectedMessage.id].map(a => (
              <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
                className="text-xs inline-flex items-center gap-1 px-2 py-1 border rounded-md bg-background hover:bg-accent">
                <FileText className="h-3 w-3" /> {a.file_name}
              </a>
            ))}
          </div>
        )}

        {replies.length > 0 && (
          <div className="mt-6 space-y-3">
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}</p>
            {replies.map(reply => (
              <div key={reply.id} className="p-3 rounded-xl bg-muted/50 border">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials(reply.sender_name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-foreground">{reply.sender_name}</span>
                  </div>
                  <span className="text-muted-foreground">{format(new Date(reply.created_at), 'MMM d, p')}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap text-foreground">{reply.body}</p>
                {(attachmentsByMsg[reply.id] || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {attachmentsByMsg[reply.id].map(a => (
                      <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
                        className="text-xs inline-flex items-center gap-1 px-2 py-1 border rounded-md bg-background hover:bg-accent">
                        <FileText className="h-3 w-3" /> {a.file_name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Reply box */}
      <div className="p-3 border-t bg-muted/20">
        {!replyOpen ? (
          <Button onClick={() => setReplyOpen(true)} size="sm" variant="outline" className="gap-1.5 w-full sm:w-auto">
            <Reply className="h-3.5 w-3.5" /> Reply
          </Button>
        ) : (
          <div className="space-y-2">
            <Textarea value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply…" rows={3} autoFocus className="text-sm" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button size="sm" variant="ghost" onClick={() => replyFileRef.current?.click()} className="h-7 gap-1 text-xs">
                <Paperclip className="h-3.5 w-3.5" /> Attach
              </Button>
              <input ref={replyFileRef} type="file" multiple className="hidden"
                onChange={e => { if (e.target.files) setReplyAttachments(p => [...p, ...Array.from(e.target.files!)]); e.target.value = ''; }} />
              <Popover open={replyEmojiOpen} onOpenChange={setReplyEmojiOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"><Smile className="h-3.5 w-3.5" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-0" align="start">
                  <EmojiPicker onEmojiClick={(e: EmojiClickData) => setReplyText(p => p + e.emoji)} width={280} height={320} />
                </PopoverContent>
              </Popover>
              <div className="ml-auto flex gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={() => { setReplyOpen(false); setReplyText(''); setReplyAttachments([]); }}>Cancel</Button>
                <Button size="sm" className="h-7 gap-1 text-xs"
                  disabled={sending || (!replyText.trim() && !replyAttachments.length)} onClick={handleReply}>
                  <Send className="h-3.5 w-3.5" /> Send
                </Button>
              </div>
            </div>
            {replyAttachments.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {replyAttachments.map((f, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 text-xs">
                    {f.name}
                    <button onClick={() => setReplyAttachments(p => p.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <div className="text-center">
        <MailOpen className="h-14 w-14 mx-auto mb-3 opacity-25" />
        <p className="text-sm">Select a message to read</p>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Inbox">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Messages
          </h2>
          <Button onClick={() => setComposeOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Compose
          </Button>
        </div>

        {/* ── MOBILE: single-panel flip (Gmail style) ── */}
        <div className="lg:hidden">
          <Card className="overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
            {mobileView === 'list' ? ListPanel : DetailPanel}
          </Card>
        </div>

        {/* ── DESKTOP: side-by-side panels ── */}
        <div className="hidden lg:flex gap-4" style={{ height: 'calc(100vh - 200px)' }}>
          <Card className="w-5/12 overflow-hidden flex flex-col">{ListPanel}</Card>
          <Card className="w-7/12 overflow-hidden flex flex-col">{DetailPanel}</Card>
        </div>
      </div>

      <InboxCompose open={composeOpen} onOpenChange={setComposeOpen} onSent={fetchMessages} />
    </DashboardLayout>
  );
};

export default Inbox;
