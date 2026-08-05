import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DELETE_AFTER_DAYS = 30;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const origin = Deno.env.get("APP_ORIGIN") || "https://footprintsdynasty.lovable.app";
  const result = { reminded: 0, deleted: 0, errors: [] as string[], dry_run: false };

  try {
    let dryRun = false;
    try { dryRun = !!(await req.json())?.dry_run; } catch { /* no body */ }
    result.dry_run = dryRun;

    // 1. All candidate-role users
    const { data: roleRows, error: roleErr } = await admin
      .from("user_roles").select("user_id").eq("role", "candidate");
    if (roleErr) throw roleErr;
    const candidateUserIds = (roleRows || []).map((r: any) => r.user_id);
    if (candidateUserIds.length === 0) {
      return json({ ...result, message: "No candidate accounts" });
    }

    // 2. Map user_id -> candidates.id
    const { data: candRows, error: candErr } = await admin
      .from("candidates").select("id, user_id").in("user_id", candidateUserIds);
    if (candErr) throw candErr;
    const candIdByUser = new Map<string, string>();
    for (const c of candRows || []) candIdByUser.set(c.user_id, c.id);

    // 3. Candidate ids that have at least one application (ever, incl. archived)
    const candIds = (candRows || []).map((c: any) => c.id);
    const applied = new Set<string>();
    if (candIds.length) {
      const { data: apps, error: appErr } = await admin
        .from("applications").select("candidate_id").in("candidate_id", candIds);
      if (appErr) throw appErr;
      for (const a of apps || []) applied.add(a.candidate_id);
    }

    const now = Date.now();

    for (const userId of candidateUserIds) {
      const candId = candIdByUser.get(userId);
      if (candId && applied.has(candId)) continue; // has applied — leave alone

      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      const u = authUser?.user;
      if (!u?.email) continue;

      const createdAt = new Date(u.created_at).getTime();
      const ageDays = Math.floor((now - createdAt) / 86_400_000);
      const daysLeft = Math.max(0, DELETE_AFTER_DAYS - ageDays);
      const name = (u.user_metadata?.full_name || u.email.split("@")[0]).split(" ")[0];

      // 4a. Past the window → permanently delete account + data
      if (ageDays >= DELETE_AFTER_DAYS) {
        if (dryRun) { result.deleted++; continue; }
        try {
          if (candId) await admin.from("candidates").delete().eq("id", candId);
          await admin.from("messages").delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
          await admin.from("user_capabilities").delete().eq("user_id", userId);
          await admin.from("user_roles").delete().eq("user_id", userId);
          await admin.from("profiles").delete().eq("id", userId);
          const { error: delErr } = await admin.auth.admin.deleteUser(userId);
          if (delErr) throw delErr;
          result.deleted++;
        } catch (e) {
          result.errors.push(`delete ${userId}: ${(e as Error).message}`);
        }
        continue;
      }

      // 4b. Otherwise nudge (weekly cron => weekly reminder)
      if (dryRun) { result.reminded++; continue; }
      try {
        const { error: mailErr } = await admin.functions.invoke("send-email", {
          body: {
            template_key: "candidate_no_application",
            user_id: userId,
            to: u.email,
            name,
            vars: { origin, days_left: daysLeft, final_notice: daysLeft <= 7 },
          },
        });
        if (mailErr) throw mailErr;
        result.reminded++;
      } catch (e) {
        result.errors.push(`email ${userId}: ${(e as Error).message}`);
      }
    }

    return json(result);
  } catch (e) {
    return json({ error: (e as Error).message, ...result }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
