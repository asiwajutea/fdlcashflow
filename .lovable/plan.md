## Plan

### 1. HR — Auto-promote candidate to employee on hire

**File:** `src/pages/Applications.tsx` (in `handleStatusChange`)

When `newStatus === 'hired'`:

- Call a new edge function `promote-candidate-to-employee` (service-role required to update `user_roles` and `auth.users` metadata).
- The function will:
  - Delete the `candidate` role row from `user_roles` and insert `employee` role.
  - Remove candidate-only capabilities (`submit_application`, `complete_screening`, `sign_contract`, `view_interview`) and add standard employee capabilities.
  - Update `profiles.approval_status` to `approved`.
  - Create or link an `employees` record (reuse logic from `handle_new_user`): match by email, else insert new row with `EMP-<uid8>`.
  - Update `auth.users.raw_user_meta_data.role = 'employee'`.
- Toast confirms promotion; UI refreshes.

### 2. CMS — Media picker + image optimization

**New component:** `src/components/cms/MediaPicker.tsx`

- Dialog that lists files from `cms-media` bucket (grid view, search by name).
- "Use this image" returns the public URL.

**Update `src/components/cms/ImageUpload.tsx`:**

- Add third button "Pick from library" → opens `MediaPicker`.
- All CMS pages already use `ImageUpload`, so they get the picker automatically.
- For pages using raw URL inputs (audit Hero/Events/Blog/Innovations/Gallery/Partners/Services/TeamMembers/Testimonials), swap to `ImageUpload`.

**Image optimization on upload:**

- In `ImageUpload.handleFileUpload` and `CMSMediaLibrary.handleUpload`, run client-side optimization before upload:
  - Use `browser-image-compression` (small lib) to resize max 1920px wide, convert to WebP, quality 0.82.
  - Skip if already <200KB and webp/avif.
- Stored filename uses `.webp` extension.

### 3. Autoblogging — Daily AI-generated post at 8 AM

**Edge function:** `supabase/functions/daily-blog-generator/index.ts`

- Uses Lovable AI Gateway (`google/gemini-3-flash-preview`) with web-grounded search via Perplexity (`PERPLEXITY_API_KEY` already not present — will need to either request it OR rely on Gemini-only with prompt-driven topic rotation).
- **Recommended path:** Add `PERPLEXITY_API_KEY` connector for real-time news lookup with citations. Topics rotate across: EdTech, cultural preservation, educational events, African family history, African heritage.
- Function flow:
  1. Pick today's topic (rotation by day-of-week).
  2. Query Perplexity `sonar-pro` for top-ranking recent stories on that topic.
  3. Pass results + citations to Gemini to write an engaging 600–900 word blog post in markdown with H2 sections, intro, takeaways, and a "Sources" list of citation URLs.
  4. Generate slug, excerpt (160 chars), meta_title (≤60), meta_description (≤160).
  5. Insert into `blog_posts` with `author_id = NULL`, status=`published`, `published_at = now()`. Author display name handled in next step.
- **Author name "Ehny":** Add a fallback in `BlogPost.tsx`/`Blog.tsx` rendering — if `author_id` is null OR a special `is_auto = true` flag, show "Ehny". Migration adds `author_name text` column to `blog_posts` (nullable) so we can store "Ehny" directly without coupling to a profile.

**Cron schedule:** `pg_cron` job at `0 8 * * *` (server TZ — verify) invokes the edge function via `pg_net`.

### 4. SEO — Site-wide improvements

- `**react-helmet-async**` wrapper component `src/components/SEO.tsx` (title, meta description, canonical, OG, Twitter, JSON-LD).
- Apply on all public pages: Home, About, Services, ServiceDetail, Events, EventDetail, Innovations, InnovationDetail, Blog, BlogPost, Careers, Contact, Gallery.
- Single H1 audit per page.
- Add JSON-LD:
  - `Organization` on Home.
  - `Article` on BlogPost (with author Ehny, datePublished, image).
  - `Event` on EventDetail.
  - `JobPosting` on individual job pages.
- `public/sitemap.xml` — generate from DB at build via small Node script, or dynamic edge function `sitemap`. Simpler: dynamic edge function returning sitemap of public routes + blog slugs + event slugs.
- `public/robots.txt` already exists — add `Sitemap:` line.
- `public/llms.txt` — add per ai-readiness guidelines.
- Add `alt` text audit on hero/blog images.
- `index.html` defaults — update title/description if still generic.

### Technical notes

- Migration: add `blog_posts.author_name text`.
- Secret needed: **Perplexity API key** for grounded news lookup (alternative: skip Perplexity and use Gemini with a generic "recent topic" prompt — less factual, no real citations).
- `react-helmet-async`, `browser-image-compression` will be added via bun.

### Question before I start

1. **Perplexity for autoblogging** — OK to request the `PERPLEXITY_API_KEY` so the bot can fetch real, citeable news? Otherwise I'll fall back to Gemini-only (citations will be limited/synthetic). Answer: use gemini only
2. **Image optimization** — OK with converting uploaded images to **WebP** (better compression, supported in all modern browsers)? Existing PNGs/JPGs in the bucket stay as-is. Answer: Yes