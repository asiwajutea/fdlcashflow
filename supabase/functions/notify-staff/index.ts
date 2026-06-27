/**
 * notify-staff — sends an SMS to all users who have a given role OR capability.
 *
 * Body:
 *   template_key  — key from sms_templates table
 *   vars          — variables for the template
 *   roles         — array of roles to notify, e.g. ["admin", "employee"]
 *   capabilities  — array of capabilities to also include, e.g. ["approve_finance_requests"]
 *
 * The function resolves all matching user phone numbers and fires send-sms
 * for each one concurrently (fire-and-forget per recipient).
 */
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

  try {
    const { template_key, vars = {}, roles = [], capabilities = [] } = await req.json();

    if (!template_key) throw new Error("template_key is required");
    if (!roles.length && !capabilities.length) throw new Error("roles or capabilities must be provided");

    // ── 1. Collect user IDs matching roles ──────────────────────────────────
    const userIdSet = new Set<string>();

    if (roles.length > 0) {
      const { data: roleRows } = await admin
        .from("user_roles")
        .select("user_id")
        .in("role", roles);
      (roleRows || []).forEach((r: any) => userIdSet.add(r.user_id));
    }

    if (capabilities.length > 0) {
      const { data: capRows } = await admin
        .from("user_capabilities")
        .select("user_id")
        .in("capability", capabilities);
      (capRows || []).forEach((r: any) => userIdSet.add(r.user_id));
    }

    if (userIdSet.size === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "No matching users found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Fetch phone numbers for those users ──────────────────────────────
    const userIds = [...userIdSet];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", userIds)
      .not("phone", "is", null);

    const recipients = (profiles || []).filter((p: any) => p.phone && p.phone.trim());

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "No phone numbers found for matching users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Send SMS to each recipient ───────────────────────────────────────
    const origin = Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const sends = recipients.map((p: any) =>
      fetch(`${origin}/functions/v1/send-sms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: p.phone,
          user_id: p.id,
          template_key,
          vars: { ...vars, name: p.full_name || "Staff" },
        }),
      }).catch((e) => console.error(`SMS failed for ${p.id}:`, e))
    );

    await Promise.allSettled(sends);

    return new Response(
      JSON.stringify({ success: true, sent_to: recipients.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error("notify-staff error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
