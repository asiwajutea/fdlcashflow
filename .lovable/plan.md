## Goals

1. Show each user their applicable budget limit and how much they've used this month.
2. Display all historical payslips on `/my-invoices` for a linked employee (regardless of when the link was made).
3. Show the user's previous payslip-based payment history on `/finance` once their account is linked.
4. Add a "My Payslips" item to the nav menu so users can find the page.

## Files to change

- `src/components/DashboardLayout.tsx` — add "My Payslips" nav entry under Invoicing for all signed-in users (no capability gate).
- `src/pages/employee/MyInvoices.tsx` — broaden the employee lookup so historical payslips appear even if `employee_id` was linked after the payslip was created. Match employee by `user_id`, `profile_id`, or `email`, **then also pull invoices whose `employee.email` matches the user's email** (covers payslips issued before the link). Merge + de-duplicate by `invoice.id`.
- `src/pages/employee/Finance.tsx` —
  - Replace the `useTransactions({})` data source for personal totals/charts with a unified `useMyFinanceLedger(user)` query that pulls:
    - **Salary income**: rows from `invoices` linked to any employee record matching the user (`user_id`/`profile_id`/`email`).
    - **Advances/reimbursements**: from `advance_requests` (already correct).
    - Builds the monthly cashflow series and the "By category" breakdown from this combined dataset, so a linked user immediately sees prior payslip totals.
  - Add a **Budgets card** on the Overview tab that lists every `finance_budgets` row applicable to the current user (scope_type `user` for `user.id`, plus role / department scopes via `profiles`), with:
    - Limit, used this month (sum of approved advance_requests in the budget's `kind` + `category_id`, filtered to current calendar month), remaining, and a `Progress` bar (green <70%, amber 70–99%, red ≥100%).
  - Reuse this same lookup in the New Request dialog so the soft-warning checks the right budget.
- `src/hooks/useMyFinanceLedger.ts` (new) — encapsulates the linked-employee → invoices + advances fetch with `useQuery`, returning `{ payslips, monthly, byCategory, salaryPaid }`.
- `src/hooks/useMyBudgets.ts` (new) — returns budgets applicable to the current user with `{ budget, used, remaining }` for the current month.

## Technical notes

- All lookups stay client-side using existing RLS:
  - `employees` is readable by authenticated users → safe to `.or('user_id.eq.<uid>,profile_id.eq.<uid>,email.ilike.<email>')`.
  - `invoices` has policies for admins, authenticated read, and self via linked `employees.user_id`. Pulling by `employee_id IN (...)` works for all matched employee rows.
  - `advance_requests` policy already lets owners read their own.
- For the role/department budget scopes, fetch the user's `profiles` row once (id, role from `user_roles`, department_id) and filter `finance_budgets` where `(scope_type='user' AND scope_id=uid)` OR `(scope_type='role' AND scope_id=role)` OR `(scope_type='department' AND scope_id=department_id)`.
- "Used this month" = sum of `advance_requests.amount` where `user_id=uid`, `status IN ('approved','repaid')`, `kind=budget.kind`, `(budget.category_id IS NULL OR category_id=budget.category_id)`, and `created_at >= start of current month`.
- No DB migrations, no RLS changes, no new capabilities.
- Keep all colors via existing semantic tokens; only progress bar uses Tailwind classes already in the design system.

## Out of scope

- No edits to `InvoiceGenerator.tsx`, approval workflow, or category/budget admin UI behavior.
- No schema or capability changes.
