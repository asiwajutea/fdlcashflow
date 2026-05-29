# Plan

## A. Fixes

### 1. Direct Manager not saving

Both `UserManagement.openEditDialog` and `EmployeeManagement.handleSave` write `profiles.manager_id`, but the update is failing silently because the admin's UPDATE on `profiles` is blocked by RLS (current policies only let users update their own profile). 

- Add an RLS policy: `Admins can update any profile` using `has_role(auth.uid(), 'admin')`.
- Move the `manager_id` update inside `update-user` edge function (service role) so it bypasses RLS, and surface errors via toast.
- After save, re-read the profile to verify and reflect in UI.

### 2. Welcome inbox message not firing on approval

The current `send_welcome_inbox_message` trigger fires on `profiles` INSERT — but at insert time the user is still `pending`, so it sends too early (or skipped if status check is reversed). Refactor:

- Drop the existing AFTER INSERT trigger.
- Recreate as AFTER UPDATE OF approval_status trigger that fires only when `OLD.approval_status <> 'approved' AND NEW.approval_status = 'approved'`.
- Also seed `app_settings.welcome_sender_email` if missing (Temidayo's email — will ask user below).
- Send personalized warm message from Temidayo, urging profile completion.

### 3. Employee Payslip page — view PDF + download + scorecard

Update `src/pages/employee/MyInvoices.tsx`:

- Add "View" button → opens the existing `InvoiceTemplate` rendered in a Dialog (read-only).
- Add "Download PDF" button using `html2canvas` + `jsPDF` (same pattern as bulk export).
- Add a scorecard at top: YTD gross, YTD net, YTD tax, YTD savings, # of payslips, avg net — small grid of metric cards.

## B. New Features

### 4. Org Chart page

New route `/org-chart` (and link in DashboardLayout sidebar).

- New component `src/pages/OrgChart.tsx` using `reactflow` (or a lightweight custom tree) to render nodes built from `profiles.manager_id` hierarchy.
- Each node: circular avatar (avatar_url from profile, fallback to initials), full_name, position name (join `positions`), gender badge.
- Top of tree = users with `manager_id IS NULL` and role admin/employee.
- Mobile: collapsible vertical tree.

### 5. MultiTexter SMS Integration

**Secrets** to add: `MULTITEXTER_API_KEY`, `MULTITEXTER_SENDER_NAME` (≤11 chars).

**Schema**

```sql
-- sms_templates
id, key (unique: account_approved | birthday | holiday | finance_decision |
         payslip_generated | candidate_stage | candidate_hire),
name, body (with {{placeholders}}), is_active, updated_at

-- sms_logs
id, template_key, recipient_phone, user_id, body, status, provider_msg_id,
units, balance, error, created_at
```

**Edge function** `send-sms`:

- POST `{ to, template_key, vars, user_id? }`
- Loads template, renders `{{var}}` placeholders, POSTs to `https://app.multitexter.com/v2/app/sendsms` with `Authorization: Bearer ${MULTITEXTER_API_KEY}`.
- Logs to `sms_logs`. Skips silently if template `is_active=false`.

**Triggers / hooks for each notification:**


| Event                            | Where triggered                                                                                                                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account approved                 | extend `approve-user` edge function to call `send-sms`                                                                                                                                                           |
| Birthday                         | new daily cron edge function `daily-birthday-sms` (pg_cron at 08:00) — sends to profiles whose `birthday` month/day = today AND `approval_status='approved'` AND `is_active` (existing field check via approval) |
| Holiday wishes                   | new `app_settings.holidays` JSON list (date + label) + same daily cron checks today's date                                                                                                                       |
| Finance request approval/decline | hook in `useAdvanceRequests`/approver UI after status update                                                                                                                                                     |
| Payslip generated                | hook in `InvoiceGenerator.tsx` after insert                                                                                                                                                                      |
| Candidate stage change           | hook in `Applications.tsx` / `Screening.tsx` on stage update                                                                                                                                                     |
| Candidate hire                   | hook in `promote-candidate-to-employee` edge function                                                                                                                                                            |


All trigger sites call `supabase.functions.invoke('send-sms', { body: {...} })` with the user's `profiles.phone`.

**CMS Template page** `src/pages/cms/CMSSmsTemplates.tsx`:

- Lists the 7 templates, edit body, toggle `is_active`, "Send test" button, show last 50 `sms_logs` entries with delivery status.
- Variable hints rendered per template (e.g. payslip: `{{name}} {{amount}} {{month}}`).
- Route added under CMS sidebar.

## Technical Notes

- `pg_cron` and `pg_net` extensions enabled; scheduled SQL inserted via `insert` tool (not migration) since it embeds the function URL.
- All edge functions use `verify_jwt = false` default; validate caller with `getClaims()` where called from app.
- Phone normalization: strip non-digits, ensure leading `234` (Nigeria).
- The `is_active` filter for birthdays uses `approval_status='approved'` (no `is_active` column on profiles — per memory).

## Questions Before I Build

1. **Welcome sender email**: confirm Temidayo's exact account email so the trigger can resolve `auth.users.id`.Answer:  Use [admin@footprintsdynasty.com.ng](mailto:tea@footprintsdynasty.com.ng) as the sender email.
2. **MultiTexter sender_name**: what 11-char-max display name (e.g. `FDLWORKFRC`)? Answer: Use "Footprints"
3. **Org Chart library**: OK to add `reactflow` (~150KB) for clean pan/zoom, or prefer a lightweight custom SVG tree? Answer: Use reactflow