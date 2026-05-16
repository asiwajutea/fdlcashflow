## 1. Leader Dashboard (`/team-reports`)

A new page accessible to anyone who leads at least one user (via `get_my_subordinates` RPC), summarizing their downline's financial and activity-report data.

**Route**: `/team-reports` (added in `src/App.tsx`, gated by `useIsLeader()` hook).

**Navigation entry**: Add "Team Reports" link in `EmployeeDashboard` + sidebar for users whose `get_my_subordinates()` returns ≥1 row. Admins also see it.

**Page layout** (`src/pages/TeamReports.tsx`):
- Header: "My Team Reports" + small subordinate count badge.
- Filter bar: date range (last 7/30/90 days, custom), optional subordinate dropdown ("All team members" / individual).
- **Top metric cards** (4): Total Income, Total Expenses, Net Balance, Submissions Count — aggregated across downline only.
- **Charts row**:
  - Income vs Expense line/area chart (reusing `useTransactionStats` logic).
  - Submissions per form bar chart (count of `activity_form_submissions` per `form_id`).
- **Tables**:
  - "Team members" table: name, role, department/team, # submissions, last submission date.
  - "Recent submissions" table: submitter, form title, submitted_at, link to view.
- Empty state if no subordinates / no data in range.

**Data source rules**: All queries are filtered server-side by RLS. We additionally pass `user_id IN (select user_id from get_my_subordinates())` in queries for:
- `daily_transactions` (income/expense aggregates)
- `weekly_data` (if income source)
- `activity_form_submissions` (counts + recent list)

No new RLS needed — existing policies (after the leader-hierarchy migration) already permit leaders to read their downline. We just constrain the query to subordinate ids client-side to scope the view.

**Reuse**:
- Pull from existing `useTransactions` hook with a filter param `userIds?: string[]`, or write a small `useTeamTransactions(subordinateIds, range)` hook.
- Reuse `FormAnalyticsView` in a compact mode for each top-form preview (optional, can defer).

## 2. User Management UI redesign (`src/pages/UserManagement.tsx`)

Goal: clean, scannable layout; tame the noisy "Approval" + "Passcode" columns shown in the screenshot.

**Changes (presentation only — no logic changes)**:

1. **Header strip**: Replace the back button row with a real page header — title "User Management" + subtitle "Approve, manage roles, and reset access codes" on the left; "Create User" button on the right.

2. **Stat tiles row** (4 small cards): Total Users, Pending Approval, Active, Inactive. Clicking a tile sets the status filter.

3. **Filter bar** below tiles:
   - Search input (name/email) — new, client-side filter.
   - Role filter dropdown — new.
   - Status filter (existing).
   - Remove the standalone red "1 pending" badge (now represented in the Pending tile).

4. **Pending approvals section** (only renders if any pending): a separate compact card titled "Pending Approvals" listing each pending user as a row with name/email/role + Approve / Reject buttons. This removes the cramped Approve/Reject buttons from the main table.

5. **Main users table** redesigned:
   - Columns: **User** (avatar + name + email stacked), **Role**, **Status** (single column merging account active + approval — color-coded chip), **Passcode** (compact: dots + single "actions" dropdown with View / Copy / Regenerate), **Manager**, **Actions** (Edit, Capabilities icons in a small ghost button group).
   - Removes redundant Approval column (pending users live in the section above; approved/rejected reflected in Status chip).
   - Row hover highlight, zebra striping via existing tokens, sticky header.
   - Empty state when filtered list is empty.

6. **Passcode UX**: collapse Eye / Copy / Regenerate into a `DropdownMenu` triggered by a single `MoreHorizontal` icon next to the masked code. Reduces visual clutter.

7. **Tabs styling**: keep Users / Role Templates tabs, but move them under the header so they look like proper page tabs (slightly larger, with border-bottom active state). No functional change.

All colors via semantic tokens (`bg-card`, `text-muted-foreground`, `bg-primary`, etc.). No raw hex.

## Technical Details

**Files created**
- `src/pages/TeamReports.tsx` — leader dashboard page.
- `src/hooks/useIsLeader.ts` — wraps `get_my_subordinates` RPC, returns `{ isLeader, subordinateIds, loading }`.
- `src/hooks/useTeamTransactions.ts` (optional) — fetches `daily_transactions` + `weekly_data` for given user ids and date range, returns aggregated stats matching `TransactionStats` shape so we can reuse `MetricCards`/`FinancialCharts` if desired.

**Files edited**
- `src/App.tsx` — register `/team-reports` route.
- `src/components/DashboardLayout.tsx` (or wherever sidebar lives) — conditional nav item using `useIsLeader`.
- `src/pages/EmployeeDashboard.tsx` — "My Team" card linking to `/team-reports` when `isLeader`.
- `src/pages/UserManagement.tsx` — UI restructure per section 2; no edge-function or RLS changes.

**No DB migration required.** All hierarchy functions, override tables, and RLS policies already exist from the previous migration.

**Out of scope**
- No changes to approve/reject, create-user, or update-user edge functions.
- No changes to RLS policies.
- No changes to public site or candidate flows.
- Per-form drill-down inside team reports beyond a link to existing `FormAnalyticsView` (kept light; can expand later).
