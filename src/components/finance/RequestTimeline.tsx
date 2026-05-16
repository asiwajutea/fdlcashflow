import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useRequestEvents, RequestEvent } from '@/hooks/useRequestEvents';
import { Check, X, Clock, MessageSquare, RotateCcw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string | null;
  request?: any;
}

const ICONS: Record<RequestEvent['event_type'], any> = {
  submitted: Clock,
  approved: Check,
  rejected: X,
  note_added: MessageSquare,
  repaid: RotateCcw,
};

const TONES: Record<RequestEvent['event_type'], string> = {
  submitted: 'bg-muted text-foreground',
  approved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  rejected: 'bg-destructive/15 text-destructive',
  note_added: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  repaid: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
};

export function RequestTimeline({ open, onOpenChange, requestId, request }: Props) {
  const { data: events = [], isLoading } = useRequestEvents(requestId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Request timeline</SheetTitle>
          <SheetDescription>
            {request ? (
              <span className="flex flex-col gap-1">
                <span className="capitalize">{request.kind?.replace('_', ' ')}</span>
                <span className="text-foreground font-semibold">₦{Number(request.amount || 0).toLocaleString()}</span>
                <Badge variant="outline" className="w-fit capitalize">{request.status}</Badge>
              </span>
            ) : 'History of this request'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events recorded.</p>
          ) : (
            <ol className="relative border-l border-border ml-4 space-y-6">
              {events.map((e) => {
                const Icon = ICONS[e.event_type];
                return (
                  <li key={e.id} className="ml-6">
                    <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${TONES[e.event_type]}`}>
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-medium capitalize">{e.event_type.replace('_', ' ')}</p>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(e.created_at), 'MMM d, yyyy • h:mm a')}
                      </time>
                    </div>
                    {e.note && <p className="mt-1 text-sm text-muted-foreground italic">"{e.note}"</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
