import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { full_name, position, department, details } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const fields = Object.entries(details || {})
      .filter(([_, v]) => v && String(v).trim().length > 0)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    const prompt = `Write a warm, professional first-person "About Me" for an employee profile.
Name: ${full_name || "Employee"}
Position: ${position || "Team member"}
Department: ${department || ""}
Details:
${fields || "(no extra details provided)"}

Return JSON ONLY: {"about_me":"<3-5 short paragraphs in first person>","excerpt":"<one warm sentence under 160 chars>"}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You output only valid JSON objects matching the requested schema." },
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
    let raw: string = data?.choices?.[0]?.message?.content || "{}";
    raw = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let out: any = {};
    try { out = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { try { out = JSON.parse(m[0]); } catch { out = {}; } }
    }

    return new Response(JSON.stringify({
      about_me: String(out.about_me || "").slice(0, 4000),
      excerpt: String(out.excerpt || "").slice(0, 200),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
