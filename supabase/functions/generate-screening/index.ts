import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { job_title, department, description, requirements } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
            content: `You are an HR screening specialist for a company that does field-based work. Generate screening questions for job candidates based on the job details provided. Create a mix of multiple choice and short answer questions (8-12 questions total).

IMPORTANT: In addition to role-specific questions, you MUST include the following field-work screening topics:

1. **Current Location & Relocation**: Ask about the candidate's current city/state and whether they are willing to temporarily relocate to another location if the job requires it.
2. **Past Field Work Experience**: Ask about any previous experience doing field work, door-to-door activities, surveys, data collection, or similar on-the-ground roles.
3. **Understanding of Field Work Nature**: Include a question that makes it clear this role involves working in the field, interacting with strangers, and being in unfamiliar environments. Ask if the candidate is comfortable with this.
4. **Medical Fitness**: Ask a self-declaration question about whether the candidate is medically fit for physically demanding field work (walking long distances, standing for hours, working outdoors). No paperwork needed, just a yes/no with optional details.
5. **Salary Expectations**: Ask about the candidate's salary or compensation expectations for this role.
6. **Teamwork & Independence**: Ask about the candidate's ability to work both as part of a team and unsupervised/independently in the field.
7. **Other Relevant Questions**: Include any other questions relevant to field-based roles such as availability, transportation, communication skills with strangers, or handling rejection.

Use a mix of multiple_choice (for straightforward assessments) and short_answer (for detailed responses like experience descriptions and salary expectations).`,
          },
          {
            role: "user",
            content: `Generate screening questions for:\n\nTitle: ${job_title}\nDepartment: ${department}\nDescription: ${description || "Not provided"}\nRequirements: ${requirements || "Not provided"}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_screening_questions",
              description: "Generate structured screening questions for a job position",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique identifier like q1, q2" },
                        question: { type: "string", description: "The screening question" },
                        type: {
                          type: "string",
                          enum: ["multiple_choice", "short_answer"],
                        },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          description: "Options for multiple choice (omit for short_answer)",
                        },
                      },
                      required: ["id", "question", "type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_screening_questions" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured response from AI");

    const { questions } = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-screening error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
