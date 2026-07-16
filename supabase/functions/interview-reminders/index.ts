import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatGmt1(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'long', day: 'numeric', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) + ' (GMT+1)';
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Look for interviews starting between ~50 and ~70 minutes from now
  // (window covers 15-minute cron cadence)
  const now = Date.now();
  const windowStart = new Date(now + 50 * 60 * 1000).toISOString();
  const windowEnd   = new Date(now + 70 * 60 * 1000).toISOString();

  const { data: interviews, error } = await admin
    .from("interviews")
    .select("id, application_id, interview_date, meeting_link, interviewer, interview_type, location_platform, office_address, contact_phone, reminder_sent_at, outcome")
    .gte("interview_date", windowStart)
    .lte("interview_date", windowEnd)
    .is("reminder_sent_at", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];
  for (const iv of interviews || []) {
    if (iv.outcome) continue; // interview already completed

    const { data: app } = await admin.from("applications")
      .select("candidate_id, job_id").eq("id", iv.application_id).maybeSingle();
    if (!app) continue;

    const { data: candidate } = await admin.from("candidates")
      .select("user_id").eq("id", app.candidate_id).maybeSingle();
    if (!candidate?.user_id) continue;

    const { data: job } = await admin.from("job_positions")
      .select("title").eq("id", app.job_id).maybeSingle();

    const { error: mailErr } = await admin.functions.invoke("send-email", {
      body: {
        user_id: candidate.user_id,
        template_key: "candidate_interview_reminder",
        vars: {
          job: job?.title || "the position",
          date: formatGmt1(iv.interview_date),
          interview_type: iv.interview_type || "",
          location: iv.location_platform || "",
          address: iv.office_address || "",
          interviewer: iv.interviewer || "",
          contact_phone: iv.contact_phone || "",
          link: iv.meeting_link || "",
        },
      },
    });

    if (!mailErr) {
      await admin.from("interviews")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", iv.id);
      results.push({ id: iv.id, status: "sent" });
    } else {
      results.push({ id: iv.id, status: "failed", error: mailErr.message });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
