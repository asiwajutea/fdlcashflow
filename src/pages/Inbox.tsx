import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { InboxCompose } from '@/components/InboxCompose';
import { Mail, MailOpen, Send, Reply, ArrowLeft, Plus, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

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

const Inbox = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    const query = tab === 'inbox'
      ? (supabase as any).from('messages').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false })
      : (supabase as any).from('messages').select('*').eq('sender_id', user.id).order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) { console.error(error); setLoading(false); return; }

    const userIds = [...new Set((data || []).flatMap((m: any) => [m.sender_id, m.recipient_id]))];
    const { data: profiles } = await (supabase as any).from('profiles').select('id, full_name').in('id', userIds);
    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || 'Unknown']));

    setMessages((data || []).map((m: any) => ({
      ...m,
      sender_name: nameMap.get(m.sender_id) || 'Unknown',
      recipient_name: nameMap.get(m.recipient_id) || 'Unknown',
    })));
    setLoading(false);
  }, [user, tab]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('inbox-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchMessages]);

  const selectMessage = async (msg: Message) => {
    // Resolve to thread root so replies show with their parent
    let root: Message = msg;
    if (msg.parent_message_id) {
      const { data: parent } = await (supabase as any).from('messages').select('*').eq('id', msg.parent_message_id).maybeSingle();
      if (parent) {
        const senderName = messages.find(m => m.id === parent.sender_id)?.sender_name;
        root = { ...parent, sender_name: senderName || msg.sender_name, recipient_name: msg.recipient_name } as Message;
      }
    }
    setSelectedMessage(root);
    setReplyText('');
    // Mark the clicked message as read
    if (!msg.is_read && msg.recipient_id === user?.id) {
      await (supabase as any).from('messages').update({ is_read: true }).eq('id', msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
    // Fetch thread replies under the root
    const { data } = await (supabase as any).from('messages').select('*').eq('parent_message_id', root.id).order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.flatMap((m: any) => [m.sender_id, m.recipient_id]))];
      const { data: profiles } = await (supabase as any).from('profiles').select('id, full_name').in('id', userIds);
      const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || 'Unknown']));
      setReplies(data.map((m: any) => ({ ...m, sender_name: nameMap.get(m.sender_id) || 'Unknown' })));
    } else {
      setReplies([]);
    }
  };

  const handleReply = async () => {
    if (!user || !selectedMessage || !replyText.trim()) return;
    setSending(true);
    const recipientId = selectedMessage.sender_id === user.id ? selectedMessage.recipient_id : selectedMessage.sender_id;
    const { error } = await (supabase as any).from('messages').insert({
      sender_id: user.id,
      recipient_id: recipientId,
      subject: `Re: ${selectedMessage.subject}`,
      body: replyText,
      parent_message_id: selectedMessage.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setReplyText('');
      toast({ title: 'Reply sent' });
      selectMessage(selectedMessage);
    }
    setSending(false);
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Inbox">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Inbox">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" /> Messages
            </h2>
          </div>
          <Button onClick={() => setComposeOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Compose
          </Button>
        </div>

        <div className="flex gap-2 mb-2">
          <Button variant={tab === 'inbox' ? 'default' : 'outline'} size="sm" onClick={() => { setTab('inbox'); setSelectedMessage(null); }}>
            Inbox
          </Button>
          <Button variant={tab === 'sent' ? 'default' : 'outline'} size="sm" onClick={() => { setTab('sent'); setSelectedMessage(null); }}>
            Sent
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 min-h-[60vh]">
          {/* Message List */}
          <Card className="lg:w-5/12 overflow-hidden">
            <ScrollArea className="h-[65vh]">
              {messages.length === 0 ? (
                <div className="p-8 text-center">
                  <MailOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No messages</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 cursor-pointer border-b transition-colors hover:bg-accent/50 ${
                      selectedMessage?.id === msg.id ? 'bg-accent/30' : ''
                    } ${!msg.is_read && tab === 'inbox' ? 'bg-primary/5' : ''}`}
                    onClick={() => selectMessage(msg)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!msg.is_read && tab === 'inbox' && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                          <p className={`text-sm truncate ${!msg.is_read && tab === 'inbox' ? 'font-bold' : 'font-medium'}`}>
                            {tab === 'inbox' ? msg.sender_name : msg.recipient_name}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate mt-0.5">{msg.subject || '(No subject)'}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.body?.substring(0, 80)}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(msg.created_at), 'MMM d')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </Card>

          {/* Message Detail */}
          <Card className="lg:w-7/12 overflow-hidden">
            {selectedMessage ? (
              <div className="flex flex-col h-[65vh]">
                <div className="p-5 border-b">
                  <h3 className="text-lg font-bold text-foreground">{selectedMessage.subject || '(No subject)'}</h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>From: <strong className="text-foreground">{selectedMessage.sender_name}</strong></span>
                    <span>→</span>
                    <span>To: <strong className="text-foreground">{selectedMessage.recipient_name}</strong></span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(selectedMessage.created_at), 'PPP p')}
                  </div>
                </div>

                <ScrollArea className="flex-1 p-5">
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-foreground">{selectedMessage.body}</p>
                  </div>

                  {replies.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <Separator />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Replies</p>
                      {replies.map((reply) => (
                        <div key={reply.id} className="p-3 rounded-lg bg-muted/50 border">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">{reply.sender_name}</span>
                            <span>{format(new Date(reply.created_at), 'MMM d, p')}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 border-t bg-muted/30">
                  <div className="flex gap-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button onClick={handleReply} disabled={sending || !replyText.trim()} size="sm" className="self-end gap-1">
                      <Send className="h-3.5 w-3.5" />
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[65vh] text-muted-foreground">
                <div className="text-center">
                  <MailOpen className="h-16 w-16 mx-auto mb-3 opacity-30" />
                  <p>Select a message to read</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <InboxCompose open={composeOpen} onOpenChange={setComposeOpen} onSent={fetchMessages} />
    </DashboardLayout>
  );
};

export default Inbox;
