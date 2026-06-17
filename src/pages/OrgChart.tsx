import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Position,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/supabase-db';
import { Loader2, LocateFixed } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

interface PersonNode {
  id: string;
  fullName: string;
  position: string;
  department: string;
  avatar: string;
  managerId: string | null;
  isCurrentUser: boolean;
}

const NODE_W = 200;
const NODE_H = 130;
const H_GAP = 36;
const V_GAP = 72;

function PersonCard({ data }: { data: PersonNode }) {
  const initials = (data.fullName || '?').split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className={[
        'rounded-2xl shadow-md p-3 flex flex-col items-center text-center transition-all',
        data.isCurrentUser
          ? 'bg-primary text-primary-foreground border-2 border-primary ring-4 ring-primary/30 scale-105'
          : 'bg-card border-2 border-primary/30',
      ].join(' ')}
      style={{ width: NODE_W, height: NODE_H }}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />
      <div className="relative">
        <Avatar className={['h-12 w-12', data.isCurrentUser ? 'ring-2 ring-primary-foreground' : 'ring-2 ring-primary/40'].join(' ')}>
          <AvatarImage src={data.avatar || undefined} alt={data.fullName} />
          <AvatarFallback className={data.isCurrentUser ? 'bg-primary-foreground/20 text-primary-foreground font-semibold' : 'bg-primary/10 text-primary font-semibold'}>
            {initials}
          </AvatarFallback>
        </Avatar>
        {data.isCurrentUser && (
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-primary" />
        )}
      </div>
      <p className={['text-xs font-semibold mt-1.5 leading-tight truncate w-full', data.isCurrentUser ? 'text-primary-foreground' : 'text-foreground'].join(' ')}>
        {data.fullName}
        {data.isCurrentUser && <span className="ml-1 opacity-80">(You)</span>}
      </p>
      <p className={['text-[11px] leading-tight truncate w-full', data.isCurrentUser ? 'text-primary-foreground/80' : 'text-muted-foreground'].join(' ')}>
        {data.position || '—'}
      </p>
      {data.department && (
        <p className={['text-[10px] italic mt-0.5 leading-tight truncate w-full', data.isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground/80'].join(' ')}>
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
        source: id,
        target: child.id,
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

// Inner component that has access to ReactFlow instance
function OrgChartInner({
  nodes,
  edges,
  currentUserId,
  loading,
  peopleCount,
}: {
  nodes: Node[];
  edges: Edge[];
  currentUserId: string | null;
  loading: boolean;
  peopleCount: number;
}) {
  const { fitView, setCenter } = useReactFlow();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Auto-center on current user after nodes load
  useEffect(() => {
    if (!nodes.length || !currentUserId) return;
    const myNode = nodes.find(n => n.id === currentUserId);
    if (myNode) {
      setTimeout(() => {
        setCenter(
          myNode.position.x + NODE_W / 2,
          myNode.position.y + NODE_H / 2,
          { zoom: isMobile ? 0.7 : 0.9, duration: 800 }
        );
      }, 300);
    } else {
      setTimeout(() => fitView({ padding: 0.15, duration: 600 }), 300);
    }
  }, [nodes, currentUserId, isMobile]);

  const handleFindMe = useCallback(() => {
    if (!currentUserId) return;
    const myNode = nodes.find(n => n.id === currentUserId);
    if (myNode) {
      setCenter(
        myNode.position.x + NODE_W / 2,
        myNode.position.y + NODE_H / 2,
        { zoom: isMobile ? 0.8 : 1, duration: 600 }
      );
    }
  }, [nodes, currentUserId, isMobile, setCenter]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (peopleCount === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        No employees with assigned managers yet.
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Find Me button */}
      {currentUserId && nodes.some(n => n.id === currentUserId) && (
        <div className="absolute top-3 right-3 z-10">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleFindMe}
            className="shadow-md gap-1.5 text-xs h-8"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            Find Me
          </Button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        // Better touch handling for mobile
        panOnScroll={false}
        zoomOnScroll={!isMobile}
        panOnDrag={true}
        zoomOnPinch={true}
        preventScrolling={true}
      >
        <Background gap={24} />
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          style={isMobile ? { transform: 'scale(1.3)', transformOrigin: 'bottom left' } : undefined}
        />
        {!isMobile && <MiniMap pannable zoomable />}
      </ReactFlow>
    </div>
  );
}

const OrgChart = () => {
  const [people, setPeople] = useState<PersonNode[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const { data, error } = await db.rpc('get_org_chart');
      if (error) {
        console.error('get_org_chart failed', error);
        setPeople([]);
        setLoading(false);
        return;
      }
      const rows = (data || []) as any[];
      const validIds = new Set(rows.map((p) => p.id));
      const mapped: PersonNode[] = rows.map((p) => ({
        id: p.id,
        fullName: p.full_name || 'Unknown',
        position: p.position_name || '—',
        department: p.department_name || '',
        avatar: p.avatar_url || '',
        managerId: p.manager_id && validIds.has(p.manager_id) ? p.manager_id : null,
        isCurrentUser: p.id === user?.id,
      }));
      setPeople(mapped);
      setLoading(false);
    })();
  }, [user?.id]);

  const { nodes, edges } = useMemo(() => layoutTree(people), [people]);

  return (
    <DashboardLayout title="Org Chart">
      <div className="mb-3 flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Organization Chart</h2>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Pinch or scroll to zoom · Drag to pan · Your card is highlighted
          </p>
          <p className="text-sm text-muted-foreground sm:hidden">
            Pinch to zoom · Drag to pan
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {people.length} {people.length === 1 ? 'person' : 'people'}
        </Badge>
      </div>
      <div
        className="w-full rounded-xl border bg-muted/20 overflow-hidden touch-none"
        style={{ height: 'calc(100vh - 200px)', minHeight: 400 }}
      >
        <ReactFlowProvider>
          <OrgChartInner
            nodes={nodes}
            edges={edges}
            currentUserId={user?.id ?? null}
            loading={loading}
            peopleCount={people.length}
          />
        </ReactFlowProvider>
      </div>
    </DashboardLayout>
  );
};

export default OrgChart;
