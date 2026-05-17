## 1. Blog post page — content not visible

In `src/pages/public/BlogPost.tsx`, the content block uses `opacity-0` until an IntersectionObserver flips it to `animate-fade-up`. The body HTML is in the DB (5.4KB), so the issue is the fade wrapper hiding it on first paint / when the observer misses. Fix:

- Remove the `opacity-0` gate on the main content section (keep animations only for non-essential decoration).
- Keep `dangerouslySetInnerHTML={{ __html: post.body }}` but ensure the wrapper has explicit `text-foreground` / readable prose color (currently `text-muted-foreground` on bg-card can look near-empty).
- Render `post.tags` and a "Sources" section from `post.sources` (JSONB) below the body when present.

## 2. AI auto-generated blog post image

Update `supabase/functions/daily-blog-generator/index.ts`:

- After generating the post JSON, call the Lovable AI Gateway image model `google/gemini-3-flash-image-preview` with a prompt derived from the post title + topic ("editorial hero image, African heritage / EdTech theme, cinematic, no text").
- Decode the returned base64 image and upload to the existing `cms-media` storage bucket as `auto-blog/<slug>-<timestamp>.png`.
- Save the public URL into `blog_posts.featured_image` on insert.
- Fallback: if image generation fails, leave `featured_image` null and proceed (post still publishes).

## 3. Blog CMS — countdown to next auto-post

In `src/pages/cms/CMSBlog.tsx`, add a small card at the top of the page:

- Computes time remaining until the next `08:00 UTC` (matches the existing `pg_cron` schedule `0 8 * * *`).
- Live ticks every second; shows `HH:MM:SS` plus the absolute date/time.
- Includes a "Generate now" button that invokes the `daily-blog-generator` edge function on demand (calls `supabase.functions.invoke`) and refreshes the list.

## 4. Blog categories — defaults + custom

- Migration: seed `blog_categories` with defaults if empty: `EdTech`, `Cultural Preservation`, `Education`, `Heritage`, `Events`, `Family History`, `Innovation`, `Community`. Idempotent insert via `ON CONFLICT (slug) DO NOTHING` (add unique index on slug if missing).
- In `CMSBlog.tsx` post dialog: keep the category `Select`, and add a "+ New category" item that opens a small inline input → inserts into `blog_categories` and auto-selects it. Show a toast on success.
- Also expose a "Manage categories" link to a lightweight modal that lists / renames / deletes categories.

## 5. About Us — broken image

In `src/pages/public/About.tsx` (line 77), replace the Unsplash placeholder used in the "From Vision to Impact" section with:

```
https://tdbtxqmutisakzduwkhb.supabase.co/storage/v1/object/public/cms-media/1775309515990-as1gd1zf35.jpg
```

Keep `alt="Young woman speaking at Footprints Dynasty event"`.

## 6. Founded year — count DOWN from current year to 2019

The shared `useCounter(end, duration, start)` only counts up. Add a `from` parameter (default 0) and animate from `from` → `end`.

- `src/pages/public/Home.tsx`: `useCounter(2019, 1500, inView, new Date().getFullYear())`.
- `src/pages/public/About.tsx`: same change.

This makes the number visibly tick down from 2026 → 2019.

## 7. Inbox — badge says 1 but list is empty

`DashboardLayout` counts every unread message where `recipient_id = user.id`. `Inbox.tsx` only lists root messages (`parent_message_id IS NULL`), so an unread *reply* inflates the badge but is hidden from the list (confirmed in DB: the unread row is a reply).

Fix `src/pages/Inbox.tsx`:

- Drop the `.is('parent_message_id', null)` filter on the inbox list so all received messages (including replies that arrive without the user opening the parent thread) appear.
- When selecting a row that has a `parent_message_id`, load the parent as the thread root so the existing reply view still works correctly.
- Alternatively (lighter touch), keep the list as roots but also include any root whose latest reply is unread, and mark the badge using the same query the list uses to keep them in sync.

I'll go with the first option (show replies as top-level rows when no parent is in the inbox) since users expect every unread item to be reachable.

## Technical notes

- New migration: seed `blog_categories` defaults + unique slug index.
- Edge function change deploys automatically; no schema change needed for images (uses existing `featured_image` column and `cms-media` bucket).
- No new dependencies.
