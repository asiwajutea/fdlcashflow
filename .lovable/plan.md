## Goal

Introduce a leadership hierarchy (department head, project lead, team lead, direct manager) and let those leaders see their downlines' activity-form submissions and analytics — with admin overrides for which forms each leader can or cannot see.

## Schema changes

1. Add leader columns:
   - `departments.head_user_id uuid` (references `profiles.id`, nullable)
   - `projects.lead_user_id uuid` (nullable)
   - `teams.lead_user_id uuid` (nullable)
   - `profiles.manager_id uuid` (direct manager — nullable, references `profiles.id`)

2. New table `activity_form_leader_overrides`:
   - `form_id uuid`, `user_id uuid`, `can_view boolean` (default true), unique `(form_id, user_id)`
   - Lets the admin explicitly grant or revoke a leader's access to a specific form's submissions/analytics, overriding the implicit hierarchy access.

3. New SQL helper `public.get_subordinate_user_ids(_user_id uuid) returns setof uuid`:
   - Recursive CTE collecting:
     - all `profiles` where `manager_id = _user_id` (transitive),
     - members of any `team` where `lead_user_id = _user_id`,
     - members of any `project` where `lead_user_id = _user_id`,
     - members of any `department` where `head_user_id = _user_id`.
   - Marked `security definer`, `stable`.

4. New SQL helper `public.user_can_view_form_submissions(_user_id uuid, _form_id uuid) returns boolean`:
   - Returns true if admin OR has `manage_activity_forms` capability OR is a leader (per `get_subordinate_user_ids` having ≥1 user assigned/submitting to the form) — unless an override row says `can_view = false`. An override row with `can_view = true` also explicitly grants access.

5. Update RLS on `activity_form_submissions`:
   - Replace the "Managers view all submissions" SELECT policy with one that also allows leaders via `user_can_view_form_submissions(auth.uid(), form_id) AND submission.user_id IN (select get_subordinate_user_ids(auth.uid()))`.
   - Keep self-view and admin/manager policies intact.

6. RLS on `activity_form_leader_overrides`: admin-only manage; authenticated read of own rows.

## CMS / UI changes

1. **Departments CMS** (`CMSDepartments` via `LookupCMSPage`): add a "Head of Department" user picker. Generalize `LookupCMSPage` to accept an optional `leaderField: { column, label }` and load eligible users (admin/employee profiles) for the Select.

2. **Projects CMS** (`CMSProjects`): add "Project Lead" user picker (same mechanism, `lead_user_id`).

3. **Teams CMS** (`CMSTeams`): add "Team Lead" user picker.

4. **EmployeeManagement page**: add "Direct Manager" Select in the Add/Edit Employee dialog, persisted to `profiles.manager_id` of the linked user. Show current manager in the table.

5. **UserManagement page**: in the user edit dialog, add a "Direct Manager" Select listing other admin/employee profiles; saves `profiles.manager_id`.

6. **CMSActivityFormBuilder**: add a "Leader access overrides" section. After the existing assignment editor, show a list of computed leaders for the form's audience (department heads, project leads, team leads, direct managers above any assignee). For each leader, a switch "Can view submissions & analytics" — saved as rows in `activity_form_leader_overrides`. Default state is ON (implicit access); toggling OFF writes `can_view=false`; toggling back ON deletes the override row (or upserts `can_view=true`).

7. **CMSFormAnalytics / CMSFormSubmissions**: no UI change — they just respect RLS so leaders see only their downlines' rows. Add a small banner indicating "Showing submissions from your team" when current user is a leader (not admin).

8. **EmployeeDashboard / new "My Team" entry**: add a card linking to `/team-reports` for users who lead anyone. Page lists forms with available submissions from their downlines and links to the existing analytics view (read-only mode).

## Frontend access logic

- Add a hook `useIsLeader()` that returns `{ isLeader: boolean, subordinateIds: string[] }` by calling a new RPC `get_my_subordinates`.
- Use it to conditionally show the "Team Reports" navigation entry.

## Technical section

- Migrations are additive; existing data is unaffected (`manager_id`, `head_user_id`, `lead_user_id` default null).
- `analytics_visible_fields` / `analytics_employee_visible` on `activity_forms` continue to govern *what fields* are visible; the new override governs *whether the leader sees anything* per form.
- `LookupCMSPage` change is backward-compatible — `leaderField` is optional.
- No edge-function changes required.
- Types file regenerates automatically after migration.

## Out of scope

- No changes to candidate/HR flows.
- No changes to the public site.
- Existing payslip/finance access rules remain unchanged.
