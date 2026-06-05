
## 1. Admin Dashboard — Custom Rate Labels

Currently rates are hard-coded columns in `rate_configurations`. Add a flexible label system on top.

- **DB**: new `rate_items` table — `id`, `name`, `bucket` (`income` | `expense`), `unit` (`per_name` | `monthly_fixed` | `percent`), `value numeric`, `is_active`, `display_order`. Admin-only RLS, authenticated read. Seed it from current hard-coded fields so existing flows keep working.
- **Rate Settings UI**: add a "Custom Rate Labels" section above the legacy grid. Inline add/edit/delete/reorder, with bucket + unit selectors. Legacy fields stay editable until fully migrated.
- **Weekly entry + Payslip overview**: read `rate_items` and merge them into the income/expense calculations, grouped by bucket. Labels appear automatically wherever income/expense overviews render.

## 2. AI Assistant — Admin Analytics Copilot

New tab under the admin Finance/Dashboard sidebar: **AI Assistant** (admin-only).

- **Page**: `src/pages/admin/AIAssistant.tsx` — chat UI using `useChat` + `DefaultChatTransport`, single conversation persisted in localStorage (per admin).
- **Edge function**: `supabase/functions/ai-copilot/index.ts` — streams via AI SDK + Lovable Gateway (`google/gemini-3-flash-preview`). System prompt frames it as company analytics copilot. Tools (with `stopWhen: stepCountIs(50)`):
  - `query_finance_summary` (period) → returns totals, advances, reimbursements
  - `query_payslips` (filters) → aggregated payslip stats
  - `query_recruitment` → pipeline counts by stage
  - `query_attendance` → submission counts by form/period
  - `list_top_spenders` / `list_overbudget_users`
- Tools run service-role queries inside the function. Admin auth verified via JWT.
- Renders markdown + simple inline tables for tool results.

## 3. Payslip / SMS Fixes

Root cause of retry-not-updating: the `sms_logs` table is missing `retry_count`, `last_retry_at`, `original_to`, `original_template_key`, `original_vars` columns — the previous migration didn't reach the DB, so every update of those fields silently fails (PostgREST returns error, function ignores it). Fix this first.

- **Migration**: add the missing columns to `sms_logs`.
- **Payslip SMS**: re-verify both `InvoiceGenerator` call sites (line 761 "Save Only" and 1277 "Save & Download"). Add a robust catch + console log + toast on failure, and ensure `to`/`user_id` are passed even when phone is missing (so we still get a "skipped: no phone" log). Add fallback fetch of phone from `profiles` in the edge function (already there).
- **finance_decision SMS**: already wired in `useAdvanceRequests.decide`. Trace why it isn't firing — likely the same silent failure from missing log columns. After the migration, verify in `sms_logs`.
- **Retry status**: `send-sms` already updates `status` on retry; once columns exist this will work. Add UI toast confirming new status after retry.
- **Sweep other templates**: confirm `account_approved`, `candidate_stage`, `candidate_hire`, `birthday`, `holiday` all reach `send-sms` with valid `template_key` + recipient.

## 4. Capability Guard False-Negatives (Daily Tracker, HR Recruitment)

`adeolabunmi94@gmail.com` has the capabilities but `CapabilityGuard` shows "Access denied". Likely causes to investigate and fix:

- `useCapabilities` returning stale/empty array on first render → guard fires the toast before the real fetch resolves. Fix: keep showing the loader until capabilities query has `data !== undefined` (not just `isLoading`); avoid firing the redirect toast on transient empty results.
- Capability keys mismatch (e.g. role-template assigns `daily_tracker` but route requires `view_daily_tracker`, similarly `manage_recruitment` vs `hr_recruitment`). Audit `UserManagement`, `RoleManagement`, and route guard keys; align both sides to a single canonical key list.
- Confirm `user_capabilities` rows actually exist for that user (the toast is also shown immediately after a role change before the realtime refresh).

## 5. Budget Limits — Multi-select Kind & Category

- **DB**: extend `finance_budgets` — replace single `kind` + `category_id` with `kinds text[]` and `category_ids uuid[]` (keep old cols for backward compat, dual-write during transition). Update `finance_budgets_kind_check`.
- **BudgetEditor UI**: multi-select dropdowns for request types and categories. Show "Applies to: Reimbursement, Cash Advance · Travel, Meals".
- **useMyBudgets / Finance enforcement**: when matching a request to a budget, treat it as applicable if `req.kind ∈ kinds` AND (`category_ids` empty OR `req.category_id ∈ category_ids`). Sum used across all matching approved requests for the month. Update overage warning + progress bar accordingly.

## 6. Finance Page Fixes

- **Cash Advance card**: add 5th metric card "Cash Advance YTD" (sum of approved `cash_advance`) on the overview grid (use a 2/3/5 responsive grid).
- **Pie chart labels**: replace truncated inline labels with a proper Legend + percent-only labels on slices. Increase chart height and use `labelLine={false}` plus a horizontal `<Legend>` so "Cash Advance" / "Reimbursement" aren't clipped.

## 7. Org Chart Visibility for Employees

Employees currently see a partial/broken tree because RLS on `profiles` may scope or because `manager_id` chains break when intermediate managers are filtered out. Fix:

- Create SECURITY DEFINER RPC `get_org_chart()` that returns `{id, full_name, avatar_url, position, department, manager_id}` for all approved employees/admins, regardless of caller role.
- `OrgChart.tsx` switches from direct table reads to `db.rpc('get_org_chart')`. Same component renders for admins and employees; no role-based filtering of nodes.

## 8. Verification

- Manually trigger Save Only + Save & Download → confirm SMS row in `sms_logs` with `status='sent'`.
- Approve a cash advance / reimbursement → confirm `finance_decision` SMS row.
- Manually retry a failed log → confirm `status` flips to `sent` and `retry_count` increments.
- Log in as `adeolabunmi94@gmail.com` → `/daily-tracker` and `/applications` load.
- Create a budget covering `[reimbursement, cash_advance]` × `[travel, meals]` → submit two small requests → progress bar shows combined usage.
- Employee `/org-chart` shows the full tree identical to admin view.

## Technical Details

- Migrations (single file): add `sms_logs` columns; create `rate_items`; alter `finance_budgets` to add array cols + drop old check; create `get_org_chart()` SECURITY DEFINER.
- New files: `src/pages/admin/AIAssistant.tsx`, `supabase/functions/ai-copilot/index.ts`, `src/components/RateItemsManager.tsx`.
- Edited files: `RateSettings.tsx`, `InvoiceGenerator.tsx` (better SMS error reporting), `useAdvanceRequests.ts`, `Finance.tsx` (5-metric grid, legend), `BudgetEditor` (in `Finance.tsx`), `useMyBudgets.ts`, `OrgChart.tsx`, `CapabilityGuard.tsx`, `useCapabilities.tsx`, `App.tsx` + `DashboardLayout.tsx` (AI Assistant route + nav item).
- Tools/libs used: existing `@ai-sdk/react`, `ai`, `recharts`. No new deps beyond `@ai-sdk/openai-compatible` if not already installed for the copilot function.
