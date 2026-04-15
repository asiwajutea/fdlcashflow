

## Plan: Fix Login Issue + Seed Default Role Templates

### Issue 1: adeolabunmi53@gmail.com Login

The database shows this user already has:
- Role: `employee`
- Passcode: `78691252`

The "pending admin approval" message appears when passcode equals `00000000`. Since this user's passcode is already set, the login should work — **the user just needs to enter `78691252` as their access code**. 

However, the **trigger `on_auth_user_created` is still missing** from the database (the db-triggers section shows "no triggers"). This means the previous migration either failed silently or wasn't applied to production. We need to re-create it to prevent this issue for future signups.

**Fix:** Create a new migration that safely creates the trigger (with `IF NOT EXISTS` / `DROP IF EXISTS` guard).

### Issue 2: Seed Default Role Templates

Currently the `custom_roles` table is empty. The user wants the four standard roles (Admin, Employee, Guest, Candidate) pre-populated as role templates with their default capability sets.

**Fix:** Insert four default role templates into `custom_roles` via the database insert tool:

| Role | Capabilities |
|------|-------------|
| **Admin** | All 25 capabilities |
| **Employee** | view_dashboard, view_daily_tracker, add_transactions, enter_weekly_data, view_weekly_history, view_invoices, view_inbox, send_messages |
| **Guest** | view_dashboard |
| **Candidate** | submit_application, complete_screening, view_interview, sign_contract, view_inbox, send_messages |

Additionally, update the Role Templates UI (`RoleManagement.tsx`) to mark these four as "system" templates that cannot be deleted (only edited).

### Files Changed

| File | Change |
|------|--------|
| Migration SQL | Re-create `on_auth_user_created` trigger |
| Database insert | Seed 4 default role templates into `custom_roles` |
| `src/components/RoleManagement.tsx` | Mark system roles as non-deletable |

