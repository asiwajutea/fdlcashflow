import React from 'react';
import { Label } from '@/components/ui/label';

interface StarRatingProps {
  label?: string;
  required?: boolean;
  value: number;           // 0 = unset, 1-5
  onChange: (v: number) => void;
  helpText?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  label = 'Acceptance Rating',
  required,
  value,
  onChange,
  helpText,
}) => (
  <div className="space-y-1.5">
    <Label className="flex items-center gap-1">
      {label}
      {required && <span className="text-destructive">*</span>}
    </Label>
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5 focus:outline-none"
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
        >
          <svg
            className={`h-7 w-7 transition-colors ${
              value >= n ? 'text-primary fill-primary' : 'text-muted-foreground fill-none'
            }`}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        </button>
      ))}
      {value > 0 && (
        <span className="text-sm text-muted-foreground ml-2">{value}/5</span>
      )}
    </div>
    {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
  </div>
);
