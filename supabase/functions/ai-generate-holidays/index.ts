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

    const prompt = `List notable public holidays, religious observances, awareness days, and important commemorative days in ${country} between month ${startMonth} and month ${endMonth} of ${y}. Include international days widely observed in workplaces (e.g. Workers' Day, International Women's Day). Return ONLY a JSON array, no prose. Each item must be: {"date":"YYYY-MM-DD","label":"Short friendly title"}. Max 25 items, sorted by date.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You output only valid JSON arrays. No markdown, no commentary." },
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
      .map((it) => ({ date: String(it.date).slice(0, 10), label: String(it.label).slice(0, 120) }));

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
