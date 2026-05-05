import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Star } from 'lucide-react';

export interface FieldDef {
  id?: string;
  field_key: string;
  label: string;
  field_type: string;
  placeholder?: string;
  help_text?: string;
  is_required?: boolean;
  options?: any[];
  lookup_source?: string;
  validation?: any;
  display_order?: number;
}

interface Props {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
  lookupOptions?: Record<string, { id: string; name: string }[]>;
  disabled?: boolean;
}

export const computeSteps = (fields: FieldDef[], firstStepName: string = ''): { name: string; fields: FieldDef[] }[] => {
  const steps: { name: string; fields: FieldDef[] }[] = [{ name: firstStepName, fields: [] }];
  fields.forEach((f) => {
    if (f.field_type === 'page_break') {
      const name = (f.validation as any)?.step_name || '';
      steps.push({ name, fields: [] });
    } else {
      steps[steps.length - 1].fields.push(f);
    }
  });
  return steps.filter((s, i) => s.fields.length > 0 || i === 0);
};

export const FieldRenderer: React.FC<Props> = ({ field, value, onChange, lookupOptions, disabled }) => {
  if (field.field_type === 'page_break') return null;
  if (field.field_type === 'section') {
    return (
      <div className="border-t pt-4 mt-2">
        <h3 className="font-semibold text-foreground">{field.label}</h3>
        {field.help_text && <p className="text-sm text-muted-foreground">{field.help_text}</p>}
      </div>
    );
  }

  const lookup = field.field_type === 'lookup' && field.lookup_source ? (lookupOptions?.[field.lookup_source] || []) : [];
  const opts: any[] = field.field_type === 'lookup'
    ? lookup.map((o) => ({ label: o.name, value: o.id }))
    : (field.options || []).map((o: any) => typeof o === 'string' ? { label: o, value: o } : o);

  const labelEl = (
    <Label className="flex items-center gap-1">
      {field.label}
      {field.is_required && <span className="text-destructive">*</span>}
    </Label>
  );

  return (
    <div className="space-y-2">
      {labelEl}
      {field.field_type === 'text' && (
        <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} disabled={disabled} />
      )}
      {field.field_type === 'textarea' && (
        <Textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} disabled={disabled} rows={4} />
      )}
      {field.field_type === 'number' && (
        <Input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} disabled={disabled} />
      )}
      {field.field_type === 'date' && (
        <Input type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      )}
      {field.field_type === 'time' && (
        <Input type="time" value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      )}
      {(field.field_type === 'select' || field.field_type === 'lookup') && (
        <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {opts.map((o: any) => <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {field.field_type === 'multiselect' && (
        <div className="space-y-2">
          {opts.map((o: any) => {
            const arr: any[] = Array.isArray(value) ? value : [];
            const checked = arr.includes(o.value);
            return (
              <div key={String(o.value)} className="flex items-center gap-2">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => {
                    const next = c ? [...arr, o.value] : arr.filter((x) => x !== o.value);
                    onChange(next);
                  }}
                  disabled={disabled}
                />
                <span className="text-sm">{o.label}</span>
              </div>
            );
          })}
        </div>
      )}
      {field.field_type === 'radio' && (
        <RadioGroup value={value ?? ''} onValueChange={onChange} disabled={disabled}>
          {opts.map((o: any) => (
            <div key={String(o.value)} className="flex items-center gap-2">
              <RadioGroupItem value={String(o.value)} id={`${field.field_key}-${o.value}`} />
              <Label htmlFor={`${field.field_key}-${o.value}`} className="font-normal">{o.label}</Label>
            </div>
          ))}
        </RadioGroup>
      )}
      {field.field_type === 'checkbox' && (
        opts.length > 0 ? (
          <div className="space-y-2">
            {opts.map((o: any) => {
              const arr: any[] = Array.isArray(value) ? value : [];
              const checked = arr.includes(o.value);
              return (
                <div key={String(o.value)} className="flex items-center gap-2">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      const next = c ? [...arr, o.value] : arr.filter((x) => x !== o.value);
                      onChange(next);
                    }}
                    disabled={disabled}
                  />
                  <span className="text-sm">{o.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Checkbox checked={!!value} onCheckedChange={(c) => onChange(!!c)} disabled={disabled} />
            <span className="text-sm">{field.placeholder || 'Yes'}</span>
          </div>
        )
      )}
      {field.field_type === 'yesno' && (
        <div className="flex items-center gap-3">
          <Switch checked={!!value} onCheckedChange={onChange} disabled={disabled} />
          <span className="text-sm text-muted-foreground">{value ? 'Yes' : 'No'}</span>
        </div>
      )}
      {field.field_type === 'rating' && (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => !disabled && onChange(n)} disabled={disabled}>
              <Star className={`h-6 w-6 ${(value || 0) >= n ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </button>
          ))}
        </div>
      )}
      {field.field_type === 'file' && (
        <Input type="file" onChange={(e) => onChange(e.target.files?.[0]?.name || '')} disabled={disabled} />
      )}
      {field.field_type === 'signature' && (
        <Textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Type full name as signature" disabled={disabled} rows={2} />
      )}
      {field.help_text && field.field_type !== 'section' && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}
    </div>
  );
};
