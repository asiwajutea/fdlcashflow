import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";

interface Msg { role: "user" | "assistant" | "system" | "tool"; content: any; tool_call_id?: string; tool_calls?: any[] }

function startOfMonth(d: Date) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }

async function tool_query_finance_summary(admin: any, args: any) {
  const months = Math.max(1, Math.min(24, Number(args?.months) || 3));
  const since = new Date(); since.setMonth(since.getMonth() - months); since.setDate(1); since.setHours(0,0,0,0);
  const [{ data: reqs }, { data: pays }] = await Promise.all([
    admin.from('advance_requests').select('kind,status,amount,created_at').gte('created_at', since.toISOString()),
    admin.from('invoices').select('net_payment,total_deductions,year,month').gte('year', since.getFullYear()),
  ]);
  const sum = (arr: any[], pred: (r: any) => boolean) => (arr || []).filter(pred).reduce((s, r) => s + Number(r.amount || r.net_payment || 0), 0);
  const approved = (kind: string) => sum(reqs || [], (r) => r.status === 'approved' && r.kind === kind);
  return {
    period_months: months,
    payroll_net: (pays || []).reduce((s, p) => s + Number(p.net_payment || 0), 0),
    payroll_deductions: (pays || []).reduce((s, p) => s + Number(p.total_deductions || 0), 0),
    approved_salary_advance: approved('salary_advance'),
    approved_reimbursement: approved('reimbursement'),
    approved_cash_advance: approved('cash_advance'),
    pending_requests: (reqs || []).filter((r) => r.status === 'pending').length,
  };
}

async function tool_query_payslips(admin: any, args: any) {
  const months = Math.max(1, Math.min(24, Number(args?.months) || 3));
  const since = new Date(); since.setMonth(since.getMonth() - months);
  const { data } = await admin.from('invoices').select('id,year,month,gross_payment,net_payment,total_deductions,employee_id').gte('year', since.getFullYear()).order('year', { ascending: false }).order('month', { ascending: false }).limit(500);
  const byMonth: Record<string, { count: number; gross: number; net: number }> = {};
  (data || []).forEach((p: any) => {
    const k = `${p.year}-${String(p.month).padStart(2, '0')}`;
    if (!byMonth[k]) byMonth[k] = { count: 0, gross: 0, net: 0 };
    byMonth[k].count++; byMonth[k].gross += Number(p.gross_payment || 0); byMonth[k].net += Number(p.net_payment || 0);
  });
  return { total: data?.length || 0, by_month: byMonth };
}

async function tool_query_recruitment(admin: any) {
  const { data } = await admin.from('applications').select('status');
  const byStatus: Record<string, number> = {};
  (data || []).forEach((a: any) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
  return { total: data?.length || 0, by_status: byStatus };
}

async function tool_top_spenders(admin: any, args: any) {
  const limit = Math.max(1, Math.min(20, Number(args?.limit) || 5));
  const { data } = await admin.from('advance_requests').select('user_id,amount,kind,status').eq('status', 'approved');
  const totals: Record<string, number> = {};
  (data || []).forEach((r: any) => { totals[r.user_id] = (totals[r.user_id] || 0) + Number(r.amount || 0); });
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, limit);
  const ids = top.map(([id]) => id);
  const { data: profs } = await admin.from('profiles').select('id,full_name').in('id', ids);
  const nameMap = new Map((profs || []).map((p: any) => [p.id, p.full_name]));
  return top.map(([id, total]) => ({ user_id: id, name: nameMap.get(id) || id, total_approved: total }));
}

async function tool_overbudget_users(admin: any) {
  const start = startOfMonth(new Date()).toISOString();
  const [{ data: budgets }, { data: reqs }, { data: profs }] = await Promise.all([
    admin.from('finance_budgets').select('*'),
    admin.from('advance_requests').select('user_id,kind,category_id,amount,status,created_at').in('status', ['approved', 'repaid']).gte('created_at', start),
    admin.from('profiles').select('id,full_name,department_id'),
  ]);
  const nameMap = new Map((profs || []).map((p: any) => [p.id, p.full_name]));
  const result: any[] = [];
  for (const b of (budgets || [])) {
    const kinds: string[] = (b.kinds && b.kinds.length) ? b.kinds : (b.kind ? [b.kind] : []);
    const catIds: string[] = (b.category_ids && b.category_ids.length) ? b.category_ids : (b.category_id ? [b.category_id] : []);
    const matching = (reqs || []).filter((r: any) => {
      if (!kinds.includes(r.kind)) return false;
      if (catIds.length && !catIds.includes(r.category_id)) return false;
      if (b.scope_type === 'user' && b.scope_id !== r.user_id) return false;
      if (b.scope_type === 'department') {
        const userDept = (profs || []).find((p: any) => p.id === r.user_id)?.department_id;
        if (userDept !== b.scope_id) return false;
      }
      return true;
    });
    const used = matching.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const limit = Number(b.monthly_limit || 0);
    if (used >= limit * 0.8 && limit > 0) {
      result.push({
        scope_type: b.scope_type, scope_label: b.scope_type === 'user' ? nameMap.get(b.scope_id) || b.scope_id : b.scope_id,
        kinds, limit, used, pct: Math.round((used / limit) * 100),
      });
    }
  }
  return result.sort((a, b) => b.pct - a.pct);
}

const TOOLS = [
  { type: "function", function: { name: "query_finance_summary", description: "Returns payroll + advance summary for the last N months", parameters: { type: "object", properties: { months: { type: "number" } } } } },
  { type: "function", function: { name: "query_payslips", description: "Returns payslip stats grouped by month", parameters: { type: "object", properties: { months: { type: "number" } } } } },
  { type: "function", function: { name: "query_recruitment", description: "Counts of applications by status", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "list_top_spenders", description: "Top approved-spend users", parameters: { type: "object", properties: { limit: { type: "number" } } } } },
  { type: "function", function: { name: "list_overbudget_users", description: "Budgets that are >=80% used this month", parameters: { type: "object", properties: {} } } },
];

async function runTool(admin: any, name: string, args: any) {
  try {
    switch (name) {
      case "query_finance_summary": return await tool_query_finance_summary(admin, args);
      case "query_payslips": return await tool_query_payslips(admin, args);
      case "query_recruitment": return await tool_query_recruitment(admin);
      case "list_top_spenders": return await tool_top_spenders(admin, args);
      case "list_overbudget_users": return await tool_overbudget_users(admin);
      default: return { error: `Unknown tool ${name}` };
    }
  } catch (e: any) {
    return { error: e?.message || 'tool execution failed' };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes } = await userClient.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roleRow } = await admin.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
    if (roleRow?.role !== 'admin') return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { messages = [] } = await req.json() as { messages: Msg[] };

    // Sanitize incoming messages to plain role+content
    const cleanIncoming = (Array.isArray(messages) ? messages : []).map((m: any) => ({
      role: m.role === 'user' || m.role === 'assistant' || m.role === 'system' ? m.role : 'user',
      content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
    })).filter((m) => m.content.trim().length > 0);

    const systemMsg = {
      role: "system" as const,
      content: `You are the FDL Workforce analytics copilot for the admin team of Footprints Dynasty Limited.
You can answer questions about company finance, payroll, recruitment pipeline, and budget usage by calling the provided tools.
Always call a tool when the user asks for numbers, lists, or status. Never invent figures.
After tools return, summarize the result clearly with bullet points, markdown tables when helpful, and currency in NGN (₦).`,
    };

    let convo: any[] = [systemMsg, ...cleanIncoming];

    // Agent loop with up to 6 tool steps
    for (let step = 0; step < 6; step++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, messages: convo, tools: TOOLS, tool_choice: "auto" }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error('ai gateway error', resp.status, text);
        if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: `AI gateway error ${resp.status}`, detail: text.slice(0, 500) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await resp.json();
      const choice = data?.choices?.[0]?.message;
      if (!choice) break;

      // Push assistant message with only the fields the gateway accepts
      const assistantMsg: any = { role: 'assistant', content: choice.content ?? '' };
      if (choice.tool_calls && Array.isArray(choice.tool_calls) && choice.tool_calls.length > 0) {
        assistantMsg.tool_calls = choice.tool_calls;
      }
      convo.push(assistantMsg);

      const calls = choice.tool_calls || [];
      if (calls.length === 0) {
        return new Response(JSON.stringify({ reply: choice.content || "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      for (const call of calls) {
        let args: any = {};
        try { args = JSON.parse(call.function?.arguments || "{}"); } catch { args = {}; }
        const result = await runTool(admin, call.function?.name, args);
        convo.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    return new Response(JSON.stringify({ reply: "I ran out of reasoning steps before producing a final answer. Please refine your question." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("ai-copilot error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
