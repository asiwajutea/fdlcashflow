
## Multi-User System with Role-Based Access Control

### Overview
This plan implements a complete multi-user system with:
- Account registration with auto-generated passcodes
- New "employee" role
- Granular capability/permission management
- User-specific data visibility with admin oversight

Please note: The admin should create a passcode that will serve as an auth code for anyone who wants to register. However, the user should be able to set their own password that will be used for login after the registration is completed. This password should be set as a secret harsh but the admin should be able to update the password from the admin UI. Update this plan based on this.

---

### Database Changes

#### 1. Add 'employee' to app_role enum
```sql
ALTER TYPE public.app_role ADD VALUE 'employee';
```

#### 2. Create user_capabilities table
Store granular permissions for each user:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users |
| capability | text | Permission name |
| granted_by | uuid | Admin who granted |
| created_at | timestamp | When granted |

**Capabilities to track:**
- `view_dashboard` - Access main dashboard
- `enter_weekly_data` - Submit weekly records
- `view_weekly_history` - View historical records
- `manage_rates` - Edit rate configurations
- `generate_invoice` - Create payslips
- `view_invoices` - View invoice list
- `manage_employees` - Add/edit employees
- `view_daily_tracker` - Access daily tracker
- `add_transactions` - Add income/expense entries
- `view_statistics` - View invoice statistics
- `manage_company_settings` - Edit company info
- `bulk_invoice` - Generate bulk invoices
- `manage_users` - Admin-only: manage other users

#### 3. Add created_by column to data tables
Add `created_by uuid` column to:
- `weekly_records`
- `daily_transactions`
- `invoices`
- `invoice_line_items`

This tracks who created each record.

#### 4. Update profiles table
Add fields for employee user management:
- `full_name text` - User's display name
- `is_active boolean DEFAULT true` - Account status

#### 5. Update RLS Policies
For each data table, replace current admin-only policies with:
- **Admin**: Can view ALL records
- **Employee**: Can only view records where `created_by = auth.uid()`

---

### New Edge Function: create-user

An edge function to handle user registration:
- Validates input (email, password, full_name)
- Generates random 8-digit passcode
- Creates user via Supabase Admin API
- Assigns 'employee' role by default
- Returns passcode to display to admin

---

### Frontend Changes

#### 1. Update Auth Page (`src/pages/Auth.tsx`)
Add a "Create Account" tab/option:
- Email input
- Password input (with confirmation)
- Full Name input
- Displays generated passcode after successful registration
- Registration is open but assigns 'employee' role with minimal capabilities

#### 2. New Page: User Management (`src/pages/UserManagement.tsx`)
Admin-only page with:
- List of all users (email, name, role, status)
- Edit user dialog:
  - Change role (admin/employee/guest)
  - View/regenerate passcode
  - Toggle active status
- Capability assignment section:
  - Checkboxes for each capability
  - Bulk assign/remove capabilities
  - Visual indicator of what each capability allows

#### 3. Update useAuth Hook (`src/hooks/useAuth.tsx`)
- Extend role type to include 'employee'
- Add `capabilities: string[]` to profile
- Fetch user capabilities on login
- Add helper function: `hasCapability(name: string): boolean`

#### 4. Add Capability Guards Throughout App
Wrap features with capability checks:

```tsx
// Example usage
{hasCapability('enter_weekly_data') && (
  <WeeklyDataEntry onSubmit={handleSubmit} />
)}
```

Update these pages/components:
- **Index.tsx**: Guard dashboard sections based on capabilities
- **InvoiceGenerator.tsx**: Require `generate_invoice`
- **InvoiceList.tsx**: Require `view_invoices`
- **DailyTracker.tsx**: Require `view_daily_tracker` and `add_transactions`
- **EmployeeManagement.tsx**: Require `manage_employees`
- **CompanySettings.tsx**: Require `manage_company_settings`
- **RateSettings.tsx**: Require `manage_rates`

#### 5. Update Navigation/Dashboard
- Add "User Management" link (admin only)
- Show/hide menu items based on capabilities
- Display current user's name in header

#### 6. Update Data Submission Functions
When creating records, include `created_by: user.id`:
- `handleWeeklyDataSubmit` in Index.tsx
- Transaction creation in DailyTracker.tsx
- Invoice saving in InvoiceGenerator.tsx

---

### Security Considerations

1. **Passcode Storage**: Stored in profiles table, only viewable by the user themselves or admin
2. **Capability Assignment**: Only users with 'admin' role can modify capabilities
3. **RLS Enforcement**: All data access controlled at database level
4. **Default Capabilities**: New employees get minimal read-only access

---

### Default Capability Sets

**Admin (all capabilities)**:
All capabilities enabled by default

**Employee (limited capabilities)**:
- `view_dashboard`
- `view_daily_tracker`
- `add_transactions`

**Guest (read-only)**:
- `view_dashboard`

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| SQL Migration | CREATE | Add employee role, capabilities table, created_by columns |
| `supabase/functions/create-user/index.ts` | CREATE | Edge function for user registration |
| `src/pages/Auth.tsx` | MODIFY | Add registration tab |
| `src/pages/UserManagement.tsx` | CREATE | Admin user management page |
| `src/hooks/useAuth.tsx` | MODIFY | Add capabilities support |
| `src/hooks/useCapabilities.tsx` | CREATE | Hook for capability checking |
| `src/App.tsx` | MODIFY | Add UserManagement route |
| `src/pages/Index.tsx` | MODIFY | Add capability guards, created_by on data |
| `src/pages/DailyTracker.tsx` | MODIFY | Add capability guards, created_by on data |
| `src/pages/InvoiceGenerator.tsx` | MODIFY | Add capability guards, created_by on data |
| `src/components/DashboardLayout.tsx` | MODIFY | Show user name in header |

---

### Implementation Order

1. **Database migrations** - Add enum value, create tables, add columns
2. **Update RLS policies** - New policies for data visibility
3. **Create edge function** - User registration with passcode generation
4. **Update useAuth hook** - Add capabilities support
5. **Create UserManagement page** - Admin interface for users
6. **Update Auth page** - Add registration flow
7. **Add capability guards** - Protect features throughout app
8. **Update data submission** - Add created_by to all records
9. **Update navigation** - Show/hide based on capabilities

---

### Technical Notes

- The `created_by` column will be nullable initially to preserve existing data
- Existing records will be accessible to admin only (no created_by set)
- New security definer functions needed for capability checking
- Admin capability assignment uses direct database operations (not edge function) for simplicity
