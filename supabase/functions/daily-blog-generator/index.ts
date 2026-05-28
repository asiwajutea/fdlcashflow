import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOPICS = [
  'recent EdTech innovations and trends in Africa',
  'African cultural preservation efforts and projects',
  'notable educational events and conferences across Africa',
  'African family history, genealogy and heritage stories',
  'African heritage sites, traditions and historical discoveries',
  'technology in African education and learning',
  'preserving African languages and oral traditions',
];

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function callGemini(prompt: string, system?: string): Promise<string> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not set');

  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!resp.ok) throw new Error(`AI Gateway ${resp.status}: ${await resp.text()}`);
  const json = await resp.json();
  return json.choices?.[0]?.message?.content || '';
}

function extractImageBytes(json: any): Uint8Array | null {
  const msg = json?.choices?.[0]?.message;
  if (!msg) return null;
  let dataUrl: string | undefined;

  // Try several known response shapes
  dataUrl = msg.images?.[0]?.image_url?.url
    || msg.images?.[0]?.url
    || msg.images?.[0]?.b64_json
    || json?.data?.[0]?.b64_json
    || json?.data?.[0]?.url;

  if (!dataUrl && Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (part?.type === 'image_url' && part?.image_url?.url) { dataUrl = part.image_url.url; break; }
      if (part?.type === 'output_image' && part?.image_url) { dataUrl = part.image_url; break; }
    }
  }

  if (!dataUrl) return null;
  const b64 = dataUrl.includes(',') ? dataUrl.split(',').pop()! : dataUrl;
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function generateImage(prompt: string): Promise<Uint8Array | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return null;
  const models = ['google/gemini-3-flash-image-preview', 'google/gemini-3-pro-image-preview', 'google/gemini-2.5-flash-image'];

  for (const model of models) {
    try {
      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          modalities: ['image', 'text'],
        }),
      });
      if (!resp.ok) {
        console.error(`Image gen ${model} failed`, resp.status, (await resp.text()).slice(0, 400));
        continue;
      }
      const json = await resp.json();
      const bytes = extractImageBytes(json);
      if (bytes) return bytes;
      console.error(`Image gen ${model} - no image in response shape:`, JSON.stringify(json).slice(0, 800));
    } catch (e) {
      console.error(`generateImage ${model} error`, e);
    }
  }
  return null;
}

function extractJson(text: string): any {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found');
  return JSON.parse(candidate.slice(start, end + 1));
}

function stripInBodySources(html: string): string {
  return html
    .replace(/<h2[^>]*>\s*Sources?\s*<\/h2>[\s\S]*$/i, '')
    .replace(/<h3[^>]*>\s*Sources?\s*<\/h3>[\s\S]*$/i, '')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const topic = TOPICS[dayOfYear % TOPICS.length];

    const system = `You are Ehny, a thoughtful blogger writing for Footprints Dynasty — a brand focused on African heritage, family history, education and cultural preservation. Write engaging, easy-to-read blog posts with warmth and authority.`;

    const prompt = `Write a fresh, engaging blog post about: "${topic}".

Requirements:
- Pick 1 ranking/trending angle worth talking about today.
- 600-900 words. Conversational but informative tone.
- Output the post body as semantic HTML (no <html>, <body>, or <head> tags) using <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>, <blockquote>.
- Structure: opening paragraph, then 3-5 H2 sections, optional bullet lists, short closing paragraph.
- DO NOT include a Sources section, source links, citations, or any <h2>Sources</h2> block inside the body. Sources go ONLY in the JSON "sources" array below.
- Return ONLY valid JSON, no commentary, in this shape:

{
  "title": "string (max 60 chars, compelling)",
  "slug": "string (kebab-case, max 60 chars)",
  "excerpt": "string (max 160 chars, hook for readers)",
  "meta_title": "string (max 60 chars, SEO optimized)",
  "meta_description": "string (max 160 chars)",
  "tags": ["tag1","tag2","tag3"],
  "body": "string (full HTML body as described, no Sources section)",
  "sources": [{"title":"...","url":"https://..."}]
}

Provide 3-5 plausible reputable source links in the "sources" array (BBC Africa, Quartz Africa, EdSurge, UNESCO, Brookings, The Conversation Africa, etc.). Use homepage URLs if exact article URLs are uncertain — never invent fake-looking URLs.`;

    const raw = await callGemini(prompt, system);
    const parsed = extractJson(raw);

    // Clean any in-body Sources block the model may have included anyway
    parsed.body = stripInBodySources(parsed.body || '');

    const slug = (parsed.slug && slugify(parsed.slug)) || slugify(parsed.title || 'post');
    let finalSlug = slug;
    let n = 1;
    while (true) {
      const { data: exists } = await admin.from('blog_posts').select('id').eq('slug', finalSlug).maybeSingle();
      if (!exists) break;
      n += 1;
      finalSlug = `${slug}-${n}`;
      if (n > 50) { finalSlug = `${slug}-${Date.now()}`; break; }
    }

    let featuredImage = '';
    try {
      const imgPrompt = `Editorial hero photograph for a blog post titled "${parsed.title}". Theme: ${topic}. Cinematic, warm natural light, rich African heritage / educational atmosphere, photojournalistic style, no text, no logos, no watermarks, 16:9 composition.`;
      const bytes = await generateImage(imgPrompt);
      if (bytes) {
        const path = `auto-blog/${finalSlug}-${Date.now()}.png`;
        const { error: upErr } = await admin.storage.from('cms-media').upload(path, bytes, {
          contentType: 'image/png',
          upsert: false,
        });
        if (!upErr) {
          const { data: pub } = admin.storage.from('cms-media').getPublicUrl(path);
          featuredImage = pub?.publicUrl || '';
        } else {
          console.error('image upload error', upErr);
        }
      }
    } catch (imgErr) {
      console.error('image step failed', imgErr);
    }

    const { data: inserted, error: insErr } = await admin
      .from('blog_posts')
      .insert({
        title: parsed.title,
        slug: finalSlug,
        excerpt: parsed.excerpt || '',
        body: parsed.body || '',
        meta_title: parsed.meta_title || parsed.title,
        meta_description: parsed.meta_description || parsed.excerpt || '',
        tags: parsed.tags || [],
        sources: parsed.sources || [],
        featured_image: featuredImage,
        author_name: 'Ehny',
        is_auto_generated: true,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select('id, slug, title, featured_image')
      .single();

    if (insErr) throw insErr;

    return new Response(JSON.stringify({ success: true, post: inserted, topic }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('daily-blog-generator error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
