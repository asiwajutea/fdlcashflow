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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/supabase-db';
import { Loader2, X } from 'lucide-react';

interface PersonNode {
  id: string;
  fullName: string;
  position: string;
  department: string;
  departmentId: string;
  avatar: string;
  managerId: string | null;
}

const NODE_W = 240;
const NODE_H = 160;
const H_GAP = 40;
const V_GAP = 80;

// Department color palette
const DEPARTMENT_COLORS: Record<string, { bg: string; border: string; text: string; light: string; accent: string }> = {
  'default': {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-900',
    light: 'bg-blue-100',
    accent: 'text-blue-600',
  },
  'engineering': {
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    text: 'text-purple-900',
    light: 'bg-purple-100',
    accent: 'text-purple-600',
  },
  'sales': {
    bg: 'bg-green-50',
    border: 'border-green-300',
    text: 'text-green-900',
    light: 'bg-green-100',
    accent: 'text-green-600',
  },
  'marketing': {
    bg: 'bg-pink-50',
    border: 'border-pink-300',
    text: 'text-pink-900',
    light: 'bg-pink-100',
    accent: 'text-pink-600',
  },
  'hr': {
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    text: 'text-orange-900',
    light: 'bg-orange-100',
    accent: 'text-orange-600',
  },
  'finance': {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-900',
    light: 'bg-amber-100',
    accent: 'text-amber-600',
  },
  'operations': {
    bg: 'bg-cyan-50',
    border: 'border-cyan-300',
    text: 'text-cyan-900',
    light: 'bg-cyan-100',
    accent: 'text-cyan-600',
  },
  'support': {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-900',
    light: 'bg-red-100',
    accent: 'text-red-600',
  },
};

const getDepartmentColor = (dept: string): typeof DEPARTMENT_COLORS['default'] => {
  const key = dept.toLowerCase().replace(/\s+/g, '_');
  return DEPARTMENT_COLORS[key] || DEPARTMENT_COLORS['default'];
};

function PersonCard({ data }: { data: PersonNode }) {
  const initials = (data.fullName || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const colors = getDepartmentColor(data.department);
  
  return (
    <div
      className={`${colors.bg} border-2 ${colors.border} rounded-2xl shadow-lg p-4 flex flex-col items-center text-center hover:shadow-2xl transition-shadow`}
      style={{ width: NODE_W, height: NODE_H }}
    >
      <Handle type="target" position={Position.Top} className={`!${colors.accent} !w-3 !h-3`} />
      <div className={`${colors.light} rounded-full p-1 mb-2`}>
        <Avatar className={`h-14 w-14 ring-2 ${colors.border}`}>
          <AvatarImage src={data.avatar || undefined} alt={data.fullName} />
          <AvatarFallback className={`${colors.light} ${colors.text} font-bold`}>{initials}</AvatarFallback>
        </Avatar>
      </div>
      <p className={`text-sm font-bold ${colors.text} mt-1 leading-tight truncate w-full`}>{data.fullName}</p>
      <p className={`text-xs ${colors.accent} leading-tight truncate w-full font-medium`}>{data.position || '—'}</p>
      {data.department && (
        <Badge className={`mt-1 text-[10px] font-semibold ${colors.light} ${colors.text} border-0`}>
          {data.department}
        </Badge>
      )}
      <Handle type="source" position={Position.Bottom} className={`!${colors.accent} !w-3 !h-3`} />
    </div>
  );
}

const nodeTypes = { person: PersonCard };

function layoutTree(people: PersonNode[], filteredIds?: Set<string>): { nodes: Node[]; edges: Edge[] } {
  const displayPeople = filteredIds ? people.filter(p => filteredIds.has(p.id)) : people;
  
  const byManager = new Map<string | null, PersonNode[]>();
  displayPeople.forEach((p) => {
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
    const person = displayPeople.find(p => p.id === id)!;
    if (!person) return;
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
      const colors = getDepartmentColor(person.department);
      edges.push({
        id: `${id}-${child.id}`,
        source: id, target: child.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: `rgb(var(--color-${colors.accent}))`, strokeWidth: 3, opacity: 0.8 },
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
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: profiles }, { data: positions }, { data: roles }, { data: depts }] = await Promise.all([
        db.from('profiles').select('id, full_name, avatar_url, department_id, position_id, manager_id, approval_status'),
        db.from('positions').select('id, name'),
        db.from('user_roles').select('user_id, role'),
        db.from('departments').select('id, name'),
      ]);
      const posMap = new Map((positions || []).map((p: any) => [p.id, p.name]));
      const deptMap = new Map((depts || []).map((d: any) => [d.id, d.name]));
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
        department: deptMap.get(p.department_id) || 'Unassigned',
        departmentId: p.department_id || '',
        avatar: p.avatar_url || '',
        managerId: p.manager_id && validIds.has(p.manager_id) ? p.manager_id : null,
      }));
      setPeople(mapped);
      setDepartments(depts || []);
      setLoading(false);
    })();
  }, []);

  // Get filtered people and their subordinates
  const filteredPeopleIds = useMemo(() => {
    if (!selectedDepartment) return undefined;
    
    const filtered = new Set<string>();
    const deptEmployees = people.filter(p => p.departmentId === selectedDepartment);
    deptEmployees.forEach(e => filtered.add(e.id));
    
    // Also include managers and their chain of command
    const addManagerChain = (personId: string) => {
      const person = people.find(p => p.id === personId);
      if (person?.managerId && !filtered.has(person.managerId)) {
        filtered.add(person.managerId);
        addManagerChain(person.managerId);
      }
    };
    
    deptEmployees.forEach(e => addManagerChain(e.id));
    
    return filtered;
  }, [selectedDepartment, people]);

  const { nodes, edges } = useMemo(() => layoutTree(people, filteredPeopleIds), [people, filteredPeopleIds]);

  return (
    <DashboardLayout title="Org Chart">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Organization Chart</h2>
          <p className="text-sm text-muted-foreground">Drag to pan, scroll to zoom. Colors represent different departments.</p>
        </div>

        {/* Department Filter */}
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Filter by Department</h3>
            {selectedDepartment && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedDepartment(null)}
                className="h-8 gap-1 text-xs"
              >
                <X className="h-3 w-3" /> Show All
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {departments.map((dept) => {
              const colors = getDepartmentColor(dept.name);
              const isSelected = selectedDepartment === dept.id;
              const count = people.filter(p => p.departmentId === dept.id).length;
              return (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDepartment(isSelected ? null : dept.id)}
                  className={`p-2 rounded-lg border-2 transition-all text-xs font-medium truncate ${
                    isSelected
                      ? `${colors.bg} ${colors.border} ${colors.text} ring-2 ring-offset-2 ring-blue-400`
                      : `${colors.light} ${colors.accent} border-transparent hover:${colors.border} hover:border-2`
                  }`}
                  title={dept.name}
                >
                  <div className="truncate">{dept.name}</div>
                  <div className="text-[10px] opacity-70">({count})</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Department Legend */}
        <div className="bg-card border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">Department Color Guide</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(DEPARTMENT_COLORS).map(([key, colors]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 ${colors.bg} ${colors.border}`} />
                <span className="text-xs capitalize text-muted-foreground">{key.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full rounded-xl border bg-muted/20 mt-4" style={{ height: 'calc(100vh - 580px)' }}>
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2">
            <p>No employees found.</p>
            {selectedDepartment && <p className="text-xs">Try selecting a different department.</p>}
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
            <Background gap={24} color="#aaa" />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OrgChart;
