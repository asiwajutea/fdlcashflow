import { useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, Sparkles, RotateCcw, Loader2, Bot, User as UserIcon } from 'lucide-react';

interface ChatMsg { role: 'user' | 'assistant'; content: string }

const STORAGE_KEY = 'fdl_ai_copilot_history';
const SUGGESTIONS = [
  'How much have we paid out in salaries in the last 3 months?',
  'Show me approved cash advances and reimbursements this quarter.',
  'Which users are at or over their budget limits this month?',
  'Where does the recruitment pipeline stand right now?',
  'Who are the top 5 approved spenders?',
];

export default function AIAssistant() {
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40))); } catch { /* ignore */ }
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const next: ChatMsg[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-copilot', { body: { messages: next } });
      if (error) throw error;
      const reply = (data as any)?.reply || (data as any)?.error || 'No response.';
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      toast({ title: 'Assistant failed', description: e?.message || 'Unknown error', variant: 'destructive' });
      setMessages([...next, { role: 'assistant', content: `Sorry, I hit an error: ${e?.message || 'unknown'}.` }]);
    } finally {
      setSending(false);
    }
  };

  const clear = () => { setMessages([]); try { localStorage.removeItem(STORAGE_KEY); } catch {} };

  if (!authLoading && role !== 'admin') {
    return (
      <DashboardLayout title="AI Assistant">
        <Card><CardContent className="py-10 text-center text-muted-foreground">The AI Assistant is available to admins only.</CardContent></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="AI Assistant">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> AI Assistant</h1>
            <p className="text-sm text-muted-foreground">Ask about finance, payroll, budgets and recruitment.</p>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clear}><RotateCcw className="h-4 w-4 mr-1" /> New chat</Button>
          )}
        </div>

        <Card className="h-[60vh] flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollerRef as any}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                <Bot className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground max-w-md">Hi! I can pull live data on payroll, advances, reimbursements, budgets and recruitment. Try one of these:</p>
                <div className="grid grid-cols-1 gap-2 w-full max-w-lg">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="text-left text-sm border rounded-lg p-3 hover:bg-muted/40 transition">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={m.role === 'user' ? 'bg-primary/10' : 'bg-orange-500/10'}>
                      {m.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4 text-orange-600" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8"><AvatarFallback className="bg-orange-500/10"><Bot className="h-4 w-4 text-orange-600" /></AvatarFallback></Avatar>
                <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</div>
              </div>
            )}
          </CardContent>
          <div className="border-t p-3 flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything about the business…"
              rows={1}
              className="resize-none"
              disabled={sending}
            />
            <Button onClick={() => send()} disabled={sending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
