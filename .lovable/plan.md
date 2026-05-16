## 1. Fix capability access bug

**Problem:** Routes like `/daily-tracker`, `/transactions`, etc. are only hidden in the sidebar — the page components don't check capabilities, so removed users can still navigate directly via URL.

**Fix:** Add a `<CapabilityGuard requires="...">` wrapper component (mirrors `AvatarGuard`). It reads `useCapabilities(user.id)`, and if the capability is missing (and user isn't admin), redirects to `/dashboard` with a toast. Wrap every capability-gated route in `App.tsx`:

- `/daily-tracker` → `view_daily_tracker`
- `/weekly-data`, `/weekly-history` → respective caps
- `/invoice-generator`, `/bulk-invoice`, `/invoices`, `/statistics`
- `/rates`, `/employees`, `/company-settings`
- `/user-management` → admin only
- `/cms/*` → `manage_website_content`
- `/recruitment`, `/interviews`, etc.
- `/finance` → `view_dashboard` (everyone) but advance-approval tabs gated by new `approve_finance_requests`

Also audit `EmployeeDashboard` and `Index` quick-access cards to consistently use `hasCapability`.

## 2. Finance page (`/finance`)

### Database (new migration)

```text
finance_categories
  id, kind ('reimbursement' | 'cash_advance'), name, is_active, display_order
  (seeded: Reimbursement → Travel, Meals, Supplies, Medical, Other;
            Cash Advance → Project, Field Ops, Other;
            Salary Advance is a fixed kind, no category)

advance_requests
  id, user_id, kind ('salary_advance'|'reimbursement'|'cash_advance'),
  category_id (null for salary_advance), amount, reason, receipt_url,
  repayment_plan ('one'|'two'|null), status ('pending'|'approved'|'rejected'|'repaid'),
  approver_id, approver_note, created_at, decided_at,
  repaid_count int default 0   -- tracks how many invoices have deducted

advance_repayments
  id, advance_id, invoice_id, amount, created_at
  (written when a payslip is generated)

finance_budgets
  id, scope_type ('user'|'role'|'department'), scope_id (uuid/text),
  kind ('reimbursement'|'cash_advance'|'salary_advance'),
  category_id (nullable), monthly_limit numeric
```

RLS: users CRUD their own pending requests; admin/`approve_finance_requests` see all + update status; leaders see subordinates (using existing `get_subordinate_user_ids`). Budgets admin-only.

New capability: `approve_finance_requests` added to `ALL_CAPABILITIES`.

### Payslip integration
Modify `InvoiceGenerator` to:
- Query approved, not-fully-repaid advances for the employee
- Auto-add deduction line(s) per repayment plan (full on next slip, or half×2)
- Insert `advance_repayments` rows and bump `repaid_count`; mark `status='repaid'` when complete

### Page layout (`src/pages/employee/Finance.tsx`, mobile-first)

Header + responsive tabs:

1. **Overview**
   - 4 metric cards: Total Salary Paid, Outstanding Advances, Reimbursed YTD, Net Position
   - Area chart: monthly salary vs deductions (recharts, `ResponsiveContainer`)
   - Pie/Donut: spend categorized by Salary Payment / Cash Advance / Reimbursement / Salary Advance
   - Recent payslips table (links to payslip PDF)

2. **My Requests**
   - "New Request" button → dialog: pick kind, category (if applicable), amount, reason, receipt upload (uses `documents` bucket), repayment plan (salary advance only)
   - List of own requests with status badges + approver note
   - Budget hint shown live; if amount > limit show soft warning "Exceeds your monthly limit of ₦X — approver will be notified"

3. **Approvals** (only if admin or has `approve_finance_requests`)
   - Tabbed: Pending / Decided
   - Card list with requester avatar, kind, amount, category, reason, attached receipt
   - Approve/Reject with required note
   - Highlight chip when request exceeded budget limit

4. **Team Finance** (only leaders)
   - Reuse `get_my_subordinates` to scope queries
   - Subordinate metric tiles + table of their requests

5. **Settings** (admin only)
   - Categories CRUD (reimbursement + cash advance) — uses `LookupCMSPage` pattern
   - Budgets table: pick scope (user/role/department), kind, category, monthly limit; inline edit/delete

### Hooks/components
- `useAdvanceRequests(filters)` — CRUD + realtime
- `useFinanceBudgets()`
- `useFinanceCategories()`
- `useFinanceSummary(userId)` — aggregates transactions + invoices + advances
- `<RequestAdvanceDialog />`, `<ApprovalCard />`, `<BudgetEditor />`, `<CategoryManager />`

All UI uses semantic tokens (`bg-card`, `text-foreground`, brand Navy/Orange already in tokens), fully responsive with `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` patterns and stacked tabs on mobile.

### Sidebar
Surface "Finance" in `DashboardLayout` for all employees; show "Finance Approvals" badge with pending count for approvers.

## Files

**Created**
- `src/components/CapabilityGuard.tsx`
- `src/hooks/useAdvanceRequests.ts`, `useFinanceBudgets.ts`, `useFinanceCategories.ts`, `useFinanceSummary.ts`
- `src/components/finance/RequestAdvanceDialog.tsx`, `ApprovalCard.tsx`, `BudgetEditor.tsx`, `CategoryManager.tsx`
- migration: `*_finance_module.sql`

**Edited**
- `src/App.tsx` (route guards, finance route)
- `src/pages/employee/Finance.tsx` (full rewrite)
- `src/pages/InvoiceGenerator.tsx` (auto-deduct repayments)
- `src/components/DashboardLayout.tsx` (Finance nav)
- `src/hooks/useCapabilities.tsx` (+ `approve_finance_requests`)
