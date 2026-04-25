## Plan: Employee Approval Flow, Expanded Registration, Personalized Employee Dashboard

### Part 1: Database changes

**Migration adds to `profiles`:**

- `approval_status` text default `'pending'` (values: `pending`, `approved`, `rejected`)
- `passcode_acknowledged` boolean default `false` (true after employee has viewed access code modal)
- `birthday` date
- `gender` text
- `position_id` uuid (FK to new `positions` table)
- `employment_start_date` date
- `department_id` uuid (FK to new `departments` table)
- `project_id` uuid (FK to new `projects` table)
- `team_id` uuid (FK to new `teams` table)
- `employee_id` text (unique)
- `phone` text

**New CMS lookup tables** (admin-managed, all employees can read):

- `positions` (id, name, description, is_active, display_order, created_at)
- `departments` (id, name, description, is_active, display_order, created_at)
- `projects` (id, name, description, is_active, display_order, created_at)
- `teams` (id, name, department_id, description, is_active, display_order, created_at)

RLS: Admins manage; authenticated users read. Seed each with a few defaults (e.g. "General", "Operations").

**Update `handle_new_user` trigger:** for `employee` role, set `approval_status = 'pending'` and keep passcode placeholder `00000000`. Generate a real 8-digit passcode only on admin approval.

### Part 2: Auth flow changes (`src/pages/Auth.tsx`)

**Signup (employee):**

- Expand form to include: birthday (date), gender (select), position (select from `positions`), department (select), project (select), team (select), employment start date, employee ID, phone. All mandatory except phone & employee ID (auto-generated if blank).
- On submit: create auth user with metadata; trigger creates profile row; after signup, `UPDATE profiles` with the extra fields (or pass via metadata for trigger to insert). Sign out and show: "Account created. Awaiting admin approval — you'll be notified by email when approved."

**Login (employee):**

- Step 1: email + password (unchanged).
- After `signInWithPassword` succeeds, fetch `profiles.approval_status` + `passcode_acknowledged` + `passcode`.
  - If `approval_status = 'pending'` → sign out, show "Pending admin approval".
  - If `approval_status = 'rejected'` → sign out, show rejection message.
  - If `approval_status = 'approved'` AND `passcode_acknowledged = false` → **skip passcode step**, navigate to `/dashboard` with state to open the **AccessCodeModal**.
  - Otherwise → show passcode step (existing behavior).

**Access Code Modal (`src/components/AccessCodeModal.tsx` — new):**

- Shown once after first login post-approval.
- Displays passcode masked (`••••••••`) with "Show" toggle (eye icon).
- Warning text: "Write this access code down and keep it private. You will need it for every future login. No one — not even an administrator — has the right to ask you for this code."
- Confirm button "I have written it down" → sets `passcode_acknowledged = true`, closes modal.
- Cannot be dismissed by clicking outside or pressing Escape.

### Part 3: Admin approval UI (`src/pages/UserManagement.tsx`)

- Add "Approval Status" column and a "Pending Approvals" filter/tab.
- Each pending employee row gets **Approve** / **Reject** buttons.
- Approve action (via `update-user` edge function or new `approve-user` function): generates 8-digit passcode, sets `approval_status='approved'`, writes passcode to profile, assigns role-template capabilities for `employee`.
- Admin can edit employee profile fields (birthday, position, department, etc.) inline in the user edit dialog — both before and after approval.

### Part 4: CMS pages for lookups

New CMS pages (linked from existing `/cms` dashboard under "Workforce Setup" section):

- `/cms/positions` → CRUD list for positions
- `/cms/departments` → CRUD list for departments
- `/cms/projects` → CRUD list for projects
- `/cms/teams` → CRUD list for teams (with department picker)

Each follows the existing CMS table+dialog pattern.

### Part 5: Employee dashboard (personalized)

`**src/pages/Index.tsx`:** when `role === 'employee'` (and not admin), render new `<EmployeeDashboard />` instead of the financial admin dashboard.

`**src/pages/EmployeeDashboard.tsx` — new component** with welcome card, quick stats (My Pending Tasks, Unread Messages, Open Jobs), and quick action buttons to: My Profile, Daily Tracker, Job Openings, Inbox, plus skeleton links to: My Invoices, Activity Report, Finance, Suggestion Box, Knowledge Base, Employee Support.

### Part 6: Sidebar restriction (`src/components/DashboardLayout.tsx`)

Replace flat capability-only filtering with role-aware sections:

- **Admin role:** sees all current sections.
- **Employee role:** only "General" group (Dashboard, My Profile) + "Employee" group with: Daily Tracker, Job Openings, Inbox, My Invoices, Activity Report, Finance, Suggestions, Knowledge Base, Employee Support.
- **Candidate role:** unchanged.

### Part 7: Skeleton pages (employee-only routes)

Create minimal stub pages (DashboardLayout + "Coming soon" card with title and short description) and add routes in `App.tsx`:

- `src/pages/employee/MyInvoices.tsx` → `/my-invoices`
- `src/pages/employee/ActivityReport.tsx` → `/activity-report`
- `src/pages/employee/Finance.tsx` → `/my-finance`
- `src/pages/employee/Suggestions.tsx` → `/suggestions`
- `src/pages/employee/KnowledgeBase.tsx` → `/knowledge-base`
- `src/pages/employee/Support.tsx` → `/employee-support`

Daily Tracker (`src/pages/DailyTracker.tsx`) already exists — verify it filters `daily_transactions` by `created_by = user.id` for non-admins (read RLS already enforces this; just ensure UI doesn't show admin-only controls).

### Part 8: Profile page (`src/pages/Profile.tsx`)

Extend existing profile page so the employee can view & edit all the new fields (birthday, gender, position, department, project, team, employment start date, employee ID, phone) — using the same select dropdowns sourced from the CMS lookup tables.

### Files Changed


| File                                             | Change                                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| New migration                                    | Add columns to `profiles`; create `positions`, `departments`, `projects`, `teams` tables with RLS; update `handle_new_user` trigger |
| `src/pages/Auth.tsx`                             | Expanded signup form; new approval-aware login flow; show AccessCodeModal trigger                                                   |
| `src/components/AccessCodeModal.tsx` (new)       | One-time passcode display modal                                                                                                     |
| `src/pages/UserManagement.tsx`                   | Pending approval column, Approve/Reject actions, expanded edit dialog                                                               |
| `supabase/functions/approve-user/index.ts` (new) | Generates passcode + sets approval_status                                                                                           |
| `src/pages/cms/CMSPositions.tsx` (new)           | Manage positions                                                                                                                    |
| `src/pages/cms/CMSDepartments.tsx` (new)         | Manage departments                                                                                                                  |
| `src/pages/cms/CMSProjects.tsx` (new)            | Manage projects                                                                                                                     |
| `src/pages/cms/CMSTeams.tsx` (new)               | Manage teams                                                                                                                        |
| `src/pages/cms/CMSDashboard.tsx`                 | Add "Workforce Setup" section with new CMS links                                                                                    |
| `src/pages/EmployeeDashboard.tsx` (new)          | Personalized employee landing                                                                                                       |
| `src/pages/Index.tsx`                            | Route employees to EmployeeDashboard                                                                                                |
| `src/components/DashboardLayout.tsx`             | Role-aware nav sections                                                                                                             |
| `src/pages/employee/*.tsx` (6 new)               | Skeleton pages                                                                                                                      |
| `src/pages/Profile.tsx`                          | Add new editable fields with CMS dropdowns                                                                                          |
| `src/App.tsx`                                    | Register new routes                                                                                                                 |


### Open assumption

I'm assuming the **employee should auto-approve themselves into the dashboard immediately after the AccessCodeModal closes** (i.e. they're now a fully logged-in employee on first post-approval login, and on every future login they go through the normal passcode step). That matches your wording — confirm if you want a different flow.  
  
Yes, your assumption is right