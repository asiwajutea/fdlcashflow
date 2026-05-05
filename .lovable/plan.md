## Plan

### 1. Activity Form Builder — UX fixes (`CMSActivityFormBuilder.tsx`, `FieldRenderer.tsx`)

**Options textarea bug**: Currently it's a controlled `Textarea` whose `onChange` immediately filters out empty/whitespace lines and rewrites the value. Pressing Enter creates an empty line which gets stripped on every keystroke — so newlines never persist and commas/spaces feel "blocked". Fix:
- Hold the raw textarea string in local component state per field; only parse to options on blur (or via a `useEffect` debounced sync). Splitting stays newline-only — commas, spaces, and symbols pass through untouched.
- Extract each field card into a small `<FieldEditor>` subcomponent so each field owns its own raw-text state. This also avoids re-render churn.

**Editable Step 1 label**: Today only `page_break` rows carry a `step_name`. The implicit first step has no editable name. Fix:
- Add a "Step 1 name" input on the Form Settings tab (stored on `activity_forms` as a new `first_step_name TEXT` column via migration), and pipe it into `computeSteps` as the name of the initial step.
- Show this input only once at least one `page_break` exists (i.e. when there are 2+ steps).

### 2. Signup page — lookups not loading (`Auth.tsx` + RLS migration)

Root cause: `positions`, `departments`, `projects`, `teams` SELECT policies only grant the `authenticated` role. The `/auth` page runs as anon, so the queries return zero rows silently. Migration:
- Add `SELECT` policies for `anon` on these four tables (active rows only): `USING (is_active = true)`. Safe — these are public reference values already exposed by the careers/jobs flow context.

### 3. Employee Dashboard restructure (`EmployeeDashboard.tsx`)

- Add an **Action List / Checklist** card at the top showing:
  - Overdue activity-form submissions (query `activity_forms` user can access vs `activity_form_submissions` for current period_key per frequency).
  - Missing profile fields (phone, birthday, gender, employee_id, position, department, bank info, ID card, CV).
  - Unread inbox messages.
  - Unsigned contracts / pending offers (if applicable).
  Each row links to the right page; show a count + "X items need attention" badge.
- **Group the workspace** by category instead of one flat 10-tile grid:
  - *My Work* — Daily Tracker, Activity Report, My Invoices, Finance.
  - *Communication* — Inbox, Suggestions/Complaints.
  - *Career* — Job Openings, Profile.
  - *Resources* — Knowledge Base, Employee Support.
  Each group rendered as its own subcard with a section heading and icon.

### 4. CMS Dashboard restructure (`CMSDashboard.tsx`)

Group the 19 cards into collapsible/labelled sections:
- **Public Website** — Hero Slides, Services, Events, Innovations, Blog, Gallery, Partners, Testimonials, Website Sections.
- **Workforce / Org Data** — Positions, Departments, Projects, Teams, Team Members.
- **Knowledge Base** — KB Articles, KB Categories.
- **Operations** — Activity Forms, Contact Submissions, Media Library.

Each section gets a heading + short description; cards stay as is.

### 5. Invoice ↔ Employee linking

**Goal**: an authenticated user can see invoices tied to their employee record, and employee records auto-create on signup.

DB migration:
- Add `employees.user_id UUID NULL` (no FK to `auth.users`; nullable to preserve existing rows).
- Add unique partial index on `(user_id) WHERE user_id IS NOT NULL`.
- Add `employees.profile_id UUID NULL` mirroring profile id (for join convenience).
- Backfill: for every existing `employees.email` matching an `auth.users.email`, set `user_id`.
- Update `handle_new_user()` trigger: when role is `employee`, also `INSERT INTO employees (user_id, employee_id, full_name, email, designation)` using metadata (skip if employee_id already exists; on conflict do nothing).
- Add RLS policy on `invoices`: allow SELECT when `employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())` (in addition to existing admin policy).

UI:
- `EmployeeManagement.tsx`: add a "Linked User" column; in the edit dialog, add a Select listing unlinked profiles to attach to this employee.
- `MyInvoices.tsx`: replace skeleton with real list — fetches invoices joined to the employee row whose `user_id = auth.uid()`. Reuse the existing invoice list card design.

### 6. Profile page redesign + bank details (`Profile.tsx`)

- Group fields into clear sections, each its own `<Card>`:
  1. **Identity** — avatar, full name, email, gender, birthday.
  2. **Contact** — phone.
  3. **Employment** — employee ID, employment start date, position, department, project, team.
  4. **Bank Details (NEW)** — bank name, account number, account name. On save, also upsert into the linked `employees` row (`bank_name`, `account_number`) so payslip generation stays accurate.
  5. **Documents** — CV, ID card.
- Migration: add `profiles.bank_name TEXT`, `profiles.account_number TEXT`, `profiles.account_name TEXT`.

### 7. "Add Job Position" capability gating

Currently `/jobs` only renders the create button when `role === 'admin'`. Adeolabunmi has the `add_job_position` capability but role `employee`, so the option is hidden.
- `Jobs.tsx`: replace `isAdmin` check for create/edit/delete with `role === 'admin' || hasCapability('add_job_position')`.
- `DashboardLayout.tsx` nav: add a "Job Positions" item under Administration with capability `add_job_position` so it appears in her menu.
- RLS on `job_positions`: extend admin-manage policy to `OR user_has_capability(auth.uid(), 'add_job_position')` for INSERT/UPDATE/DELETE.

### Migrations summary
1. RLS: anon SELECT on `positions/departments/projects/teams` (active only).
2. Schema: `activity_forms.first_step_name`, `employees.user_id`, `employees.profile_id`, `profiles.bank_name`, `profiles.account_number`, `profiles.account_name`.
3. Trigger update: `handle_new_user()` to insert into `employees`.
4. RLS: invoices SELECT for owning employee; job_positions manage via capability.
5. Backfill `employees.user_id` from email match.

### Files to edit
- `src/pages/cms/CMSActivityFormBuilder.tsx` (extract FieldEditor, raw-text state, step-1 name input)
- `src/components/forms/FieldRenderer.tsx` (`computeSteps` accepts initial name)
- `src/pages/Auth.tsx` (no code change needed — RLS fix handles it; add a friendly empty-state message if lists are empty)
- `src/pages/EmployeeDashboard.tsx` (action list + grouped workspace)
- `src/pages/cms/CMSDashboard.tsx` (sectioned layout)
- `src/pages/EmployeeManagement.tsx` (linked-user column + selector)
- `src/pages/employee/MyInvoices.tsx` (real listing)
- `src/pages/Profile.tsx` (sectioned redesign + bank fields, sync to employees)
- `src/pages/Jobs.tsx` (capability gating)
- `src/components/DashboardLayout.tsx` (nav entry for Job Positions)
- New SQL migrations as above
