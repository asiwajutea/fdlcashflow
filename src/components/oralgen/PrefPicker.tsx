import React from 'react';
import { Label } from '@/components/ui/label';

const DAYS = ['Anyday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['Morning', 'Afternoon', 'Evening', 'Anytime'];

interface PrefPickerProps {
  label?: string;
  required?: boolean;
  value: string[];
  onChange: (next: string[]) => void;
}

export const PrefPicker: React.FC<PrefPickerProps> = ({
  label = 'Preferred Day / Time',
  required,
  value,
  onChange,
}) => {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  const Pill = ({ opt }: { opt: string }) => (
    <button
      type="button"
      onClick={() => toggle(opt)}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        value.includes(opt)
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-foreground border-border hover:bg-muted'
      }`}
    >
      {opt}
    </button>
  );

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Day</p>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => <Pill key={d} opt={d} />)}
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Time</p>
        <div className="flex flex-wrap gap-1.5">
          {TIMES.map((t) => <Pill key={t} opt={t} />)}
        </div>
      </div>
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">Selected: {value.join(', ')}</p>
      )}
    </div>
  );
};
