## Scope

Three deliverables:
1. Employee Dashboard — action checklist + grouped workspace
2. Employee Management — linked-user picker UI
3. Form Submissions — analytics dashboard + admin-controlled visibility

---

## 1. Employee Dashboard redesign (`src/pages/EmployeeDashboard.tsx`)

**Action Checklist card** (top, after welcome banner) showing:
- Overdue activity form submissions (query `activity_forms` user can access vs. latest `activity_form_submissions` for current period)
- Profile completion gaps (missing avatar, bank details, phone, birthday)
- Unread inbox messages (existing query)
- Pending offers / contracts to sign (if `contracts.signed_at IS NULL` for the user's applications)

Each item: icon + label + "Take action" button → navigates to relevant page. Empty state: "You're all caught up 🎉".

**Grouped workspace** — replace flat 10-tile grid with 4 labeled sections:
- **My Work** — Daily Tracker, Activity Report, My Payslips, Finance
- **Communication** — Inbox, Suggestions
- **Career** — My Profile, Job Openings
- **Resources** — Knowledge Base, Employee Support

Same tile component, just grouped under `<h3>` headings.

---

## 2. EmployeeManagement linked-user picker (`src/pages/EmployeeManagement.tsx`)

In the Add/Edit Employee dialog, add a **"Linked user account"** select:
- Lists profiles where `user_roles.role IN ('employee','admin')`, showing `full_name (email)`
- "— Not linked —" option
- Pre-selected from `employee.user_id`
- On save, write `user_id` and `profile_id` to the row

In the Employees table, add a **"Linked User"** column showing the linked profile's name with a small badge ("Linked" / "Not linked"), plus a quick "Link…" button on unlinked rows that opens the same picker.

---

## 3. Form Submission Analytics + Visibility controls

### Database (single migration)

```sql
-- Per-form analytics visibility config
ALTER TABLE public.activity_forms
  ADD COLUMN analytics_employee_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN analytics_visible_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN analytics_visible_to_submitter boolean NOT NULL DEFAULT true;
```

- `analytics_employee_visible` — if true, assigned employees can see the analytics page (aggregated, anonymized)
- `analytics_visible_fields` — array of `field_key`s admins allow employees to see in charts
- `analytics_visible_to_submitter` — submitter always sees their own history charts (default on)

No new RLS needed — existing `user_can_access_form` already gates form/field reads. Submissions read policy already lets submitters see their own; admins/managers see all. For employee aggregate access, we'll filter client-side based on `analytics_employee_visible`.

### New page: `src/pages/cms/CMSFormAnalytics.tsx`

Route: `/cms/activity-forms/:id/analytics` (admin/manager).

Sections:
- **Summary KPIs**: total submissions, unique submitters, submission rate vs. assigned users, on-time vs. late, last 7/30 days
- **Submissions over time** — line chart (recharts) by day/week
- **Per-field breakdowns** — automatic chart per field:
  - `select` / `radio` / `multiselect` / `checkbox` (with options) → bar/pie of counts
  - `number` → histogram + avg/min/max KPI cards
  - `rating` → average + distribution bar
  - `date` → timeline
  - `text` / `textarea` → top word cloud or just count + sample list
  - `file` / `signature` / skip `page_break` / `section`
- **Top submitters** — table with submission counts
- **Filters**: date range, period, submitter

**Visibility controls panel** (admin only, top of analytics page):
- Toggle: "Allow assigned employees to view this analytics page"
- Toggle: "Allow submitters to view their personal analytics"
- Multi-select: "Fields visible to employees" (for shared aggregate charts)
- Save button → updates `activity_forms`

### Employee-side analytics

- New tile in Activity Report (`src/pages/employee/ActivityReport.tsx`): each assigned form gets a **"View analytics"** link if `analytics_visible_to_submitter` (personal) or `analytics_employee_visible` (team aggregate).
- Route: `/activity-report/:formId/analytics` — same component as CMSFormAnalytics in **read-only mode**, filtered to `analytics_visible_fields` and (for non-admin) excluding "Top submitters" PII unless admin allows.

### Wiring

- Add "Analytics" button next to "Submissions" in `CMSActivityForms.tsx` form list.
- Add "Analytics" button in `CMSFormSubmissions.tsx` header.
- Add Analytics link in employee `ActivityReport.tsx` per form.
- Register both routes in `src/App.tsx`.

### Tech notes

- Use `recharts` (already in `package.json` via shadcn chart).
- All aggregation client-side from already-fetched `activity_form_submissions.answers` JSONB — no RPC needed for v1.
- Reuse `db` from `@/lib/supabase-db` for new columns until types regenerate.

---

## Files

**Create:**
- `supabase/migrations/<ts>_form_analytics_visibility.sql`
- `src/pages/cms/CMSFormAnalytics.tsx`
- `src/components/forms/FormAnalyticsView.tsx` (shared admin/employee view)

**Edit:**
- `src/pages/EmployeeDashboard.tsx`
- `src/pages/EmployeeManagement.tsx`
- `src/pages/cms/CMSActivityForms.tsx`
- `src/pages/cms/CMSFormSubmissions.tsx`
- `src/pages/employee/ActivityReport.tsx`
- `src/App.tsx`
