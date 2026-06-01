## Plan

### 1. Fix Payslip Generator saving
- Add the missing `ytd_taxable_income` and `ytd_tax_paid` fields to the `invoices` table so the current Payslip Generator can save without schema-cache errors.
- Keep the existing PAYE/YTD calculation flow intact.
- Validate the save path after the database migration is applied.

### 2. Fix welcome inbox messages and backfill approved employees
- Recreate the missing profile trigger so welcome inbox messages are sent when `approval_status` changes to `approved`.
- Make the sender lookup more reliable by using the existing `welcome_sender_email` setting and a safe fallback.
- Backfill welcome inbox messages for already-approved admin/employee users who have not received one yet.
- Prevent duplicate welcome messages by checking for an existing welcome subject per recipient.

### 3. Improve SMS Holiday Schedule page
- Replace the raw JSON holiday editor with a simple form/table:
  - Holiday date
  - Holiday label/message title
  - Add, edit, remove rows
  - Save all holidays
- Preserve storage in `app_settings.holidays`, but make the UI handle parsing/serialization behind the scenes.
- Update the daily SMS job to robustly handle either a single object or an array, because the current stored value is a single JSON object.

### 4. Add AI-generated quarterly holidays/important days
- Add a backend function to generate holiday/important-day suggestions for the current quarter using Lovable AI.
- Add a button on the SMS Templates holiday page: “Generate this quarter”.
- Insert the generated suggestions into the editable holiday form, not directly into the schedule until the user saves.
- Allow users to edit or delete AI suggestions before saving.

### 5. Add AI-generated employee About Me profile
- Add profile fields for:
  - Personal background
  - Education
  - Marital/family details
  - Hobbies/interests
  - Other details
  - Public/private visibility settings
  - Generated About Me writeup
  - Short intro/excerpt
- Update the Profile page with a new “About Me” section.
- Mark core details as required for generation, while keeping sensitive details optional.
- Add a “Generate About Me” action that uses Lovable AI to create both the full section and short intro from the employee’s submitted details.
- Let employees edit the generated content before saving.

### 6. Add direct-manager introduction nag modal
- Add profile state to track whether the employee has acknowledged their manager introduction.
- Show a modal on the employee dashboard when:
  - the employee has a direct manager,
  - the manager has completed the required profile/About Me details,
  - the employee has not acknowledged the introduction.
- The modal remains until the employee acknowledges and closes it.
- Backfill this for existing employees by defaulting acknowledgment to not completed, so they will see it once their manager has enough profile data.

### 7. Enhance Employee Dashboard manager details
- Show each employee’s department, designation, and direct manager name more prominently on the employee homepage.
- Add “View manager” from the dashboard.
- Display the manager’s public About Me and short intro in a dialog, respecting the manager’s public/private visibility choices.

### 8. Add last login and online status to User Management
- Update the `get-users` backend function to return each user’s last login time from the auth user record.
- Add lightweight online tracking:
  - record the current user’s recent activity timestamp while they use the app,
  - treat users active within the last few minutes as online.
- Add “Online/Offline” and “Last login” columns to User Management.

## Technical notes
- Database changes will be done through a migration before code changes:
  - alter `invoices`
  - restore missing triggers
  - add profile/About Me and manager-intro fields
  - add a small user presence table with RLS and grants
- Existing project rules will be preserved:
  - use “Payslip” in UI text, not “Invoice”
  - do not edit generated Lovable Cloud client/type files manually
  - keep private data protected with authenticated-only access and owner/admin rules
- Edge functions to update/create:
  - `daily-sms-jobs`
  - new AI holiday generator function
  - new AI About Me generator function
  - `get-users`
