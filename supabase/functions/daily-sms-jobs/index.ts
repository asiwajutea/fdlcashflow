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

  const now = new Date();
  const todayMonth = now.getUTCMonth() + 1;
  const todayDay = now.getUTCDate();
  const isoDay = `${String(todayMonth).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`;

  let birthdayCount = 0, holidayCount = 0;

  // 1. Birthdays — approved profiles with matching MM-DD
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, phone, birthday, approval_status")
    .eq("approval_status", "approved")
    .not("birthday", "is", null);

  for (const p of profiles || []) {
    if (!p.birthday || !p.phone) continue;
    const d = new Date(p.birthday);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    if (`${mm}-${dd}` !== isoDay) continue;
    const firstName = (p.full_name || "there").split(" ")[0];
    await callSendSms({
      to: p.phone, user_id: p.id, template_key: "birthday",
      vars: { name: firstName },
    });
    birthdayCount++;
  }

  // 2. Holidays — app_settings.holidays JSON: [{date:'YYYY-MM-DD' or 'MM-DD', label:'New Year'}]
  const { data: setting } = await admin.from("app_settings").select("value").eq("key", "holidays").maybeSingle();
  let holidays: Array<{ date: string; label: string }> = [];
  try { holidays = JSON.parse(setting?.value || "[]"); } catch { holidays = []; }

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
      .not("phone", "is", null);
    for (const p of all || []) {
      if (!p.phone) continue;
      const firstName = (p.full_name || "there").split(" ")[0];
      await callSendSms({
        to: p.phone, user_id: p.id, template_key: "holiday",
        vars: { name: firstName, holiday: todayHoliday.label },
      });
      holidayCount++;
    }
  }

  return new Response(JSON.stringify({ ok: true, birthdayCount, holidayCount }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
