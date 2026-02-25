

## Data Migration Plan

### Current State

**New user accounts (already created and confirmed):**

| Email | New UUID | Role | Passcode |
|---|---|---|---|
| finance@footprintsdynasty.com.ng | `cd09a787-3e52-4394-91fd-7cb28cd83b10` | admin | 18012019 |
| guest@footprintsdynasty.com.ng | `f86811bb-219f-4b3e-85a5-293d84bb0c3f` | admin | 00000000 (needs setting) |
| dakintuyi@gmail.com | `1f91415d-6c59-4b94-8269-a21dc6e35ff2` | candidate | N/A |

Roles are already correct in the database. Profiles and user_roles exist for all 3 users.

**ID Mapping (old → new):**
- Old admin `205f493e-1ccb-4bf0-aec9-64f9a6275077` → New `cd09a787-3e52-4394-91fd-7cb28cd83b10`
- Records with `created_by` referencing the old ID will be remapped to the new ID
- Records with NULL `created_by` will remain NULL

### Schema Gaps Found

Some CSV columns do not exist in the current database. These will be **skipped** during import (they are either zero/unused or informational):

| Table | Missing Columns (will skip) |
|---|---|
| rate_configurations | `booklet_rate`, `production_manager_salary`, `fixed_monthly_salaries`, `operations_utilities`, `employee_gratuity`, `logistics`, `incentives`, `updated_at` |
| invoices | `ytd_taxable_income`, `ytd_tax_paid`, `updated_at` |
| employees | `updated_at` |
| invoice_line_items | `created_by` |

The `invoices` table also has columns `paye_tax`, `nhf`, `pension` in the schema that the CSV does not provide -- these will default to 0.

### Migration Steps (executed in dependency order)

**Step 1 — Fix guest passcode & grant admin capabilities**
- Update `profiles.passcode` for guest@ to a unique 8-digit code
- Insert all admin capabilities for both admin accounts into `user_capabilities`

**Step 2 — Insert independent tables (no user ID dependency)**
Using the database insert tool for each:

1. **company_settings** — 1 row, insert with new UUID (old ID not relevant)
2. **employees** — 21 rows, no user ID references
3. **rate_configurations** — 8 rows, skip missing columns
4. **rate_change_history** — 1 row

**Step 3 — Insert user-dependent tables (with ID remapping)**
For rows where `created_by = '205f493e-...'`, replace with `cd09a787-...`:

5. **invoices** — 42 rows, remap `created_by`
6. **invoice_line_items** — 156 rows, skip `created_by` column (not in schema)
7. **daily_transactions** — 58 rows, remap `created_by`
8. **job_positions** — 1 row, remap `created_by`

**Step 4 — Verify**
- Run SELECT queries on each table to confirm row counts match
- Test login with finance@ account

### Technical Notes

- All inserts will use the database insert tool (not migrations) since these are data operations
- Original UUIDs for records (e.g., employee IDs, invoice IDs) will be preserved exactly as-is, so foreign key relationships between tables remain intact
- The `profiles` and `user_roles` tables do NOT need CSV import — they already exist for the 3 new users
- Weekly records CSV was not uploaded (file not found). If you have weekly records data, you can share it separately

