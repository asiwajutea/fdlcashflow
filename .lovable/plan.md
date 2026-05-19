## 1. New signup behaviour

**Auto-login + "pending verification" screen**

- In `Auth.tsx`, after email-verification signup, do NOT block sign-in for employees. Update `handle_new_user` already creates a `profiles` row with `approval_status='pending'` for employees — keep it.
- After successful login, if `role === 'employee'` and `approval_status === 'pending'`, route to a new screen `/pending-approval` (do not sign user out).
- New `src/pages/PendingApproval.tsx`: warm screen explaining their account is awaiting admin verification, with cards inviting them to explore the public site (Home, About, Services, Events, Innovations, Blog). Includes "Sign out" + "Refresh status" buttons.
- Add a guard in `DashboardLayout`: if pending employee → redirect to `/pending-approval`. Lift when status flips to `approved`.

**New employee ID format `FDL-YYYYMM-NNN**`

- Migration: Postgres function `generate_employee_id()` that produces `FDL-` + `to_char(now(),'YYYYMM')` + `-` + zero-padded 3-digit monthly sequence (count of existing employees created this month + 1).
- Update `handle_new_user()` trigger so when an `employee_id` is not supplied in `raw_user_meta_data`, it calls `generate_employee_id()` instead of the current `EMP-<uuid8>` fallback. Same for the `employees` insert.
- Backfill is out of scope — only new signups use the new format.

## 2. Blog post fixes

**Hero image generation** (`daily-blog-generator`)

- The current path uses `gemini-3-flash-image-preview` via chat-completions and reads `message.images[0].image_url.url`. Gateway returns the image under `message.images[0].image_url.url` for that model, but base64-only responses sometimes come back under `images[0].url`. Make the parser robust and add fallback to `google/gemini-3-pro-image-preview` if the flash call returns no image. Log the response shape on failure so we can verify.
- Run a one-shot backfill: invoke the function once (or run a script in the function) to regenerate `featured_image` for the most recent posts that have an empty `featured_image`.

**Paragraph spacing + content rendering** (`BlogPost.tsx`)

- Wrap `dangerouslySetInnerHTML` in a Tailwind typography container: `prose prose-lg max-w-none prose-headings:font-bold prose-headings:mt-10 prose-headings:mb-4 prose-p:my-5 prose-p:leading-[1.8] prose-li:my-2 prose-h2:text-2xl prose-h3:text-xl prose-a:text-brand-red-orange`.
- Ensure `@tailwindcss/typography` plugin is enabled in `tailwind.config.ts` (add to plugins array if missing).

**Stop duplicating "Sources" inside the body**

- Update `daily-blog-generator` prompt: explicitly say "Do NOT include a Sources section or source links inside the body. Return sources ONLY in the JSON `sources` array." Remove the existing instruction that asks for an in-body `<h2>Sources</h2>`.
- Add a server-side cleanup step: regex strip a trailing `<h2>Sources?</h2>...` block from `parsed.body` before insert, in case the model still includes one.

**Comments on each post**

- Migration: `blog_comments` table — `id`, `post_id` (FK `blog_posts`), `user_id` (nullable for guests), `author_name`, `author_email`, `body`, `is_approved` (default true), `created_at`. RLS: anyone can SELECT approved rows; authenticated users can INSERT; admins can update/delete.
- `BlogPost.tsx`: add a "Comments" section below sources — list approved comments with name + relative time, and a compact form (name + email if guest, body). Auto-fills from session when signed in. Realtime subscribe so new comments appear instantly.

## 3. Service / Event / Innovation detail pages — blank content

Root cause: same `opacity-0 → animate-fade-up` pattern that hid the blog body. The IntersectionObserver doesn't fire reliably (especially with `threshold: 0.1`+ above the fold), leaving the entire content section invisible.

Fix in `ServiceDetail.tsx`, `EventDetail.tsx`, `InnovationDetail.tsx`:

- Remove the `opacity-0` gating from the main content section (keep animations decorative — start visible, optionally add `animate-fade-up` without the `opacity-0` baseline, or guard with `'animate-fade-up' : ''`).
- Keep the same fix for "more / related" sections only if they sit below the fold; if they're high on the page also drop the opacity gate.

## 4. Gallery lightbox — swipe + slideshow (`Gallery.tsx`)

- Replace the current single-image lightbox with a lightbox that:
  - Stores the active index.
  - Shows Prev / Next buttons + keyboard arrow / Esc handlers.
  - Adds touch swipe (left/right) via simple `onTouchStart` / `onTouchEnd` delta.
  - Adds a "Play slideshow" toggle that auto-advances every 4s and pauses on hover/touch.
  - Shows `current / total` counter + image caption.

## 5. Careers page mobile (`Careers.tsx`)

- Audit the openings list section — the current grid likely uses `md:grid-cols-...` but the wrapper hides on mobile or the cards collapse to zero height. Force `grid-cols-1` on mobile, ensure no `hidden md:block` wraps the list, and verify text colors render on light bg.
- Add an empty-state message when no openings instead of rendering nothing.

## 6. Inbox welcome message for new employees

- Migration: add `is_system` boolean and ensure messaging table allows admin-authored sends without RLS conflicts.
- Create edge function `send-welcome-message` (or extend `promote-candidate-to-employee` + signup flow): on profile creation for role=employee, insert a message into `messages` with `sender_id` = Temidayo's `auth.users.id` (looked up by email — store as a function constant or in `app_settings`), `recipient_id` = new user, subject "Welcome to Footprints Dynasty 🎉", warm personalized body that addresses them by `full_name`, mentions they have been verified to use the platform, and urges completing profile setup with a deep link (`/profile-setup`). Signed "Temidayo Ehny Akintuyi — PM | MD, Footprints Dynasty Ltd."
- Trigger via DB trigger on `profiles` insert (employees only) for reliability, calling `pg_net` to invoke the edge function, OR insert directly from the trigger using SQL if sender ID is known.

## 7. Employee dashboard — personalized + mobile-first (`EmployeeDashboard.tsx`)

- Rebuild as a mobile-first layout:
  - **Header card**: avatar + "Welcome back, {first name}", subtitle showing **role** + **department** + **position** + **team** (joined from `profiles`/`departments`/`positions`/`teams`). Gradient navy → orange accent.
  - **Quick stats** grid (1 col mobile, 2 col sm, 4 col lg): pending tasks, unread inbox, my requests this month, my budget remaining.
  - **Quick actions** (icon tiles): Daily Tracker, Submit Request, Knowledge Base, Inbox, My Payslips, Profile.
  - **Recent activity** feed (last 5 transactions + recent inbox messages).
  - Tailwind: `p-4 sm:p-6 lg:p-8`, sticky header, `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`, use semantic tokens only.
- Reuse `useAuth` for identity + a new lightweight `useEmployeeContext` hook that fetches department/position/team names in one query.

## Technical notes

- Migrations needed:
  1. `generate_employee_id()` function + `handle_new_user` update.
  2. `blog_comments` table + RLS.
  3. (Optional) welcome message trigger / function.
- New routes: `/pending-approval`.
- New components: `PendingApproval.tsx`, `BlogComments.tsx`, `EmployeeWelcomeHeader.tsx`, `EmployeeQuickActions.tsx`.
- Edge function: `send-welcome-message` (uses Temidayo's user id via lookup by email).
- Plugin: enable `@tailwindcss/typography` (already a common Lovable dep; install if missing).
- No breaking schema changes; new columns are additive.