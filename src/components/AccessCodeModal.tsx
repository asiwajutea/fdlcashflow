import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, ShieldAlert, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AccessCodeModalProps {
  open: boolean;
  passcode: string;
  userId: string;
  onAcknowledged: () => void;
}

export const AccessCodeModal: React.FC<AccessCodeModalProps> = ({ open, passcode, userId, onAcknowledged }) => {
  const { toast } = useToast();
  const [revealed, setRevealed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(passcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleAcknowledge = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ passcode_acknowledged: true })
      .eq('id', userId);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    onAcknowledged();
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* cannot dismiss */ }}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto bg-destructive/10 p-3 rounded-full mb-2">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-center">Your Personal Access Code</DialogTitle>
          <DialogDescription className="text-center">
            This is your 8-digit access code. You will need it every time you sign in from now on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted rounded-lg p-6 text-center">
            <div className="text-3xl font-mono font-bold tracking-widest text-primary">
              {revealed ? passcode : '••••••••'}
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setRevealed(!revealed)}>
                {revealed ? <><EyeOff className="h-4 w-4 mr-1" /> Hide</> : <><Eye className="h-4 w-4 mr-1" /> Show</>}
              </Button>
              {revealed && (
                <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <><Check className="h-4 w-4 mr-1" /> Copied</> : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
                </Button>
              )}
            </div>
          </div>

          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-4 text-sm space-y-2">
            <p className="font-semibold text-destructive">⚠️ Important — Read carefully</p>
            <ul className="list-disc list-inside space-y-1 text-foreground/80">
              <li><strong>Write this code down</strong> and store it somewhere safe and private.</li>
              <li><strong>Keep it confidential.</strong> Treat it like a password.</li>
              <li><strong>No one</strong> — not even an administrator — has the right to ask you for this code. If anyone does, refuse and report it.</li>
              <li>This code <strong>will not be shown again</strong> after you close this window.</li>
            </ul>
          </div>

          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1"
            />
            <span>I have written down my access code and stored it in a safe, private place.</span>
          </label>

          <Button
            className="w-full"
            disabled={!confirmed || saving}
            onClick={handleAcknowledge}
          >
            {saving ? 'Saving...' : 'Continue to Dashboard'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
