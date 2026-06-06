# Implementation Plan

## 1. Profile Setup — Escape hatches

`src/pages/ProfileSetup.tsx`: add header row with two buttons — **"Back to Home"** (`/`) and **"Skip to Dashboard"** (`/dashboard`). They navigate via `useNavigate` so users never get stuck if `AvatarGuard` mis-routes them. `AvatarGuard` already allows `/profile-setup` and `/`; the dashboard button works once an avatar exists or as a manual escape.

## 2. Finance Page — Period filter + admin-editable budgets

`src/pages/employee/Finance.tsx`:

- Add a **period filter** above the summary cards: `This Week / This Month / This Quarter / This Year / Lifetime / Custom range` (custom uses two date inputs via `Popover + Calendar`). Filter applies to `myRequests`, `allRequests`, ledger payslips, and chart data via a `useMemo` `dateFilter` predicate.
- Admin budgets: add an **Edit** pencil on each `Budget Limits` card row visible when `isAdmin || canManageBudgets` is true → opens existing `BudgetEditor` dialog pre-filled with the budget row (already supports create; add `editing` state and PATCH path against `finance_budgets`).

## 3. AI Assistant — Embed in admin dashboard + fix Edge function

**Frontend**: `src/pages/Index.tsx` — replace the placeholder "coming soon" card inside `TabsContent value="ai-assistant"` with the chat UI extracted from `src/pages/admin/AIAssistant.tsx`. Move the chat into a reusable `src/components/AIAssistantPanel.tsx` so both the standalone page and the dashboard tab share one component.

**Edge function fix** — error is "Failed to send a request to the Edge Function". Two likely causes; fix both:

1. Function not deployed yet → redeploy `ai-copilot`.
2. CORS / OPTIONS works but POST falls over because `convo` includes `assistant` tool_call messages that aren't valid for Gemini OpenAI-compat. Tighten the request: ensure every `assistant` message pushed back into `convo` is `{ role:'assistant', content: string|null, tool_calls? }`, and tool responses use `{ role:'tool', tool_call_id, content }` only — drop extra fields. Also catch tool-runner exceptions and return them as tool content so the loop continues.

## 4. Messaging Policy — Create missing tables

Error: `Could not find the table 'public.chat_global_policy'`. Migration adds:

- `chat_global_policy` (`id smallint pk default 1`, `all_users_mode text`, `allow_same_department bool`, `allow_same_team bool`, `allow_managers bool`) — singleton row id=1 seeded.
- `chat_user_blocks` (`blocked_user_id uuid pk`, `except_user_ids uuid[] default '{}'`).
- GRANTs + RLS: read for `authenticated`, write only `has_role(auth.uid(),'admin')`.
- Helper RPC `can_message(_from uuid, _to uuid) returns boolean` that admins/messages-to-admin always pass, then applies global policy + block table.
- `InboxCompose.tsx` recipient query already filters server-side via existing query; have it additionally call `can_message` per candidate recipient (or rely on RLS on `messages` insert).

## 5. HR Recruitment — Contract templates & signing

Migration:

- `contract_templates` (`id`, `title`, `position_id` nullable, `role text` nullable, `body_html text`, `file_url text` nullable, `is_active bool`, `created_by`).
- Extend `contracts` with `template_id uuid` and `signed_full_name text`.
- GRANTs + RLS: admins manage templates; candidates/employees read templates assigned to their offered application.

UI:

- `src/pages/admin/ContractTemplates.tsx` (admin) — CRUD list, rich textarea body, optional PDF upload to `documents` bucket, scope by position/role.
- `src/components/hr/ContractUploadDialog.tsx` — add a **"Use template"** picker that auto-fills the contract from a template when assigning to an `offered` candidate.
- Candidate flow already has signing page; extend `SignatureCanvas` dialog with a **"Sign by typing full name"** tab that writes `signed_full_name` instead of `signature_data`.
- Employee action plan: in `EmployeeDashboard.tsx`, query `contracts` joined to the user's `applications`; if any `signed_at IS NULL`, add an `ActionItem` "Sign your employment contract" linking to `/my-contract`. New lightweight page `src/pages/employee/MyContract.tsx` renders the template body + signature canvas / typed-name option.

## 6. SMS Templates & Delivery logs

- Seed/upsert missing template rows (migration `INSERT … ON CONFLICT (key) DO NOTHING`): `payslip_generated` (re-confirm body & vars), `candidate_offer`, `birthday`, `finance_decision`, `candidate_stage`, `candidate_hire` so they all appear active.
- `supabase/functions/send-sms/index.ts`: ensure **every** branch logs to `sms_logs` (success and failure) with `template_key` populated, even when MultiTexter returns non-200 — currently some early returns skip the insert.
- `InvoiceGenerator.tsx` "Save Only": confirm SMS invocation runs after insert (it does for `payslip_generated`), and surface any thrown error via toast so future regressions are visible.
- Add new template `**candidate_offer**` with vars `{name, position, link}`. Wire it from `Offers.tsx` when an offer is created/sent (alongside the existing email).

## 7. Daily Tracker access for Adeola

DB confirms she has `view_daily_tracker`. Likely cause: sidebar in `DashboardLayout.tsx` hides the link unless an admin-only flag matches. Audit `DashboardLayout.tsx` nav config so the **Daily Tracker** item shows whenever `capabilities.includes('view_daily_tracker') || role==='admin'`. Also verify `EmployeeDashboard` quick-link card respects the same capability.  
  
She can see the daily tracker on the nav menu but once clicked, she would be told that she doesn't have access to use the page.

## Files

**New**: `src/components/AIAssistantPanel.tsx`, `src/pages/admin/ContractTemplates.tsx`, `src/pages/employee/MyContract.tsx`, migration for `chat_global_policy` / `chat_user_blocks` / `contract_templates` / `can_message` RPC / SMS template seed.

**Edited**: `ProfileSetup.tsx`, `Finance.tsx`, `Index.tsx`, `admin/AIAssistant.tsx`, `ai-copilot/index.ts`, `ChatPolicies.tsx`, `InboxCompose.tsx`, `hr/ContractUploadDialog.tsx`, `SignatureCanvas.tsx`, `EmployeeDashboard.tsx`, `send-sms/index.ts`, `InvoiceGenerator.tsx`, `Offers.tsx`, `DashboardLayout.tsx`, `App.tsx` (new routes).