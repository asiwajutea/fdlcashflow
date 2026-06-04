import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 2; // 2 retries on top of the initial attempt = up to 3 sends

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = "234" + digits.slice(1);
  if (digits.startsWith("234") && digits.length === 13) return digits;
  if (digits.length >= 11) return digits;
  return null;
}

function renderTemplate(body: string, vars: Record<string, any>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = vars?.[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

async function dispatch(phone: string, body: string, apiKey: string, sender: string) {
  const formData = new URLSearchParams();
  formData.append("message", body);
  formData.append("sender_name", sender.slice(0, 11));
  formData.append("recipients", phone);

  const resp = await fetch("https://app.multitexter.com/v2/app/sendsms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const text = await resp.text();
  let parsed: any = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  const ok = Number(parsed?.status) === 1;
  return { ok, parsed, text };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const payload = await req.json();
    const { to, template_key, vars = {}, user_id, body: rawBody, retry_log_id } = payload;

    // Retry mode: re-send an existing failed log
    if (retry_log_id) {
      const { data: log } = await admin.from("sms_logs").select("*").eq("id", retry_log_id).maybeSingle();
      if (!log) {
        return new Response(JSON.stringify({ error: "log not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const apiKey = Deno.env.get("MULTITEXTER_API_KEY");
      const sender = Deno.env.get("MULTITEXTER_SENDER_NAME") || "Footprints";
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "MULTITEXTER_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const phone = log.recipient_phone;
      const body = log.body;
      const result = await dispatch(phone, body, apiKey, sender);
      const retry_count = (log.retry_count ?? 0) + 1;
      await admin.from("sms_logs").update({
        status: result.ok ? "sent" : "failed",
        provider_msg_id: result.parsed?.msgid ?? log.provider_msg_id,
        units: result.parsed?.units ?? log.units,
        balance: result.parsed?.balance ?? log.balance,
        error: result.ok ? null : (result.parsed?.msg || result.text)?.slice(0, 500),
        retry_count,
        last_retry_at: new Date().toISOString(),
      }).eq("id", retry_log_id);
      return new Response(JSON.stringify({ success: result.ok, provider: result.parsed, retry_count }), {
        status: result.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve recipient phone
    let phone: string | null = normalizePhone(to || "");
    if (!phone && user_id) {
      const { data: prof } = await admin.from("profiles").select("phone, full_name").eq("id", user_id).maybeSingle();
      phone = normalizePhone(prof?.phone || "");
      if (!vars.name && prof?.full_name) vars.name = prof.full_name.split(" ")[0];
    }
    if (!phone) {
      return new Response(JSON.stringify({ skipped: true, reason: "no phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve body — from template or raw
    let body = rawBody as string | undefined;
    if (!body && template_key) {
      const { data: tpl } = await admin.from("sms_templates").select("body, is_active").eq("key", template_key).maybeSingle();
      if (!tpl) {
        return new Response(JSON.stringify({ error: `template ${template_key} not found` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!tpl.is_active) {
        return new Response(JSON.stringify({ skipped: true, reason: "template inactive" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      body = renderTemplate(tpl.body, vars);
    }
    if (!body) {
      return new Response(JSON.stringify({ error: "body or template_key required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("MULTITEXTER_API_KEY");
    const sender = Deno.env.get("MULTITEXTER_SENDER_NAME") || "Footprints";

    if (!apiKey) {
      await admin.from("sms_logs").insert({
        template_key, recipient_phone: phone, user_id, body, status: "error",
        error: "MULTITEXTER_API_KEY not configured",
        original_to: to ?? null, original_template_key: template_key ?? null, original_vars: vars,
      });
      return new Response(JSON.stringify({ error: "MULTITEXTER_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initial attempt + up to MAX_RETRIES inline retries with short backoff
    let attempt = 0;
    let last: { ok: boolean; parsed: any; text: string } | null = null;
    while (attempt <= MAX_RETRIES) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 800 * attempt));
      last = await dispatch(phone, body, apiKey, sender);
      if (last.ok) break;
      attempt++;
    }
    const ok = !!last?.ok;
    const retry_count = Math.max(0, attempt - (ok ? 0 : 0));

    await admin.from("sms_logs").insert({
      template_key, recipient_phone: phone, user_id, body,
      status: ok ? "sent" : "failed",
      provider_msg_id: last?.parsed?.msgid ?? null,
      units: last?.parsed?.units ?? null,
      balance: last?.parsed?.balance ?? null,
      error: ok ? null : (last?.parsed?.msg || last?.text)?.slice(0, 500),
      retry_count,
      last_retry_at: attempt > 0 ? new Date().toISOString() : null,
      original_to: to ?? null,
      original_template_key: template_key ?? null,
      original_vars: vars,
    });

    return new Response(JSON.stringify({ success: ok, provider: last?.parsed, attempts: attempt + (ok ? 1 : 0) }), {
      status: ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-sms error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
