/**
 * daily-digest
 * Scheduled edge function (run once daily via pg_cron or Supabase cron).
 * Finds users with unread inbox messages and sends them a digest email.
 *
 * Rules:
 * - Only sends if the user has at least 1 unread message
 * - Stops sending if all unread messages are older than 7 days
 *   (prevents spamming about very old messages the user may have decided to ignore)
 * - Only sends to users with a valid email address
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CUTOFF_DAYS = 7;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const origin = Deno.env.get("APP_ORIGIN") || "https://footprintsdynasty.com.ng";
    const cutoffDate = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // 1. Find all users who have unread messages
    //    Group by recipient_id, count unread, get latest message date
    const { data: unreadGroups, error: msgErr } = await admin
      .from("messages")
      .select("recipient_id, subject, created_at")
      .eq("is_read", false)
      .order("created_at", { ascending: false });

    if (msgErr) throw msgErr;
    if (!unreadGroups || unreadGroups.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "No unread messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Group by recipient
    const byRecipient = new Map<string, { count: number; subjects: string[]; latestDate: string }>();
    for (const msg of unreadGroups) {
      const uid = msg.recipient_id;
      if (!byRecipient.has(uid)) {
        byRecipient.set(uid, { count: 0, subjects: [], latestDate: msg.created_at });
      }
      const entry = byRecipient.get(uid)!;
      entry.count++;
      if (entry.subjects.length < 3) entry.subjects.push(msg.subject || '(no subject)');
      if (msg.created_at > entry.latestDate) entry.latestDate = msg.created_at;
    }

    // 3. Filter: skip users where ALL unread messages are older than 7 days
    const eligibleUsers: Array<{ uid: string; count: number; subjects: string[] }> = [];
    for (const [uid, data] of byRecipient.entries()) {
      if (data.latestDate >= cutoffDate) {
        eligibleUsers.push({ uid, count: data.count, subjects: data.subjects });
      }
    }

    if (eligibleUsers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "All unread messages are older than 7 days" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Resolve email + name for eligible users using auth.users (service role)
    const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const authMap = new Map<string, { email: string; name: string }>();
    for (const u of authList?.users || []) {
      authMap.set(u.id, {
        email: u.email || '',
        name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Team Member',
      });
    }

    // 5. Send digest email to each eligible user
    let sentCount = 0;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const sends = eligibleUsers.map(async ({ uid, count, subjects }) => {
      const auth = authMap.get(uid);
      if (!auth?.email) return;

      const previews = subjects
        .map((s, i) => `${i + 1}. ${s}`)
        .join('<br/>');

      try {
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            template_key: "inbox_digest",
            to: auth.email,
            name: auth.name,
            user_id: uid,
            vars: {
              count: String(count),
              previews,
              origin,
            },
          }),
        });
        sentCount++;
      } catch (e) {
        console.error(`Digest failed for ${uid}:`, e);
      }
    });

    await Promise.allSettled(sends);

    return new Response(JSON.stringify({ success: true, sent: sentCount, eligible: eligibleUsers.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("daily-digest error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
