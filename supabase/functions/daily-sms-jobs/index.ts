import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ── UTC day window (midnight → midnight) ──────────────────────────────────
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const todayStartIso = todayStart.toISOString();
  const todayEndIso   = todayEnd.toISOString();

  const todayMonth = now.getUTCMonth() + 1;
  const todayDay   = now.getUTCDate();
  const isoDay = `${String(todayMonth).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`;

  // ── Build dedup sets from today's logs ────────────────────────────────────
  // sms_logs: keyed by "template_key:user_id" for sent/error entries today
  const { data: smsLogsToday } = await admin
    .from("sms_logs")
    .select("template_key, user_id")
    .in("status", ["sent", "error"])
    .gte("created_at", todayStartIso)
    .lt("created_at", todayEndIso);

  const smsSentToday = new Set<string>(
    (smsLogsToday || [])
      .filter(r => r.user_id && r.template_key)
      .map(r => `${r.template_key}:${r.user_id}`)
  );

  // email_logs: keyed by "template_key:user_id" for sent entries today
  const { data: emailLogsToday } = await admin
    .from("email_logs")
    .select("template_key, user_id")
    .eq("status", "sent")
    .gte("created_at", todayStartIso)
    .lt("created_at", todayEndIso);

  const emailSentToday = new Set<string>(
    (emailLogsToday || [])
      .filter(r => r.user_id && r.template_key)
      .map(r => `${r.template_key}:${r.user_id}`)
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  const callSendSms = async (payload: any) => {
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (e) { console.error("send-sms call failed", e); }
  };

  const callSendEmail = async (payload: any) => {
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (e) { console.error("send-email call failed", e); }
  };

  let birthdayCount = 0, birthdaySkipped = 0;
  let holidayCount  = 0, holidaySkipped  = 0;

  // ── Birthdays ─────────────────────────────────────────────────────────────
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, phone, birthday, approval_status")
    .eq("approval_status", "approved")
    .eq("is_active", true)
    .not("birthday", "is", null);

  for (const p of profiles || []) {
    if (!p.birthday || !p.phone) continue;
    const d = new Date(p.birthday);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    if (`${mm}-${dd}` !== isoDay) continue;

    const dedupKey = `birthday:${p.id}`;
    if (smsSentToday.has(dedupKey)) {
      console.log(`[skip] birthday SMS already sent today for user ${p.id}`);
      birthdaySkipped++;
      continue;
    }

    const firstName = (p.full_name || "there").split(" ")[0];
    await callSendSms({ to: p.phone, user_id: p.id, template_key: "birthday", vars: { name: firstName } });
    birthdayCount++;
  }

  // ── Holidays ──────────────────────────────────────────────────────────────
  const { data: setting } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "holidays")
    .maybeSingle();

  let holidays: Array<{ date: string; label: string; message?: string }> = [];
  try {
    const parsed = JSON.parse(setting?.value || "[]");
    if (Array.isArray(parsed)) holidays = parsed;
    else if (parsed && typeof parsed === "object" && parsed.date) holidays = [parsed];
  } catch { holidays = []; }

  const todayHoliday = holidays.find((h) => {
    if (!h?.date) return false;
    const d = h.date.length === 5 ? h.date : h.date.slice(5);
    return d === isoDay;
  });

  if (todayHoliday) {
    const { data: all } = await admin
      .from("profiles")
      .select("id, full_name, phone, approval_status")
      .eq("approval_status", "approved")
      .eq("is_active", true);

    const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of authList?.users || []) {
      if (u.email) emailMap.set(u.id, u.email);
    }

    for (const p of all || []) {
      const firstName = (p.full_name || "there").split(" ")[0];
      // holiday = full message body for SMS {{holiday}} var
      // title   = short label for email subject
      const smsMessage = todayHoliday.message || todayHoliday.label;
      const vars = { name: firstName, holiday: smsMessage, title: todayHoliday.label };

      // SMS
      if (p.phone) {
        const smsDedupKey = `holiday:${p.id}`;
        if (smsSentToday.has(smsDedupKey)) {
          console.log(`[skip] holiday SMS already sent today for user ${p.id}`);
          holidaySkipped++;
        } else {
          await callSendSms({ to: p.phone, user_id: p.id, template_key: "holiday", vars });
          holidayCount++;
        }
      }

      // Email — `title` = short label for subject; `holiday` = full SMS body (ignored by email template)
      const email = emailMap.get(p.id);
      if (email) {
        const emailDedupKey = `holiday_greeting:${p.id}`;
        if (emailSentToday.has(emailDedupKey)) {
          console.log(`[skip] holiday email already sent today for user ${p.id}`);
          holidaySkipped++;
        } else {
          await callSendEmail({
            template_key: "holiday_greeting",
            to: email,
            name: firstName,
            user_id: p.id,
            vars: { ...vars, title: todayHoliday.label },
          });
          holidayCount++;
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, birthdayCount, birthdaySkipped, holidayCount, holidaySkipped }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
