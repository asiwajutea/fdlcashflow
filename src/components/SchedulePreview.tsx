import { useEffect, useState } from 'react';
import { db } from '@/lib/supabase-db';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Cake, PartyPopper, Mail, MessageSquare, RefreshCw, Send, Loader2 } from 'lucide-react';

interface ProfileRow {
  id: string;
  full_name: string | null;
  birthday: string | null;
  phone: string | null;
  is_active: boolean;
  approval_status: string;
}

interface ScheduleEntry {
  date: string;          // YYYY-MM-DD
  dayLabel: string;      // "Today", "Tomorrow", "Mon 23 Jun"
  isToday: boolean;
  events: ScheduleEvent[];
}

interface ScheduleEvent {
  type: 'birthday_sms' | 'birthday_email' | 'holiday_sms' | 'holiday_email';
  label: string;
  recipients: string[];  // names
  count: number;
  /** Full profile rows needed to drive "Send Now" */
  profiles: ProfileRow[];
  /** Holiday label, present for holiday events */
  holidayLabel?: string;
}

interface Props {
  mode: 'sms' | 'email' | 'both';
}

export function SchedulePreview({ mode }: Props) {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState<string | null>(null); // key = `${date}-${type}`
  const { toast } = useToast();

  const build = async () => {
    setLoading(true);
    try {
      const [{ data: holSetting }, { data: profiles }] = await Promise.all([
        db.from('app_settings').select('value').eq('key', 'holidays').maybeSingle(),
        db.from('profiles')
          .select('id, full_name, birthday, phone, is_active, approval_status')
          .eq('approval_status', 'approved')
          .eq('is_active', true),
      ]);

      let holidays: { date: string; label: string }[] = [];
      try {
        const parsed = JSON.parse(holSetting?.value || '[]');
        holidays = Array.isArray(parsed) ? parsed : parsed?.date ? [parsed] : [];
      } catch { holidays = []; }

      const days: ScheduleEntry[] = [];
      const now = new Date();

      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        const yyyy = d.getFullYear();
        const mm   = String(d.getMonth() + 1).padStart(2, '0');
        const dd   = String(d.getDate()).padStart(2, '0');
        const iso  = `${yyyy}-${mm}-${dd}`;
        const isoShort = `${mm}-${dd}`;

        const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow'
          : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

        const events: ScheduleEvent[] = [];

        // ── Birthdays ───────────────────────────────────────────────────
        const bdays = (profiles || []).filter(p => {
          if (!p.birthday) return false;
          const bd = new Date(p.birthday);
          return String(bd.getUTCMonth() + 1).padStart(2,'0') + '-' + String(bd.getUTCDate()).padStart(2,'0') === isoShort;
        });

        if (bdays.length > 0) {
          const names = bdays.map(p => p.full_name || 'Unknown');
          const withPhone = bdays.filter(p => !!p.phone);
          if ((mode === 'sms' || mode === 'both') && withPhone.length > 0) {
            events.push({
              type: 'birthday_sms',
              label: 'Birthday SMS',
              recipients: names,
              count: withPhone.length,
              profiles: withPhone,
            });
          }
          if (mode === 'email' || mode === 'both') {
            events.push({
              type: 'birthday_email',
              label: 'Birthday Email',
              recipients: names,
              count: bdays.length,
              profiles: bdays,
            });
          }
        }

        // ── Holidays ────────────────────────────────────────────────────
        const todayHol = holidays.find(h => {
          if (!h?.date) return false;
          const hd = h.date.length === 5 ? h.date : h.date.slice(5);
          return hd === isoShort;
        });

        if (todayHol) {
          const allActive = (profiles || []) as ProfileRow[];
          const withPhone = allActive.filter(p => !!p.phone);
          if ((mode === 'sms' || mode === 'both') && withPhone.length > 0) {
            events.push({
              type: 'holiday_sms',
              label: `Holiday SMS — ${todayHol.label}`,
              recipients: [`All ${withPhone.length} users with phone`],
              count: withPhone.length,
              profiles: withPhone,
              holidayLabel: todayHol.label,
            });
          }
          if (mode === 'email' || mode === 'both') {
            events.push({
              type: 'holiday_email',
              label: `Holiday Email — ${todayHol.label}`,
              recipients: [`All ${allActive.length} active users`],
              count: allActive.length,
              profiles: allActive,
              holidayLabel: todayHol.label,
            });
          }
        }

        days.push({ date: iso, dayLabel, isToday: i === 0, events });
      }

      setSchedule(days);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { build(); }, [mode]);

  // ── Batch helper — max 8 concurrent, 1.1 s gap between batches ────────────
  // Resend's free/default limit is 10 req/s; staying at 8 gives headroom.
  const sendInBatches = async <T,>(
    items: T[],
    fn: (item: T) => Promise<void>,
    batchSize = 8,
    delayMs = 1100,
  ) => {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(fn));
      if (i + batchSize < items.length) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  };

  // ── Send Now handler ────────────────────────────────────────────────────────
  const handleSendNow = async (date: string, ev: ScheduleEvent) => {
    const key = `${date}-${ev.type}`;
    setSending(key);

    let successCount = 0;
    let failCount = 0;

    try {
      await sendInBatches(ev.profiles, async (p) => {
        const firstName = (p.full_name || 'there').split(' ')[0];

        if (ev.type === 'birthday_sms') {
          const { error } = await supabase.functions.invoke('send-sms', {
            body: { to: p.phone, user_id: p.id, template_key: 'birthday', vars: { name: firstName } },
          });
          error ? failCount++ : successCount++;

        } else if (ev.type === 'birthday_email') {
          const { error } = await supabase.functions.invoke('send-email', {
            body: { template_key: 'birthday_greeting', user_id: p.id, name: firstName, vars: { name: firstName } },
          });
          error ? failCount++ : successCount++;

        } else if (ev.type === 'holiday_sms') {
          const { error } = await supabase.functions.invoke('send-sms', {
            body: { to: p.phone, user_id: p.id, template_key: 'holiday', vars: { name: firstName, holiday: ev.holidayLabel } },
          });
          error ? failCount++ : successCount++;

        } else if (ev.type === 'holiday_email') {
          const { error } = await supabase.functions.invoke('send-email', {
            body: { template_key: 'holiday_greeting', user_id: p.id, name: firstName, vars: { name: firstName, holiday: ev.holidayLabel } },
          });
          error ? failCount++ : successCount++;
        }
      });

      if (failCount === 0) {
        toast({ title: 'Sent!', description: `${successCount} message${successCount !== 1 ? 's' : ''} dispatched successfully.` });
      } else if (successCount > 0) {
        toast({
          title: 'Partially sent',
          description: `${successCount} sent, ${failCount} failed.`,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Send failed', description: 'All messages failed to dispatch.', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Unexpected error.', variant: 'destructive' });
    } finally {
      setSending(null);
    }
  };

  // ── Type config ─────────────────────────────────────────────────────────────
  const typeConfig = {
    birthday_sms:   { icon: Cake,        color: 'bg-pink-50 dark:bg-pink-950/20 border-pink-200',   badge: 'bg-pink-100 text-pink-700',   label: 'Birthday SMS' },
    birthday_email: { icon: Cake,        color: 'bg-pink-50 dark:bg-pink-950/20 border-pink-200',   badge: 'bg-pink-100 text-pink-700',   label: 'Birthday Email' },
    holiday_sms:    { icon: PartyPopper, color: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'Holiday SMS' },
    holiday_email:  { icon: PartyPopper, color: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'Holiday Email' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" /> Building schedule…
      </div>
    );
  }

  const hasAnyEvent = schedule.some(d => d.events.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing automated {mode === 'both' ? 'SMS & email' : mode} messages for the next 7 days.
        </p>
        <Button size="sm" variant="outline" onClick={build} className="gap-1.5 h-8 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {!hasAnyEvent ? (
        <div className="rounded-xl border bg-muted/20 py-14 text-center text-muted-foreground">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No scheduled messages in the next 7 days</p>
          <p className="text-xs mt-1">Birthdays and holidays will appear here when due.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedule.map(day => (
            <div key={day.date} className={`rounded-xl border overflow-hidden ${day.isToday ? 'border-primary/40 ring-1 ring-primary/20' : ''}`}>
              {/* Day header */}
              <div className={`flex items-center justify-between px-4 py-2.5 ${day.isToday ? 'bg-primary/5' : 'bg-muted/20'}`}>
                <div className="flex items-center gap-2">
                  <CalendarDays className={`h-4 w-4 ${day.isToday ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-semibold ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                    {day.dayLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">{day.date}</span>
                </div>
                {day.events.length > 0 ? (
                  <Badge variant="secondary" className="text-[10px]">{day.events.length} event{day.events.length !== 1 ? 's' : ''}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">No events</span>
                )}
              </div>

              {/* Events */}
              {day.events.length > 0 && (
                <div className="divide-y">
                  {day.events.map((ev, i) => {
                    const cfg = typeConfig[ev.type];
                    const Icon = cfg.icon;
                    const isEmail = ev.type.includes('email');
                    const sendKey = `${day.date}-${ev.type}`;
                    const isSending = sending === sendKey;
                    return (
                      <div key={i} className={`flex items-start gap-3 px-4 py-3 ${cfg.color}`}>
                        <div className="p-1.5 rounded-lg bg-white/60 dark:bg-white/10 shrink-0 mt-0.5">
                          {isEmail
                            ? <Mail className="h-3.5 w-3.5 text-foreground" />
                            : <MessageSquare className="h-3.5 w-3.5 text-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground">{ev.label}</p>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                              {ev.count} recipient{ev.count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {ev.recipients.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {ev.recipients.slice(0, 4).join(', ')}{ev.recipients.length > 4 ? ` +${ev.recipients.length - 4} more` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5 bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20"
                            disabled={isSending || !!sending}
                            onClick={() => handleSendNow(day.date, ev)}
                            title="Send this message now instead of waiting for the scheduled date"
                          >
                            {isSending
                              ? <><Loader2 className="h-3 w-3 animate-spin" /> Sending…</>
                              : <><Send className="h-3 w-3" /> Send Now</>
                            }
                          </Button>
                          <Icon className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
