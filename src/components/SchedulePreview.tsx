import { useEffect, useState } from 'react';
import { db } from '@/lib/supabase-db';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Cake, PartyPopper, Mail, MessageSquare, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

interface Props {
  mode: 'sms' | 'email' | 'both';
}

export function SchedulePreview({ mode }: Props) {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading]   = useState(true);

  const build = async () => {
    setLoading(true);
    try {
      // Load holidays and active profiles in parallel
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
          const withPhone = bdays.filter(p => !!p.phone).length;
          if ((mode === 'sms' || mode === 'both') && withPhone > 0) {
            events.push({ type: 'birthday_sms', label: 'Birthday SMS', recipients: names, count: withPhone });
          }
          if (mode === 'email' || mode === 'both') {
            events.push({ type: 'birthday_email', label: 'Birthday Email', recipients: names, count: bdays.length });
          }
        }

        // ── Holidays ────────────────────────────────────────────────────
        const todayHol = holidays.find(h => {
          if (!h?.date) return false;
          const hd = h.date.length === 5 ? h.date : h.date.slice(5);
          return hd === isoShort;
        });

        if (todayHol) {
          const allActive = profiles || [];
          const withPhone = allActive.filter(p => !!p.phone).length;
          if ((mode === 'sms' || mode === 'both') && withPhone > 0) {
            events.push({
              type: 'holiday_sms',
              label: `Holiday SMS — ${todayHol.label}`,
              recipients: [`All ${withPhone} users with phone`],
              count: withPhone,
            });
          }
          if (mode === 'email' || mode === 'both') {
            events.push({
              type: 'holiday_email',
              label: `Holiday Email — ${todayHol.label}`,
              recipients: [`All ${allActive.length} active users`],
              count: allActive.length,
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
                        <Icon className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
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
