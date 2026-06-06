import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, Sparkles, RotateCcw, Loader2, Bot, User as UserIcon } from 'lucide-react';

interface ChatMsg { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'How much have we paid out in salaries in the last 3 months?',
  'Show me approved cash advances and reimbursements this quarter.',
  'Which users are at or over their budget limits this month?',
  'Where does the recruitment pipeline stand right now?',
  'Who are the top 5 approved spenders?',
];

interface Props {
  storageKey?: string;
  heightClass?: string;
  showHeader?: boolean;
}

export default function AIAssistantPanel({ storageKey = 'fdl_ai_copilot_history', heightClass = 'h-[60vh]', showHeader = true }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const raw = localStorage.getItem(storageKey); if (raw) setMessages(JSON.parse(raw)); } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40))); } catch { /* ignore */ }
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, storageKey]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const next: ChatMsg[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      // Send only role+content to avoid edge function issues
      const cleanMessages = next.map(m => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke('ai-copilot', { body: { messages: cleanMessages } });
      if (error) throw error;
      const reply = (data as any)?.reply || (data as any)?.error || 'No response.';
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      const msg = e?.message || 'Unknown error';
      toast({ title: 'Assistant failed', description: msg, variant: 'destructive' });
      setMessages([...next, { role: 'assistant', content: `Sorry, I hit an error: ${msg}.` }]);
    } finally {
      setSending(false);
    }
  };

  const clear = () => { setMessages([]); try { localStorage.removeItem(storageKey); } catch {} };

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Assistant</h2>
            <p className="text-sm text-muted-foreground">Ask about finance, payroll, budgets and recruitment.</p>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clear}><RotateCcw className="h-4 w-4 mr-1" /> New chat</Button>
          )}
        </div>
      )}

      <Card className={`flex flex-col ${heightClass}`}>
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
  );
}
