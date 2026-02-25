import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Send } from 'lucide-react';

interface InboxComposeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}

export const InboxCompose: React.FC<InboxComposeProps> = ({ open, onOpenChange, onSent }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchUsers = async () => {
      const { data } = await (supabase as any).from('profiles').select('id, full_name');
      setUsers((data || []).filter((p: any) => p.id !== user?.id));
    };
    fetchUsers();
  }, [open, user]);

  const handleSend = async () => {
    if (!user || !recipientId || !body.trim()) return;
    setSending(true);
    const { error } = await (supabase as any).from('messages').insert({
      sender_id: user.id,
      recipient_id: recipientId,
      subject,
      body,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Message sent' });
      setRecipientId('');
      setSubject('');
      setBody('');
      onOpenChange(false);
      onSent();
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>To</Label>
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="mt-1" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." rows={5} className="mt-1" />
          </div>
          <Button onClick={handleSend} disabled={sending || !recipientId || !body.trim()} className="w-full gap-2">
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
