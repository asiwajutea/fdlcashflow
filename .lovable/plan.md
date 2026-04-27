## Plan: Multi-Step Signup + Full Knowledge Base

### Part 1: Multi-Step Signup Form

**File:** `src/pages/Auth.tsx` (rewrite signup tab only)

Convert the long signup into a stepper with progress indicator. Steps for **Employee**:

1. **Account** — Sign up type, Full Name, Email, Password, Confirm Password
2. **Personal Info** — Birthday*, Gender*, Phone* (now mandatory)
3. **Work Details** — Position*, Department*, Project*, Team (optional), Employment Start Date (optional), Employee ID (optional)
4. **Documents (optional)** — CV upload, ID Card upload, with "Skip — upload later from Profile" option

For **Candidate**: collapses to a single step (Account only) since the rest doesn't apply.

**UI:**
- Progress bar with numbered step pills (1 Account → 2 Personal → 3 Work → 4 Documents)
- "Back" / "Next" buttons; "Create Account" only on final step
- Per-step validation before advancing
- Section heading at top of each step

**Validation changes:**
- Remove mandatory: `team_id`, `employment_start_date`
- Add mandatory: `phone`
- Documents step: never mandatory

**File uploads (signup-time):**
- Files held in component state during signup
- After `signUp` succeeds, upload to existing `resumes` bucket (CV) and a new `documents` bucket (ID), keyed by `${user.id}/cv.{ext}` and `${user.id}/id-card.{ext}`
- Save URLs to new `profiles.cv_url` and `profiles.id_card_url` columns
- If signup fails or user skips, no upload happens — they can do it from Profile later

**Profile page additions** (`src/pages/Profile.tsx`):
- Add "Documents" section with CV and ID Card uploaders
- Show currently uploaded file (link + replace button) or upload button if missing

---

### Part 2: Knowledge Base

A searchable, department-aware, admin-managed knowledge hub.

**Database (new migration):**

```sql
-- Categories (e.g., HR, IT, Finance, Field Operations, Onboarding)
create table public.kb_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text default '',
  icon text default 'BookOpen',  -- lucide icon name
  display_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Articles
create table public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category_id uuid references public.kb_categories(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null, -- optional dept scope; null = all
  summary text default '',
  body text default '',           -- markdown / rich text
  tags jsonb default '[]'::jsonb,
  cover_image text default '',
  attachments jsonb default '[]'::jsonb,
  status text default 'draft',    -- draft | published
  view_count int default 0,
  is_pinned boolean default false,
  created_by uuid,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index kb_articles_search_idx on public.kb_articles
  using gin (to_tsvector('english', title || ' ' || summary || ' ' || body));
```

**RLS:**
- `kb_categories`: admins manage; all authenticated read active
- `kb_articles`: admins (and users with new `manage_knowledge_base` capability) manage; authenticated read where `status='published'` AND (`department_id` is null OR matches user's `profiles.department_id`)

**New capability:** `manage_knowledge_base` (added to capability registry so admins can grant it to specific employees, e.g. dept leads).

**Storage bucket:** `kb-attachments` (public read) for cover images and attachments.

---

**Employee-facing page:** `src/pages/employee/KnowledgeBase.tsx` (rewrite)

Layout (modeled on Notion / Intercom Help):
- **Hero search bar** at top (large, centered) — smart search with debounced full-text query against `kb_articles` (title, summary, body, tags). Shows live result dropdown as user types.
- **Category grid** below — cards for each `kb_category` with icon, name, article count
- **"Pinned / Featured"** row — articles with `is_pinned = true`
- **"Recently updated"** list
- **Department filter** chip — auto-filters to user's department + global (toggle to "All")
- Click article → detail view at `/knowledge-base/:slug` rendering markdown, with "Was this helpful?" feedback (future), back link, related articles by tag
- Increment `view_count` on article open

**Smart search behavior:**
- Debounced 250ms
- Postgres full-text using the GIN index (`websearch_to_tsquery`)
- Falls back to `ilike` on title for short queries (<3 chars)
- Highlights matched terms in result snippets
- Keyboard navigable (↑/↓/Enter)

**Admin pages:**
- `src/pages/cms/CMSKnowledgeBase.tsx` — list, create, edit, delete articles. Filters by category, status, department. Markdown editor (textarea with preview tab — keep it simple, no new deps).
- `src/pages/cms/CMSKBCategories.tsx` — manage categories (reuses `LookupCMSPage` pattern with extra `icon` field)
- Add both to CMS Dashboard tiles
- Add `/knowledge-base` route + `/knowledge-base/:slug` route in `App.tsx`
- Add "Knowledge Base" entry under Administration nav (visible to admins + holders of `manage_knowledge_base`)
- Employee nav link to `/knowledge-base` already wired

---

### Files Created
- `supabase/migrations/<ts>_kb_and_profile_docs.sql` — kb tables, RLS, indexes; adds `profiles.cv_url`, `profiles.id_card_url`; creates `documents` and `kb-attachments` storage buckets
- `src/pages/employee/KnowledgeBase.tsx` (replaces stub)
- `src/pages/employee/KnowledgeBaseArticle.tsx` (article detail)
- `src/pages/cms/CMSKnowledgeBase.tsx`
- `src/pages/cms/CMSKBCategories.tsx`
- `src/components/SignupStepper.tsx` (small progress UI)

### Files Edited
- `src/pages/Auth.tsx` — multi-step signup, validation changes, optional doc uploads
- `src/pages/Profile.tsx` — add Documents section (CV + ID Card)
- `src/App.tsx` — register new routes
- `src/components/DashboardLayout.tsx` — add KB nav entry
- `src/pages/cms/CMSDashboard.tsx` — add KB tiles
- `src/hooks/useCapabilities.tsx` — register `manage_knowledge_base` capability
