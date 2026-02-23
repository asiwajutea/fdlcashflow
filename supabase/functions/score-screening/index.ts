import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { application_id, answers } = await req.json();
    if (!application_id || !answers) throw new Error("Missing application_id or answers");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate caller owns this application
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
      if (claimsErr || !claims?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = claims.claims.sub;

      // Check candidate owns this application
      const { data: ownership } = await supabase
        .from("applications")
        .select("id, candidates!inner(user_id)")
        .eq("id", application_id)
        .single();

      if ((ownership as any)?.candidates?.user_id !== userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch screening record
    const { data: screening, error: sErr } = await supabase
      .from("screening_responses")
      .select("id, responses")
      .eq("application_id", application_id)
      .single();

    if (sErr || !screening) throw new Error("Screening record not found");

    const questions = (screening.responses as any)?.questions || [];

    // Fetch job info for context
    const { data: app } = await supabase
      .from("applications")
      .select("job_positions!inner(title, requirements)")
      .eq("id", application_id)
      .single();

    const jobTitle = (app as any)?.job_positions?.title || "";
    const jobRequirements = (app as any)?.job_positions?.requirements || "";

    // Build Q&A text for scoring
    const qaText = questions
      .map((q: any, i: number) => `Q${i + 1}: ${q.question}\nAnswer: ${answers[q.id] || "No answer provided"}`)
      .join("\n\n");

    // Score via AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are an HR specialist evaluating candidate screening responses. Score answers based on relevance, quality, depth, and alignment with job requirements. Be fair but thorough.",
          },
          {
            role: "user",
            content: `Score these screening responses for "${jobTitle}".\n\nJob Requirements: ${jobRequirements}\n\n${qaText}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "score_screening",
              description: "Score candidate screening responses",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", description: "Score from 0 to 100" },
                  feedback: { type: "string", description: "Brief constructive feedback on the responses" },
                },
                required: ["score", "feedback"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "score_screening" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI scoring error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI scoring error: ${status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured scoring response");

    const { score, feedback } = JSON.parse(toolCall.function.arguments);

    // Update screening record with answers + score
    const updatedResponses = {
      ...(screening.responses as any),
      answers,
      feedback,
      scored_at: new Date().toISOString(),
    };

    await supabase
      .from("screening_responses")
      .update({ responses: updatedResponses, score })
      .eq("id", screening.id);

    return new Response(JSON.stringify({ score, feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score-screening error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
