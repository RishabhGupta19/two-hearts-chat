import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a relationship counselor designing a personalized assessment for a couple's communication app called UsTwo.

Generate exactly 10 multiple-choice questions to understand the user's communication style, conflict resolution preferences, love language, and emotional needs.

Rules:
- Return ONLY valid JSON, no other text
- Each question must have 4-6 options
- All questions allow multiple selections
- Questions should cover: conflict style, love language, communication preferences, emotional needs, stress responses, appreciation style, boundaries, trust building, quality time preferences, and growth mindset
- Make questions warm, relatable, and non-judgmental
- Options should be concise (under 10 words each)

Return this exact JSON structure:
{
  "questions": [
    {
      "id": 1,
      "question": "The question text",
      "category": "category_name",
      "options": ["Option A", "Option B", "Option C", "Option D"]
    }
  ]
}

Categories to use: upsetPreference, loveLanguage, conflictStyle, communicationStrength, appreciationStyle, stressResponse, boundaries, trustBuilding, qualityTime, growthMindset`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, answers, userName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (action === "generate_questions") {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Generate the assessment questions for a user named ${userName || "there"}.` },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      // Extract JSON from the response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      
      try {
        const questions = JSON.parse(jsonStr);
        return new Response(JSON.stringify(questions), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        console.error("Failed to parse questions JSON:", jsonStr);
        return new Response(JSON.stringify({ error: "Failed to generate questions" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "summarize") {
      const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a relationship counselor. Given a user's assessment answers, create a concise profile summary. Return ONLY valid JSON with these keys: upsetPreference, loveLanguage, conflictStyle, communicationStrength, appreciationStyle, stressResponse, boundaries, trustBuilding, qualityTime, growthMindset. Each value should be a short phrase (under 8 words) summarizing their tendency.`,
            },
            {
              role: "user",
              content: `Here are the user's assessment answers:\n${JSON.stringify(answers, null, 2)}`,
            },
          ],
        }),
      });

      if (!summaryResponse.ok) {
        const t = await summaryResponse.text();
        console.error("Summary error:", summaryResponse.status, t);
        return new Response(JSON.stringify({ error: "Failed to summarize" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const summaryData = await summaryResponse.json();
      const summaryContent = summaryData.choices?.[0]?.message?.content || "";
      
      let summaryJson = summaryContent;
      const summaryMatch = summaryContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (summaryMatch) summaryJson = summaryMatch[1].trim();

      try {
        const profile = JSON.parse(summaryJson);
        return new Response(JSON.stringify({ profile }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        console.error("Failed to parse summary JSON:", summaryJson);
        return new Response(JSON.stringify({ error: "Failed to create profile" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("assessment-chat error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
