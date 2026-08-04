import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/supabase-db';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import RichTextEditor from '@/components/RichTextEditor';
import DOMPurify from 'dompurify';
import {
  Send, Users, Search, X, CheckCircle2, Loader2, Mail,
  Eye, ChevronDown, ChevronUp, AlertCircle, Clock, Hash,
  FileText, Info, ChevronRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

// ─── types ────────────────────────────────────────────────────────────────────

interface Recipient {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  employee_id?: string | null;
  position?: string | null;
  department?: string | null;
}

interface BroadcastLog {
  id: string;
  subject: string;
  audience: any;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

type AudienceType = 'all' | 'role' | 'capability' | 'custom';

const ROLES = [
  { value: 'admin',     label: 'Admins' },
  { value: 'employee',  label: 'Employees' },
  { value: 'candidate', label: 'Candidates' },
  { value: 'guest',     label: 'Guests' },
];

const SENDER_LABELS = [
  { value: 'Footprints Dynasty Team',    label: 'Footprints Dynasty Team' },
  { value: 'HR Team',                    label: 'HR Team' },
  { value: 'Finance Team',              label: 'Finance Team' },
  { value: 'Management',                label: 'Management' },
  { value: 'IT & Platform Support',     label: 'IT & Platform Support' },
];

// ─── Placeholders ─────────────────────────────────────────────────────────────
// These are replaced per-recipient at send time using the recipient's profile data.
const PLACEHOLDERS = [
  { token: '{{name}}',          label: 'Full Name',         example: 'John Doe' },
  { token: '{{first_name}}',    label: 'First Name',        example: 'John' },
  { token: '{{email}}',         label: 'Email Address',     example: 'john@example.com' },
  { token: '{{employee_id}}',   label: 'Employee ID',       example: 'FDL-2024-001' },
  { token: '{{position}}',      label: 'Position / Role',   example: 'Field Officer' },
  { token: '{{department}}',    label: 'Department',        example: 'Field Operations' },
  { token: '{{date}}',          label: 'Today\'s Date',     example: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
  { token: '{{company}}',       label: 'Company Name',      example: 'Footprints Dynasty Ltd' },
];

function interpolate(html: string, r: Recipient): string {
  const firstName = (r.full_name || '').split(' ')[0] || '';
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return html
    .replace(/\{\{name\}\}/gi,          r.full_name        || 'Team Member')
    .replace(/\{\{first_name\}\}/gi,    firstName           || 'there')
    .replace(/\{\{email\}\}/gi,         r.email            || '')
    .replace(/\{\{employee_id\}\}/gi,   r.employee_id      || '—')
    .replace(/\{\{position\}\}/gi,      r.position         || '—')
    .replace(/\{\{department\}\}/gi,    r.department       || '—')
    .replace(/\{\{date\}\}/gi,          today)
    .replace(/\{\{company\}\}/gi,       'Footprints Dynasty Ltd');
}

// ─── Broadcast templates ──────────────────────────────────────────────────────
interface BroadcastTemplate {
  id: string;
  label: string;
  category: string;
  subject: string;
  body: string;
}

const BROADCAST_TEMPLATES: BroadcastTemplate[] = [
  // ── General ──
  {
    id: 'welcome',
    label: 'Welcome Aboard',
    category: 'Onboarding',
    subject: 'Welcome to the Footprints Dynasty Team, {{first_name}}!',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>On behalf of everyone at <strong>Footprints Dynasty Limited</strong>, we are delighted to welcome you to our team!</p>
<p>You have joined a company that is committed to excellence, integrity, and the development of every team member. We believe that your skills and experience will be a great asset to us, and we look forward to achieving great things together.</p>
<p>Your role as <strong>{{position}}</strong> is vital to our mission, and we are excited to have you with us.</p>
<p><strong>Next steps:</strong></p>
<ul>
  <li>Log in to your dashboard and complete your profile.</li>
  <li>Review your onboarding documents.</li>
  <li>Reach out to your manager if you have any questions.</li>
</ul>
<p>Once again, welcome to the family!</p>
<p>Warm regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>`,
  },
  {
    id: 'general_announcement',
    label: 'General Announcement',
    category: 'General',
    subject: 'Important Announcement from Footprints Dynasty',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>We have an important update to share with all team members.</p>
<p><strong>[Insert announcement details here]</strong></p>
<p>Please read this carefully and reach out to your manager or HR if you have any questions.</p>
<p>Thank you for your continued commitment and dedication.</p>
<p>Best regards,<br/><strong>Management</strong><br/>Footprints Dynasty Limited</p>`,
  },
  {
    id: 'policy_update',
    label: 'Policy Update',
    category: 'General',
    subject: 'Update to Company Policy — Action Required',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>We are writing to inform you of an important update to our company policy, effective <strong>{{date}}</strong>.</p>
<h3>What is changing</h3>
<p><strong>[Describe the policy change]</strong></p>
<h3>Why this change is being made</h3>
<p><strong>[Explain the reason]</strong></p>
<h3>What you need to do</h3>
<p><strong>[List any actions required from employees]</strong></p>
<p>If you have any questions about these changes, please contact HR or your direct manager.</p>
<p>Thank you for your understanding and cooperation.</p>
<p>Best regards,<br/><strong>Management</strong><br/>Footprints Dynasty Limited</p>`,
  },
  // ── HR ──
  {
    id: 'confirmation_employment',
    label: 'Employment Confirmation',
    category: 'HR',
    subject: 'Letter of Employment Confirmation — {{name}}',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>This letter serves as confirmation of your employment with <strong>Footprints Dynasty Limited</strong>.</p>
<ul>
  <li><strong>Employee ID:</strong> {{employee_id}}</li>
  <li><strong>Position:</strong> {{position}}</li>
  <li><strong>Department:</strong> {{department}}</li>
  <li><strong>Date of Confirmation:</strong> {{date}}</li>
</ul>
<p>Your employment is subject to the terms and conditions set out in your employment contract and the company's policies and procedures.</p>
<p>Please retain this letter for your records.</p>
<p>Yours sincerely,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>`,
  },
  {
    id: 'probation_completion',
    label: 'Probation Completion',
    category: 'HR',
    subject: 'Congratulations — Successful Completion of Probation',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>We are pleased to inform you that you have successfully completed your probationary period with <strong>Footprints Dynasty Limited</strong>.</p>
<p>Your performance during this period has been reviewed and we are delighted to confirm your continued employment on a permanent basis, effective <strong>{{date}}</strong>.</p>
<p>We value your contribution to the team and look forward to your continued growth and success with us.</p>
<p>Please feel free to reach out to HR if you have any questions.</p>
<p>Congratulations once again!</p>
<p>Warm regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>`,
  },
  {
    id: 'warning_letter',
    label: 'Written Warning',
    category: 'HR',
    subject: 'Written Warning — {{name}}',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>This letter constitutes a formal written warning regarding <strong>[describe the issue or conduct]</strong>, which occurred on <strong>[date of incident]</strong>.</p>
<p>Following an investigation and meeting held on <strong>[meeting date]</strong>, we have determined that your actions/conduct were in violation of company policy, specifically:</p>
<p><strong>[Quote the relevant policy or expectation]</strong></p>
<h3>Required improvement</h3>
<p><strong>[State clearly what behaviour or improvement is expected]</strong></p>
<h3>Consequences</h3>
<p>Failure to demonstrate the required improvement may result in further disciplinary action, up to and including termination of employment.</p>
<p>This warning will remain on your employment record for a period of <strong>[duration]</strong>. You have the right to appeal this decision within 5 working days by contacting HR.</p>
<p>Please sign and return the acknowledgement slip below.</p>
<p>Yours sincerely,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>`,
  },
  {
    id: 'termination',
    label: 'Termination of Contract',
    category: 'HR',
    subject: 'Termination of Employment — {{name}}',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>We are writing to formally notify you that your employment with <strong>Footprints Dynasty Limited</strong> has been terminated, effective <strong>[termination date]</strong>.</p>
<p>This decision was made following <strong>[reason for termination — e.g. disciplinary proceedings / redundancy / end of contract]</strong>.</p>
<h3>Your final entitlements</h3>
<ul>
  <li>Final salary payment will be processed on <strong>[payment date]</strong>.</li>
  <li>Any outstanding leave balance will be paid out in your final pay.</li>
  <li>Please return all company property including access cards, equipment, and any confidential documents by <strong>[return date]</strong>.</li>
</ul>
<h3>Confidentiality</h3>
<p>Please be reminded that your obligations under the confidentiality provisions of your employment contract continue to apply after termination.</p>
<p>If you have any questions, please contact the HR department at <strong>hr@footprintsdynasty.com.ng</strong>.</p>
<p>We wish you well in your future endeavours.</p>
<p>Yours sincerely,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>`,
  },
  {
    id: 'resignation_acceptance',
    label: 'Resignation Acceptance',
    category: 'HR',
    subject: 'Acceptance of Resignation — {{name}}',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>We acknowledge receipt of your resignation letter dated <strong>[resignation date]</strong>, and we formally accept your resignation from your position as <strong>{{position}}</strong>, effective <strong>[last working date]</strong>.</p>
<p>We appreciate the contributions you have made during your time with <strong>Footprints Dynasty Limited</strong>. Your work on <strong>[mention key contributions if appropriate]</strong> has been valued and will not be forgotten.</p>
<p>As you transition, please ensure that all company assets are returned and a handover document is completed before your last day.</p>
<p>We wish you all the best in your future endeavours and hope our paths will cross again.</p>
<p>Warm regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>`,
  },
  // ── Finance ──
  {
    id: 'salary_review',
    label: 'Salary Review Notice',
    category: 'Finance',
    subject: 'Notice of Salary Review — {{name}}',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>We are pleased to inform you that as part of our annual review process, your salary has been reviewed effective <strong>{{date}}</strong>.</p>
<ul>
  <li><strong>New Gross Salary:</strong> ₦[New Amount] per month</li>
  <li><strong>Effective Date:</strong> {{date}}</li>
</ul>
<p>This adjustment reflects our recognition of your performance and contribution to the company.</p>
<p>Your updated employment terms will be reflected in your next payslip. If you have any questions, please contact the Finance team.</p>
<p>Best regards,<br/><strong>Finance Team</strong><br/>Footprints Dynasty Limited</p>`,
  },
  {
    id: 'payslip_notice',
    label: 'Payslip Notification',
    category: 'Finance',
    subject: 'Your Payslip for [Month] is Ready — {{name}}',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>Your payslip for <strong>[Month Year]</strong> is now available on the platform.</p>
<p>Please log in to your dashboard to view and download your payslip.</p>
<p>If you notice any discrepancies, please contact the Finance team within 5 working days.</p>
<p>Best regards,<br/><strong>Finance Team</strong><br/>Footprints Dynasty Limited</p>`,
  },
  // ── Events ──
  {
    id: 'event_invitation',
    label: 'Event Invitation',
    category: 'Events',
    subject: 'You\'re Invited — [Event Name]',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>You are cordially invited to <strong>[Event Name]</strong>, organised by Footprints Dynasty Limited.</p>
<ul>
  <li><strong>Date:</strong> [Event Date]</li>
  <li><strong>Time:</strong> [Start Time] — [End Time]</li>
  <li><strong>Venue:</strong> [Location / Online Link]</li>
  <li><strong>Dress Code:</strong> [Smart Casual / Formal / etc.]</li>
</ul>
<p><strong>[Brief description of the event]</strong></p>
<p>Kindly confirm your attendance by <strong>[RSVP Date]</strong> by replying to this email or contacting [contact person].</p>
<p>We look forward to seeing you there!</p>
<p>Warm regards,<br/><strong>{{company}}</strong></p>`,
  },
  {
    id: 'holiday_notice',
    label: 'Holiday / Closure Notice',
    category: 'Events',
    subject: 'Office Closure Notice — [Holiday Name]',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>Please be informed that the Footprints Dynasty office will be <strong>closed</strong> on <strong>[Date]</strong> in observance of <strong>[Holiday Name]</strong>.</p>
<p>Normal operations will resume on <strong>[Resumption Date]</strong>.</p>
<p>Wishing you and your family a wonderful <strong>[Holiday Name]</strong>!</p>
<p>Best regards,<br/><strong>Management</strong><br/>Footprints Dynasty Limited</p>`,
  },
  // ── Performance ──
  {
    id: 'performance_review',
    label: 'Performance Review Invitation',
    category: 'Performance',
    subject: 'Performance Review — {{name}}',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>As part of our ongoing commitment to employee development, we are conducting performance reviews for the current cycle.</p>
<p>Your review has been scheduled as follows:</p>
<ul>
  <li><strong>Date:</strong> [Review Date]</li>
  <li><strong>Time:</strong> [Review Time]</li>
  <li><strong>Reviewer:</strong> [Manager Name]</li>
  <li><strong>Location:</strong> [Office / Video Call Link]</li>
</ul>
<p>Please come prepared to discuss:</p>
<ul>
  <li>Your achievements over the review period</li>
  <li>Any challenges you have faced</li>
  <li>Your development goals for the next period</li>
</ul>
<p>If you need to reschedule, please contact HR as soon as possible.</p>
<p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>`,
  },
  {
    id: 'commendation',
    label: 'Commendation / Recognition',
    category: 'Performance',
    subject: 'Recognition of Outstanding Performance — {{name}}',
    body: `<p>Dear <strong>{{name}}</strong>,</p>
<p>We would like to take this opportunity to formally recognise and commend you for your outstanding performance and dedication.</p>
<p><strong>[Describe the specific achievement or behaviour being recognised]</strong></p>
<p>Your commitment to excellence is a reflection of the values we hold dear at Footprints Dynasty, and it serves as an inspiration to your colleagues.</p>
<p>Thank you for everything you do. We are proud to have you on our team.</p>
<p>Keep up the excellent work!</p>
<p>Warm regards,<br/><strong>Management</strong><br/>Footprints Dynasty Limited</p>`,
  },
];

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  sending:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  partial:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  failed:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  return (name || '?').split(' ').slice(0,2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function audienceLabel(audience: any): string {
  if (!audience) return '—';
  if (audience.type === 'all') return 'All platform users';
  if (audience.type === 'role') return `Role: ${audience.value}`;
  if (audience.type === 'capability') return `Capability: ${audience.value}`;
  if (audience.type === 'custom') return `${audience.user_ids?.length ?? 0} specific recipients`;
  return JSON.stringify(audience);
}

// ─── Recipient Preview Panel ──────────────────────────────────────────────────

function RecipientBadge({ r, onRemove }: { r: Recipient; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-1.5 pl-1.5 pr-1 py-0.5 rounded-full bg-muted border text-xs">
      <Avatar className="h-4 w-4 shrink-0">
        <AvatarImage src={r.avatar_url ?? undefined} />
        <AvatarFallback className="text-[9px]">{initials(r.full_name)}</AvatarFallback>
      </Avatar>
      <span className="max-w-[120px] truncate">{r.full_name || r.email || r.id.slice(0,8)}</span>
      {onRemove && (
        <button onClick={onRemove} className="text-muted-foreground hover:text-foreground ml-0.5">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BroadcastEmail() {
  const { user, role, loading: authLoading, hasCapability } = useAuth();
  const { toast } = useToast();

  // ── Auth guard ───────────────────────────────────────────────────────────
  if (!authLoading && role && role !== 'admin' && !hasCapability('send_broadcast')) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Compose state ────────────────────────────────────────────────────────
  const [subject,      setSubject]      = useState('');
  const [body,         setBody]         = useState('');
  const [senderLabel,  setSenderLabel]  = useState('Footprints Dynasty Team');
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [roleValue,    setRoleValue]    = useState('employee');
  const [capValue,     setCapValue]     = useState('');
  const [capList,      setCapList]      = useState<string[]>([]);
  const [search,       setSearch]       = useState('');

  // Custom audience
  const [allUsers,      setAllUsers]      = useState<Recipient[]>([]);
  const [loadingUsers,  setLoadingUsers]  = useState(false);
  const [customPicked,  setCustomPicked]  = useState<Recipient[]>([]);

  // Preview dialog
  const [previewOpen,  setPreviewOpen]  = useState(false);

  // Sending
  const [sending,      setSending]      = useState(false);
  const [progress,     setProgress]     = useState({ done: 0, total: 0, failed: 0 });

  // Template picker
  const [templateOpen, setTemplateOpen] = useState(false);

  // Include inactive accounts toggle (default: false = active only)
  const [includeInactive, setIncludeInactive] = useState(false);

  // History
  const [logs,         setLogs]         = useState<BroadcastLog[]>([]);
  const [loadingLogs,  setLoadingLogs]  = useState(false);
  const [logsOpen,     setLogsOpen]     = useState(false);

  // ── Load capabilities list for the capability picker ─────────────────────
  useEffect(() => {
    db.from('user_capabilities').select('capability')
      .then(({ data }) => {
        const unique = [...new Set((data || []).map((r: any) => String(r.capability)))].sort() as string[];
        setCapList(unique);
        if (unique.length && !capValue) setCapValue(unique[0]);
      });
  }, []);

  // ── Load all users for custom picker ─────────────────────────────────────
  useEffect(() => {
    if (audienceType !== 'custom' || allUsers.length > 0) return;
    setLoadingUsers(true);
    // Fetch profiles + email via edge function (service-role required for auth.users)
    supabase.functions.invoke('get-users', { body: {} })
      .then(({ data, error }) => {
        if (error || !data?.users) {
          // Fallback: load profiles only (no email)
          db.from('profiles').select('id, full_name, avatar_url').eq('is_active', true).order('full_name')
            .then(({ data: p }) => {
              setAllUsers((p || []).map((u: any) => ({ ...u, email: null, role: null })));
              setLoadingUsers(false);
            });
          return;
        }
        setAllUsers(data.users.map((u: any) => ({
          id:         u.id,
          full_name:  u.user_metadata?.full_name || u.email?.split('@')[0] || null,
          email:      u.email,
          avatar_url: u.user_metadata?.avatar_url || null,
          role:       null,
        })));
        setLoadingUsers(false);
      });
  }, [audienceType]);

  // ── Enrich a list of user IDs into full Recipient objects ────────────────
  const enrichProfiles = async (ids: string[], activeOnly = true): Promise<Recipient[]> => {
    if (!ids.length) return [];
    let q = db
      .from('profiles')
      .select(`id, full_name, avatar_url, employee_id, positions(name), departments(name)`)
      .in('id', ids);
    if (activeOnly) q = q.eq('is_active', true);
    const { data } = await q;
    return (data || []).map((p: any) => ({
      id:          p.id,
      full_name:   p.full_name || null,
      email:       null,             // resolved server-side by edge function via user_id
      avatar_url:  p.avatar_url || null,
      role:        null,
      employee_id: p.employee_id || null,
      position:    p.positions?.name || null,
      department:  p.departments?.name || null,
    }));
  };

  // ── Resolve recipients from audience ─────────────────────────────────────
  const resolveRecipients = async (): Promise<Recipient[]> => {
    const activeOnly = !includeInactive;

    if (audienceType === 'custom') {
      const platformPicks = customPicked.filter(r => !r.id.startsWith('ext:'));
      const externalPicks = customPicked.filter(r => r.id.startsWith('ext:'));
      const enriched = await enrichProfiles(platformPicks.map(r => r.id), activeOnly);
      return [...enriched, ...externalPicks];
    }

    if (audienceType === 'all') {
      let q = db.from('profiles').select('id').eq('approval_status', 'approved');
      if (activeOnly) q = q.eq('is_active', true);
      const { data } = await q;
      const ids = (data || []).map((p: any) => p.id);
      return enrichProfiles(ids, activeOnly);
    }

    if (audienceType === 'role') {
      const { data: roles } = await db.from('user_roles').select('user_id').eq('role', roleValue);
      const ids = (roles || []).map((r: any) => r.user_id);
      return enrichProfiles(ids, activeOnly);
    }

    if (audienceType === 'capability') {
      const { data: caps } = await db.from('user_capabilities').select('user_id').eq('capability', capValue);
      const ids = (caps || []).map((c: any) => c.user_id);
      return enrichProfiles(ids, activeOnly);
    }

    return [];
  };

  // ── Preview recipients ────────────────────────────────────────────────────
  const [previewRecipients, setPreviewRecipients] = useState<Recipient[]>([]);
  const [resolvingPreview, setResolvingPreview] = useState(false);

  const openPreview = async () => {
    if (!subject.trim()) { toast({ title: 'Subject is required', variant: 'destructive' }); return; }
    if (!body.trim() || body === '<p><br></p>') { toast({ title: 'Email body is empty', variant: 'destructive' }); return; }
    setResolvingPreview(true);
    const r = await resolveRecipients();
    setPreviewRecipients(r);
    setResolvingPreview(false);
    setPreviewOpen(true);
  };

  // ── Load broadcast history ────────────────────────────────────────────────
  const loadLogs = async () => {
    setLoadingLogs(true);
    const { data } = await db.from('broadcast_logs').select('*').order('created_at', { ascending: false }).limit(50);
    setLogs((data as BroadcastLog[]) || []);
    setLoadingLogs(false);
  };

  useEffect(() => { loadLogs(); }, []);

  // ── Send ─────────────────────────────────────────────────────────────────
  const send = async () => {
    const recipients = previewRecipients;
    if (!recipients.length) { toast({ title: 'No recipients found', variant: 'destructive' }); return; }

    setSending(true);
    setPreviewOpen(false);
    setProgress({ done: 0, total: recipients.length, failed: 0 });

    // Insert broadcast log
    const audience =
      audienceType === 'custom' ? { type: 'custom', user_ids: recipients.map(r => r.id) } :
      audienceType === 'role'   ? { type: 'role', value: roleValue } :
      audienceType === 'capability' ? { type: 'capability', value: capValue } :
      { type: 'all' };

    const { data: logData } = await db.from('broadcast_logs').insert({
      subject,
      audience,
      recipient_count: recipients.length,
      status: 'sending',
      sent_by: user?.id,
    }).select('id').single();

    const logId = (logData as any)?.id;

    let sent = 0;
    let failed = 0;

    // Send in batches of 5 to avoid edge-function rate limits
    const BATCH = 5;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      await Promise.allSettled(batch.map(async (r) => {
        try {
          // Interpolate placeholders with this recipient's data
          const personalizedBody = interpolate(
            DOMPurify.sanitize(body, { ADD_ATTR: ['target','rel','style'] }),
            r,
          );
          const personalizedSubject = interpolate(subject, r);
          const { error } = await supabase.functions.invoke('send-email', {
            body: {
              template_key: 'broadcast',
              // External recipients have id starting with 'ext:' — pass email directly
              user_id: r.id.startsWith('ext:') ? undefined : r.id,
              to:      r.email || undefined,
              name:    r.full_name || undefined,
              vars: {
                subject:      personalizedSubject,
                html_body:    personalizedBody,
                sender_label: senderLabel,
                name:         r.full_name || undefined,
              },
            },
          });
          if (error) throw error;
          sent++;
        } catch {
          failed++;
        }
        setProgress({ done: sent + failed, total: recipients.length, failed });
      }));
    }

    // Update broadcast log
    if (logId) {
      await db.from('broadcast_logs').update({
        sent_count:    sent,
        failed_count:  failed,
        status:        failed === recipients.length ? 'failed' : failed > 0 ? 'partial' : 'completed',
        completed_at:  new Date().toISOString(),
      }).eq('id', logId);
    }

    setSending(false);
    toast({
      title: `Broadcast complete`,
      description: `${sent} sent · ${failed} failed out of ${recipients.length} recipients`,
      variant: failed === recipients.length ? 'destructive' : 'default',
    });

    // Reset compose
    setSubject('');
    setBody('');
    setCustomPicked([]);
    loadLogs();
  };

  // ── Filtered user list for custom picker ─────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allUsers.filter(u =>
      !q ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email    && u.email.toLowerCase().includes(q))
    ).filter(u => !customPicked.some(p => p.id === u.id));
  }, [allUsers, search, customPicked]);

  // Whether the search value looks like a valid email not already in the list
  const isExternalEmail = useMemo(() => {
    const q = search.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      emailRe.test(q) &&
      !customPicked.some(p => p.email?.toLowerCase() === q.toLowerCase()) &&
      !allUsers.some(u => u.email?.toLowerCase() === q.toLowerCase())
    );
  }, [search, customPicked, allUsers]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Broadcast Email">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Broadcast Email</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Send a branded email to platform users by role, capability, or custom list.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setLogsOpen(v => !v); if (!logsOpen) loadLogs(); }}
            className="gap-1.5">
            <Clock className="h-4 w-4" />
            {logsOpen ? 'Hide History' : 'Sent History'}
          </Button>
        </div>

        {/* ── Sending progress ── */}
        {sending && (
          <Card className="border-blue-200 bg-blue-50/40 dark:bg-blue-900/10">
            <CardContent className="py-4 px-5 flex items-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Sending… {progress.done} / {progress.total}
                </p>
                <div className="mt-1.5 h-1.5 rounded-full bg-blue-200 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
                </div>
                {progress.failed > 0 && (
                  <p className="text-xs text-red-600 mt-0.5">{progress.failed} failed</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Sent history ── */}
        {logsOpen && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" /> Broadcast History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No broadcasts sent yet.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{log.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {audienceLabel(log.audience)} · {log.recipient_count} recipients ·{' '}
                          {format(parseISO(log.created_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[log.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {log.status}
                        </span>
                        <span className="text-muted-foreground">
                          {log.sent_count}✓ {log.failed_count > 0 && `${log.failed_count}✗`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* ── Compose form ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Audience + Settings ── */}
          <div className="space-y-5">

            {/* Audience */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" /> Audience
                </CardTitle>
                <CardDescription className="text-xs">Who should receive this email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Target type</Label>
                  <Select value={audienceType} onValueChange={v => setAudienceType(v as AudienceType)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All active users</SelectItem>
                      <SelectItem value="role">By role</SelectItem>
                      <SelectItem value="capability">By capability</SelectItem>
                      <SelectItem value="custom">Custom list</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {audienceType === 'role' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Role</Label>
                    <Select value={roleValue} onValueChange={setRoleValue}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {audienceType === 'capability' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Capability</Label>
                    <Select value={capValue} onValueChange={setCapValue}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {capList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {audienceType === 'custom' && (
                  <div className="space-y-2">
                    {/* Selected chips */}
                    {customPicked.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {customPicked.map(r => (
                          <RecipientBadge key={r.id} r={r} onRemove={() => setCustomPicked(p => p.filter(x => x.id !== r.id))} />
                        ))}
                      </div>
                    )}
                    {/* Search — by name OR email, plus external email entry */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        className="pl-8 h-8 text-xs"
                        placeholder="Search by name or email, or type any address…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => {
                          // Press Enter on a valid external email to add it directly
                          if (e.key === 'Enter' && isExternalEmail) {
                            const ext: Recipient = {
                              id:         `ext:${search.trim()}`,
                              full_name:  search.trim().split('@')[0],
                              email:      search.trim(),
                              avatar_url: null,
                              role:       null,
                            };
                            setCustomPicked(p => [...p, ext]);
                            setSearch('');
                          }
                        }}
                      />
                    </div>
                    {loadingUsers ? (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                      </div>
                    ) : (
                      <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                        {/* ── Add external email row ── */}
                        {isExternalEmail && (
                          <button type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/10 text-left transition-colors bg-primary/5"
                            onClick={() => {
                              const ext: Recipient = {
                                id:         `ext:${search.trim()}`,
                                full_name:  search.trim().split('@')[0],
                                email:      search.trim(),
                                avatar_url: null,
                                role:       null,
                              };
                              setCustomPicked(p => [...p, ext]);
                              setSearch('');
                            }}>
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                              <Mail className="h-3 w-3 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-primary">Add external: {search.trim()}</p>
                              <p className="text-[10px] text-muted-foreground">Not a platform user — email sent directly to this address</p>
                            </div>
                          </button>
                        )}
                        {/* ── Platform user results ── */}
                        {filteredUsers.slice(0, 30).map(u => (
                          <button key={u.id} type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 text-left transition-colors"
                            onClick={() => setCustomPicked(p => [...p, u])}>
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarImage src={u.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[9px]">{initials(u.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{u.full_name || u.email || u.id.slice(0,8)}</p>
                              {u.email && <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>}
                            </div>
                          </button>
                        ))}
                        {filteredUsers.length === 0 && !isExternalEmail && (
                          <p className="text-xs text-muted-foreground text-center py-3">
                            {search.trim()
                              ? 'No platform users found — type a valid email to add an external recipient'
                              : 'Start typing a name or email address'}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {customPicked.length} recipient{customPicked.length !== 1 ? 's' : ''} selected
                      {customPicked.some(r => r.id.startsWith('ext:')) && (
                        <span className="ml-1 text-amber-600">
                          · {customPicked.filter(r => r.id.startsWith('ext:')).length} external
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* ── Include inactive toggle ── */}
                {audienceType !== 'custom' && (
                  <div className="flex items-center justify-between gap-3 pt-1 px-1">
                    <div>
                      <p className="text-xs font-medium text-foreground">Include inactive accounts</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        By default, only active users receive the email.
                      </p>
                    </div>
                    <Switch
                      checked={includeInactive}
                      onCheckedChange={setIncludeInactive}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sender label */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Sender Name</CardTitle>
                <CardDescription className="text-xs">Shown at the bottom of the email</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={senderLabel} onValueChange={setSenderLabel}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SENDER_LABELS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

          </div>

          {/* ── Right: Subject + Body ── */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-muted-foreground" /> Compose
                </CardTitle>
                <CardDescription className="text-xs">
                  Company-branded email — your content is wrapped in the Footprints Dynasty template automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* ── Template picker ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Email Templates
                    </Label>
                    <button type="button" className="text-xs text-primary hover:underline flex items-center gap-0.5"
                      onClick={() => setTemplateOpen(v => !v)}>
                      {templateOpen ? 'Hide' : 'Browse templates'}
                      {templateOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                  </div>
                  {templateOpen && (
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                      {/* Group by category */}
                      {Array.from(new Set(BROADCAST_TEMPLATES.map(t => t.category))).map(cat => (
                        <div key={cat}>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{cat}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {BROADCAST_TEMPLATES.filter(t => t.category === cat).map(tpl => (
                              <button
                                key={tpl.id}
                                type="button"
                                className="px-2.5 py-1 rounded-md border bg-background hover:bg-accent text-xs font-medium transition-colors"
                                onClick={() => {
                                  setSubject(tpl.subject);
                                  setBody(tpl.body);
                                  setTemplateOpen(false);
                                }}
                              >
                                {tpl.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <p className="text-[10px] text-muted-foreground pt-1">
                        Selecting a template fills the subject and body — you can edit everything after.
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Placeholder bar ── */}
                <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                      Personalisation placeholders — replaced per recipient when sending
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map(ph => (
                      <button
                        key={ph.token}
                        type="button"
                        title={`Example: ${ph.example}`}
                        className="px-2 py-0.5 rounded bg-white dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-xs font-mono text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                        onClick={() => {
                          // Append to body at cursor — simplest approach: append to end
                          setBody(prev => prev.replace(/<p><br><\/p>$/, '') + ph.token);
                        }}
                      >
                        {ph.token}
                        <span className="ml-1 text-[9px] text-blue-400 font-normal not-italic">{ph.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Click a token to insert it into the body, or type it directly. Works in the subject line too.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Subject <span className="text-destructive">*</span></Label>
                  <Input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Important Update from Footprints Dynasty"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email Body <span className="text-destructive">*</span></Label>
                  <RichTextEditor
                    value={body}
                    onChange={setBody}
                    minHeight={320}
                    placeholder="Write your message here. HTML formatting is supported."
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports bold, italic, headings, lists, links, images, and colours.
                    The email is automatically wrapped in the company-branded template.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={openPreview}
                    disabled={resolvingPreview || sending}
                    className="gap-1.5"
                  >
                    {resolvingPreview
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Eye className="h-4 w-4" />}
                    Preview & Send
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Review recipients and email before sending.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ══ Preview & Confirm Dialog ══════════════════════════════════════════ */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="text-base">Preview & Confirm Broadcast</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                <p className="text-xs text-muted-foreground">Recipients</p>
                <p className="text-xl font-bold text-foreground flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-primary" />
                  {previewRecipients.length}
                </p>
                <p className="text-xs text-muted-foreground">{audienceLabel({ type: audienceType, value: audienceType === 'role' ? roleValue : capValue })}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-sm font-medium text-foreground">{senderLabel}</p>
                <p className="text-xs text-muted-foreground">hello@footprintsdynasty.com.ng</p>
              </div>
            </div>

            {/* Subject */}
            <div className="p-3 rounded-lg border bg-muted/20">
              <p className="text-xs text-muted-foreground mb-0.5">Subject</p>
              <p className="text-sm font-medium text-foreground">{subject}</p>
            </div>

            {/* Recipient list */}
            {previewRecipients.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Recipients ({Math.min(previewRecipients.length, 10)} shown{previewRecipients.length > 10 ? ` of ${previewRecipients.length}` : ''})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {previewRecipients.slice(0, 10).map(r => (
                    <RecipientBadge key={r.id} r={r} />
                  ))}
                  {previewRecipients.length > 10 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{previewRecipients.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {previewRecipients.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm">No recipients found for this audience. Please adjust your selection.</p>
              </div>
            )}

            {/* Body preview — interpolated with first recipient's data if available */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Email body preview
                {previewRecipients.length > 0 && (
                  <span className="ml-1 font-normal">(placeholders shown with <strong>{previewRecipients[0].full_name || 'first recipient'}</strong>'s data)</span>
                )}
              </p>
              <div
                className="prose prose-sm max-w-none border rounded-lg p-4 bg-white text-neutral-900 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    previewRecipients.length > 0
                      ? interpolate(body, previewRecipients[0])
                      : body
                  )
                }}
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Back to Compose</Button>
            <Button
              onClick={send}
              disabled={previewRecipients.length === 0}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" />
              Send to {previewRecipients.length} recipient{previewRecipients.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
