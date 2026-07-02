import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { quarter, year, country = "Nigeria" } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const now = new Date();
    const q = quarter || Math.floor(now.getMonth() / 3) + 1;
    const y = year || now.getFullYear();
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = startMonth + 2;

    const prompt = `List notable public holidays, religious observances, awareness days, and important commemorative days in ${country} between month ${startMonth} and month ${endMonth} of ${y}. Include international days widely observed in workplaces (e.g. Workers' Day, International Women's Day).

Return ONLY a JSON array, no prose. Each object MUST have all three fields:
- "date": "YYYY-MM-DD"
- "label": short title, max 6 words (e.g. "New Year's Day") — used as email subject
- "message": a warm, friendly SMS message body, 1–2 sentences, suitable for sending to staff (e.g. "Happy New Year! Wishing you and your loved ones joy and prosperity in the new year. — FDL Team")

Example item: {"date":"2026-01-01","label":"New Year's Day","message":"Happy New Year! Wishing you joy, health, and prosperity in the year ahead. — FDL Team"}

Max 25 items, sorted by date. Every item must include all three fields — never omit message.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You output only valid JSON arrays. Each object must have exactly three string fields: date, label, and message. Never omit any field. No markdown, no commentary." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `AI gateway error: ${resp.status}`, detail: text }), {
        status: resp.status === 429 || resp.status === 402 ? resp.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    let raw: string = data?.choices?.[0]?.message?.content || "[]";
    raw = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let items: any[] = [];
    try { items = JSON.parse(raw); } catch {
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) { try { items = JSON.parse(m[0]); } catch { items = []; } }
    }

    // sanitize
    items = (Array.isArray(items) ? items : [])
      .filter((it) => it && it.date && it.label)
      .map((it) => ({
        date: String(it.date).slice(0, 10),
        label: String(it.label).slice(0, 120),
        ...(it.message ? { message: String(it.message).slice(0, 320) } : {}),
      }));

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
