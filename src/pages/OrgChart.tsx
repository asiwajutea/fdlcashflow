import { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Position,
  type Node,
  type Edge,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { db } from '@/lib/supabase-db';
import { Loader2 } from 'lucide-react';

interface PersonNode {
  id: string;
  fullName: string;
  position: string;
  department: string;
  avatar: string;
  managerId: string | null;
}

const NODE_W = 220;
const NODE_H = 140;
const H_GAP = 40;
const V_GAP = 80;

function PersonCard({ data }: { data: PersonNode }) {
  const initials = (data.fullName || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="bg-card border-2 border-primary/30 rounded-2xl shadow-financial-md p-4 flex flex-col items-center text-center"
      style={{ width: NODE_W, height: NODE_H }}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />
      <Avatar className="h-14 w-14 ring-2 ring-primary/40">
        <AvatarImage src={data.avatar || undefined} alt={data.fullName} />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <p className="text-sm font-semibold text-foreground mt-2 leading-tight truncate w-full">{data.fullName}</p>
      <p className="text-xs text-muted-foreground leading-tight truncate w-full">{data.position || '—'}</p>
      {data.department && (
        <p className="text-[11px] italic text-muted-foreground/80 mt-1 leading-tight truncate w-full">
          {data.department}
        </p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { person: PersonCard };

function layoutTree(people: PersonNode[]): { nodes: Node[]; edges: Edge[] } {
  const byManager = new Map<string | null, PersonNode[]>();
  people.forEach((p) => {
    const key = p.managerId || null;
    if (!byManager.has(key)) byManager.set(key, []);
    byManager.get(key)!.push(p);
  });

  // Width of subtree rooted at id
  const widthCache = new Map<string, number>();
  const widthOf = (id: string): number => {
    if (widthCache.has(id)) return widthCache.get(id)!;
    const children = byManager.get(id) || [];
    const w = children.length === 0
      ? NODE_W
      : children.reduce((acc, c) => acc + widthOf(c.id), 0) + Math.max(0, children.length - 1) * H_GAP;
    widthCache.set(id, w);
    return w;
  };

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const place = (id: string, x: number, y: number) => {
    const person = people.find(p => p.id === id)!;
    const w = widthOf(id);
    nodes.push({
      id,
      type: 'person',
      position: { x: x + w / 2 - NODE_W / 2, y },
      data: person as any,
    });
    let cursor = x;
    const children = byManager.get(id) || [];
    for (const child of children) {
      const cw = widthOf(child.id);
      place(child.id, cursor, y + NODE_H + V_GAP);
      edges.push({
        id: `${id}-${child.id}`,
        source: id, target: child.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      });
      cursor += cw + H_GAP;
    }
  };

  const roots = byManager.get(null) || [];
  let xCursor = 0;
  for (const root of roots) {
    place(root.id, xCursor, 0);
    xCursor += widthOf(root.id) + H_GAP * 2;
  }
  return { nodes, edges };
}

const OrgChart = () => {
  const [people, setPeople] = useState<PersonNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: profiles }, { data: positions }, { data: roles }, { data: departments }] = await Promise.all([
        db.from('profiles').select('id, full_name, avatar_url, department_id, position_id, manager_id, approval_status'),
        db.from('positions').select('id, name'),
        db.from('user_roles').select('user_id, role'),
        db.from('departments').select('id, name'),
      ]);
      const posMap = new Map((positions || []).map((p: any) => [p.id, p.name]));
      const deptMap = new Map((departments || []).map((d: any) => [d.id, d.name]));
      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
      const usable = (profiles || []).filter((p: any) => {
        const r = roleMap.get(p.id);
        return r === 'employee' || r === 'admin';
      });
      const validIds = new Set(usable.map((p: any) => p.id));
      const mapped: PersonNode[] = usable.map((p: any) => ({
        id: p.id,
        fullName: p.full_name || 'Unknown',
        position: posMap.get(p.position_id) || (roleMap.get(p.id) === 'admin' ? 'Admin' : 'Employee'),
        department: deptMap.get(p.department_id) || '',
        avatar: p.avatar_url || '',
        managerId: p.manager_id && validIds.has(p.manager_id) ? p.manager_id : null,
      }));
      setPeople(mapped);
      setLoading(false);
    })();
  }, []);

  const { nodes, edges } = useMemo(() => layoutTree(people), [people]);

  return (
    <DashboardLayout title="Org Chart">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Organization Chart</h2>
        <p className="text-sm text-muted-foreground">Drag to pan, scroll to zoom. Manager assignments come from each user's profile.</p>
      </div>
      <div className="w-full rounded-xl border bg-muted/20" style={{ height: 'calc(100vh - 220px)' }}>
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No employees with assigned managers yet.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OrgChart;
