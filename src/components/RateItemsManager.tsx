import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Save } from 'lucide-react';
import { db } from '@/lib/supabase-db';
import { useToast } from '@/hooks/use-toast';

type Bucket = 'income' | 'expense';
type Unit = 'per_name' | 'monthly_fixed' | 'percent';

interface RateItem {
  id: string;
  name: string;
  bucket: Bucket;
  unit: Unit;
  value: number;
  is_active: boolean;
  display_order: number;
}

const unitLabel: Record<Unit, string> = {
  per_name: 'Per name',
  monthly_fixed: 'Fixed monthly',
  percent: 'Percentage (%)',
};

export const RateItemsManager = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<RateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', bucket: 'income' as Bucket, unit: 'per_name' as Unit, value: '' });

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.from('rate_items').select('*').order('bucket').order('display_order');
    if (error) toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    setItems((data as RateItem[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name.trim()) return;
    const { error } = await db.from('rate_items').insert({
      name: form.name.trim(),
      bucket: form.bucket,
      unit: form.unit,
      value: Number(form.value) || 0,
      display_order: items.filter(i => i.bucket === form.bucket).length,
    });
    if (error) toast({ title: 'Failed to add', description: error.message, variant: 'destructive' });
    else { setForm({ name: '', bucket: form.bucket, unit: form.unit, value: '' }); await load(); }
  };

  const update = async (id: string, patch: Partial<RateItem>) => {
    const { error } = await db.from('rate_items').update(patch).eq('id', id);
    if (error) toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    else setItems(items.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const remove = async (id: string) => {
    const { error } = await db.from('rate_items').delete().eq('id', id);
    if (error) toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    else setItems(items.filter(i => i.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Custom Rate Labels</CardTitle>
        <p className="text-sm text-muted-foreground">Add or edit rate labels (e.g. Field Work, Data Entry, Booklet Production). Each label maps to Income or Expense and is included in the matching overview automatically.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end p-3 rounded-lg bg-muted/40">
          <div className="md:col-span-2">
            <Label className="text-xs">Label name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Field Work" />
          </div>
          <div>
            <Label className="text-xs">Bucket</Label>
            <Select value={form.bucket} onValueChange={(v) => setForm({ ...form, bucket: v as Bucket })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Unit</Label>
            <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v as Unit })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="per_name">Per name</SelectItem>
                <SelectItem value="monthly_fixed">Fixed monthly</SelectItem>
                <SelectItem value="percent">Percentage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" />
          </div>
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No custom rate labels yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(it => (
                <TableRow key={it.id}>
                  <TableCell>
                    <Input value={it.name} onChange={(e) => setItems(items.map(x => x.id === it.id ? { ...x, name: e.target.value } : x))} onBlur={(e) => update(it.id, { name: e.target.value })} className="h-8" />
                  </TableCell>
                  <TableCell>
                    <Select value={it.bucket} onValueChange={(v) => update(it.id, { bucket: v as Bucket })}>
                      <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={it.unit} onValueChange={(v) => update(it.id, { unit: v as Unit })}>
                      <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_name">Per name</SelectItem>
                        <SelectItem value="monthly_fixed">Fixed monthly</SelectItem>
                        <SelectItem value="percent">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input type="number" defaultValue={it.value} onBlur={(e) => update(it.id, { value: Number(e.target.value) || 0 })} className="h-8 w-28" />
                  </TableCell>
                  <TableCell>
                    <Switch checked={it.is_active} onCheckedChange={(c) => update(it.id, { is_active: c })} />
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
