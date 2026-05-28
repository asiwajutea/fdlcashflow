## 1. Gallery lightbox — prev/next/swipe/slideshow (`src/pages/public/Gallery.tsx`)

- Replace `lightboxImage: string | null` with `lightboxIndex: number | null` over the `filtered` array.
- Controls: Prev / Next chevron buttons, `current / total` counter, optional caption.
- Keyboard: `ArrowLeft` / `ArrowRight` navigate, `Esc` closes.
- Touch swipe: `onTouchStart` records `clientX`; `onTouchEnd` compares delta (>50px) to advance / go back.
- Slideshow: Play/Pause toggle that auto-advances every 4 s; pauses on hover (`onMouseEnter`) and on touch.
- Index wraps: `(i + total) % total`.

## 2. Daily blog generator — prompt + robust image parser (`supabase/functions/daily-blog-generator/index.ts`)

- Prompt update: remove the "final `<h2>Sources</h2>` followed by `<ul>`…" instruction. Add: "Do NOT include a Sources section, source links, or `<h2>Sources</h2>` block inside the body. Return sources ONLY in the JSON `sources` array."
- Server-side cleanup: regex strip any trailing `<h2>\s*Sources?\s*</h2>[\s\S]*$` block from `parsed.body` before insert.
- Robust image parser in `generateImage`:
  - Try multiple shapes: `message.images[0].image_url.url`, `message.images[0].url`, `message.content` parts where `type === 'image_url'`, top-level `data[0].b64_json`.
  - On empty/failed flash response, fallback to `google/gemini-3-pro-image-preview` with same payload.
  - Log full response shape (`JSON.stringify(json).slice(0, 800)`) on failure to verify in edge logs.
  - Strip data URL prefix robustly (`data:image/...;base64,`).

## 3. Careers mobile audit (`src/pages/public/Careers.tsx`)

Findings: the openings list already uses `space-y-4`; the real mobile issue is each job `Card` has `flex flex-col sm:flex-row` but the inner `flex items-start gap-4` with the avatar tile is fine. The "Why Join Us" connector line uses `hidden lg:block` (OK). Fixes:

- Ensure intro `<h2>` and "Open Positions" heading don't get clipped on narrow screens (currently `text-3xl md:text-4xl lg:text-5xl` — keep, but ensure `leading-tight`).
- "Apply Now" Button: add `w-full sm:w-auto` so it doesn't crowd on mobile.
- Wrap job meta row with `min-w-0` and add `break-words` so long titles/departments don't push layout.
- Drop `opacity-0` baseline on the intro / grid sections (same IO bug as detail pages) so content renders even when observer doesn't fire.
- Empty state already present — keep, add a "Contact us" link button under it.

## 4. Employee Dashboard — personalized, mobile-first rebuild (`src/pages/EmployeeDashboard.tsx`)

Replace the current layout with a mobile-first structure (still using existing data fetches + `WORKSPACE_GROUPS`).

```text
[ Sticky header card ]
  avatar + "Welcome, {first}"     |  Date pill
  Role · Department · Position · Team chips
  Employee ID badge

[ Quick stats — grid 2 / sm 2 / lg 4 ]
  Pending forms · Unread inbox · Open jobs · Today

[ Action Required list ]   (existing logic)

[ Quick actions — icon tiles, grid 2 / sm 3 / lg 6 ]
  Daily Tracker · Activity · Inbox · Payslips · Profile · KB

[ Workspace groups ]       (existing, restyled)
[ Leader entry ]           (if isLeader)
```

- New lightweight hook `useEmployeeContext()` (inline in file or `src/hooks/useEmployeeContext.ts`): one query joining `profiles` → `positions(name)`, `departments(name)`, `teams(name)`, `projects(name)` for current user; returns `{ employeeId, positionName, departmentName, teamName, projectName }`.
- Header card uses gradient `from-[hsl(214,95%,12%)] to-brand-red-orange/20` (semantic-token equivalents), white text, mobile padding `p-4 sm:p-6`.
- Quick-action tiles are square-ish (`aspect-[4/3] sm:aspect-square`), icon-first, label below.
- All containers `p-4 sm:p-6 lg:p-8`, `gap-4`, no fixed widths.

## 5. Employee Profile ↔ Employees record two-way sync + backfill

**Schema/Trigger (migration)**
- Add Postgres trigger `trg_sync_profile_to_employee` on `profiles` AFTER UPDATE: when a row changes, update the matching `employees` row by `user_id` with `full_name`, `bank_name`, `account_number`, `email` (from `auth.users`), and `designation` (from `positions.name` via `position_id`).
- Add Postgres trigger `trg_sync_employee_to_profile` on `employees` AFTER UPDATE: when bank fields / full_name change, mirror back into linked `profiles` row by `user_id`.
- Guard both triggers with a `pg_trigger_depth() < 1` check to avoid infinite recursion.

**Profile page (`Profile.tsx`)**
- On load, if `profile.bank_name`/`account_number`/`account_name` are empty but a linked `employees` row exists for the user, prefill from `employees` (autofill behavior the user asked for).
- Keep current employee-sync on save (already updates `full_name`, `bank_name`, `account_number`).
- Show a small "Synced from your employee record" note when prefilled.

**Employees CMS page** — refresh on focus / realtime subscribe to `employees` so admin sees the updates flow through immediately (light change).

**One-shot backfill (migration UPDATE)**
- For every `employees` row with `user_id IS NOT NULL`:
  - Copy `profiles.bank_name`, `profiles.account_number`, `profiles.full_name`, `profiles.phone` into `employees` when the profile value is non-empty and the employee value is empty/null.
  - Copy back from `employees` into `profiles` for the same fields when profile is empty and employee has data (covers Samuel's case where bank was entered in profile but not propagated and vice versa).
- Also set `employees.designation` from `positions.name` via `profiles.position_id` when empty.

## Technical notes

- New migrations:
  1. `sync_profile_employee` triggers (both directions, recursion-guarded).
  2. One-shot backfill `UPDATE` statements.
- No new tables. No new routes.
- Files touched: `Gallery.tsx`, `Careers.tsx`, `EmployeeDashboard.tsx`, `Profile.tsx`, `daily-blog-generator/index.ts`, (optional) `CMSEmployees`-equivalent page for realtime refresh.
- Continue using `db` (`@/lib/supabase-db`) where types lag.
