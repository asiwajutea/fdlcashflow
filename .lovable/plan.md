## Findings: [dakintuyi@gmail.com](mailto:dakintuyi@gmail.com) linkage

I queried the database directly. The employee record for **Temidayo Ehny Akintuyi** (`FDLC-201901-001`) is correctly linked to that user (`user_id` and `profile_id` both set). However, there are **0 invoices and 0 advance requests** in the database for this employee/user. So the "blank" state is correct — there simply isn't any historical data tied to this employee record.

Two likely causes:

1. Past payslips for this person were generated under a **different** employee row (the only other "Akintuyi" row is `Halimat Kikelomo Akintuyi` / `FDLC-2023-002`, which has no email/user link — unlikely the same person).
2. No payslips were ever issued for this person yet.

I'll add a small affordance for admins to **merge/transfer** historical payslips from a stale employee row into the linked one — but only if you confirm there is actually an older employee row whose payslips belong to Temidayo. Otherwise nothing's broken.

## New features

### 1. Finance page — PDF & Excel exports

Add an **Export** dropdown (top-right of Finance page) with four actions:

- Weekly report (PDF)
- Weekly report (Excel)
- Monthly report (PDF)
- Monthly report (Excel)

Reports include: period header, salary income, advances/reimbursements (grouped by status), category breakdown, net position, and budget usage. Excel uses `xlsx` (already used elsewhere); PDF uses `jspdf` + `jspdf-autotable`.

Scope:

- Personal report for every user (their own ledger + own requests + own budgets).
- Approvers/admins additionally get a "Team/All" toggle in the dialog to export team-wide totals.

### 2. Pre-submit budget validation in the New Request dialog

Currently the form silently allows over-budget submissions. Enhancements:

- Show a live **"Used X of Y this month • Z remaining"** line under the Amount field, pulled from `useMyBudgets` for the matching budget (kind + category).
- When `amount + used > limit`, show an inline **amber soft-warning alert**: "This exceeds your monthly limit by ₦N. You can still submit — your approver will see the overage."
- Add a **confirmation checkbox** ("I understand this exceeds my limit") that must be ticked before Submit is enabled when over-budget.
- Approval rule unchanged (soft warning per existing memory).

### 3. Approval workflow UI — timeline & history

Today each request only stores latest `status`, `approver_id`, `approver_note`, `decided_at`. To support a real timeline:

**DB migration** — new table `advance_request_events`:

- `id`, `request_id` (fk), `actor_id`, `event_type` (`submitted` / `approved` / `rejected` / `note_added` / `repaid`), `note`, `created_at`
- RLS: request owner, approvers, admins, and request owner's leaders can read; approvers/admins/owner can insert.

**Backfill**: insert a `submitted` event for every existing request and `approved`/`rejected` events for rows that have `decided_at`.

**UI changes**:

- New **"View timeline"** button (clock icon) on each request row in *My Requests* and *Approvals* tabs.
- Opens a side sheet showing a vertical timeline: Submitted → Pending → Approved/Rejected → Repaid, with actor name, timestamp, and any note at each step.
- Approver actions in the Approvals tab automatically insert a new event row.
- Status badge in tables gets a clearer color set: pending=amber, approved=green, rejected=red, repaid=blue.

## Files

**New**

- `src/lib/financeExports.ts` — PDF (jspdf) + Excel (xlsx) generators.
- `src/components/finance/ExportMenu.tsx` — dropdown trigger + period/scope dialog.
- `src/components/finance/RequestTimeline.tsx` — sheet with vertical timeline.
- `src/hooks/useRequestEvents.ts` — fetch + insert events.
- `supabase/migrations/<ts>_advance_request_events.sql` — new table, RLS, backfill.

**Edited**

- `src/pages/employee/Finance.tsx` — mount `ExportMenu`, integrate timeline button in Requests & Approvals lists, add live budget meter + soft-warning + confirm checkbox in `RequestsList` dialog, log event on approver decide.
- `src/hooks/useAdvanceRequests.ts` — `decide` mutation also inserts an event; `create` mutation inserts a `submitted` event.

**Dependencies**: add `jspdf`, `jspdf-autotable` (xlsx already present via other exports — will verify and add if missing).

## Clarifying question

Should I also add the **admin "merge payslips into linked employee"** tool for the Temidayo case, or do you want to confirm first whether older payslips for that person actually exist under a different employee row? If you can give me an employee ID/name where his old payslips live, I can include a one-click reassign in this same change.  
  
Skip Temidayo's case and let me decide that later