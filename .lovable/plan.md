
## Implementation Plan: User Management, Capability Guards, and Sign Up Flow

### Overview
This plan implements four key features:
1. Navigation link to User Management for admins
2. Capability guards on the Index page
3. Adding `created_by` field to data submissions
4. User sign-up flow with admin-controlled passcode generation

---

### 1. Add Navigation Link to User Management

**File: `src/pages/Index.tsx`**

Add a "User Management" button in the Quick Actions section, visible only to admin users:

```tsx
{role === 'admin' && (
  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/user-management')}>
    <Users className="h-4 w-4" />
    User Management
  </Button>
)}
```

**Location**: Inside the Quick Actions card, after other buttons (around line 572).

---

### 2. Add Capability Guards to Index Page

**File: `src/pages/Index.tsx`**

Import and use the capabilities hook:

```tsx
import { useCapabilities } from '@/hooks/useCapabilities';

// Inside component:
const { hasCapability } = useCapabilities(user?.id || null);
```

**Guard the following elements:**

| Element | Capability Required |
|---------|---------------------|
| WeeklyDataEntry component | `enter_weekly_data` |
| Rates tab | `manage_rates` |
| History tab | `view_weekly_history` |
| Generate Invoice button | `generate_invoice` |
| Bulk Invoice button | `bulk_invoice` |
| Company Settings button | `manage_company_settings` |
| Daily Tracker button | `view_daily_tracker` |
| User Management button | `manage_users` |

**Implementation approach:**
- Wrap Quick Action buttons with capability checks
- Disable/hide tabs based on capabilities
- Show admin users ALL features (admins bypass capability checks)

---

### 3. Update Data Submission Functions with `created_by`

**Files to modify:**

#### `src/pages/Index.tsx` - Weekly Records
In `handleWeeklyDataSubmit` function, add `created_by` to the insert:

```tsx
const { error } = await supabase.from('weekly_records').insert({
  // ... existing fields
  created_by: user?.id  // Add this field
});

// Also add to daily_transactions insert:
await supabase.from('daily_transactions').insert({
  // ... existing fields
  created_by: user?.id  // Add this field
});
```

#### `src/hooks/useTransactions.ts` - Daily Transactions
Modify the `createMutation` to accept and include `created_by`:

```tsx
mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'> & { created_by?: string }) => {
  const { data, error } = await supabase
    .from('daily_transactions')
    .insert(transaction)
    // ...
}
```

#### `src/pages/DailyTracker.tsx` - Transaction Creation
Pass `created_by` when creating transactions:

```tsx
const handleSave = (data: any) => {
  if (editTransaction) {
    updateTransaction(data);
  } else {
    createTransaction({ ...data, created_by: user?.id });
  }
  setEditTransaction(null);
};
```

This requires adding `useAuth` hook to DailyTracker.tsx.

#### `src/pages/InvoiceGenerator.tsx` - Invoice Creation
Add `created_by` to invoice inserts in `saveInvoice` function and any other invoice creation logic.

---

### 4. Add Sign Up to Auth Page

**File: `src/pages/Auth.tsx`**

Create a tabbed interface with "Sign In" and "Sign Up" tabs.

**Sign Up Flow:**
1. User enters: Email, Password, Confirm Password, Full Name
2. User creates their own password (stored securely via Supabase Auth)
3. Account is created with NO passcode (passcode = null or placeholder)
4. User sees message: "Account created! Please contact admin for your access code."
5. User cannot login until admin generates a passcode

**Sign Up Implementation:**

```tsx
const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (signupData.password !== signupData.confirmPassword) {
    toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
    return;
  }

  // Create user via Supabase Auth (password stored securely)
  const { data, error } = await supabase.auth.signUp({
    email: signupData.email,
    password: signupData.password,
    options: {
      data: {
        full_name: signupData.fullName,
        role: 'employee',
        passcode: null  // No passcode yet - admin will generate
      }
    }
  });

  if (error) throw error;
  
  // Show success message
  toast({
    title: "Account Created",
    description: "Your account has been created. Please contact the administrator for your access code to complete login."
  });
  
  // Switch back to login tab
  setActiveTab('login');
};
```

**Updated Login Flow:**
- User enters Email, Password (their own), and Access Code (admin-generated passcode)
- Verify password via Supabase Auth
- Verify passcode from profiles table
- Both must match to allow login

**UI Changes:**
- Add Tabs component with "Sign In" and "Sign Up" tabs
- Sign Up form: Email, Password, Confirm Password, Full Name
- Sign In form: Email, Password, Access Code (existing)
- After signup, show clear instructions about needing admin to generate passcode

---

### Updated User Management Flow

**File: `src/pages/UserManagement.tsx`**

When admin creates/views a user:
1. Users who signed up will have `passcode: null` initially
2. Admin clicks "Generate Passcode" to create an 8-digit code
3. Passcode is shown to admin to share with user
4. Admin can also update user's password if needed

**New users created by admin:**
- Admin can still create users directly with auto-generated passcodes
- Or approve self-registered users by generating their passcode

---

### Files to Create/Modify Summary

| File | Action | Changes |
|------|--------|---------|
| `src/pages/Index.tsx` | MODIFY | Add capability guards, created_by to submissions, User Management link |
| `src/pages/Auth.tsx` | MODIFY | Add Sign Up tab with registration form |
| `src/pages/DailyTracker.tsx` | MODIFY | Add useAuth hook, pass created_by |
| `src/hooks/useTransactions.ts` | MODIFY | Accept created_by parameter |
| `src/pages/InvoiceGenerator.tsx` | MODIFY | Add created_by to invoice saves |

---

### Technical Notes

1. **Admin Bypass**: Admins should see all features regardless of capabilities. Add check:
   ```tsx
   const canAccess = (cap: string) => role === 'admin' || hasCapability(cap);
   ```

2. **Pending Users**: Users who signed up but have no passcode cannot login. Consider adding visual indicator in User Management.

3. **Security**: Passwords are handled by Supabase Auth (hashed). Passcodes are stored in profiles table for additional verification.

4. **created_by Handling**: The database already has nullable `created_by` columns. New records will populate this field; existing records remain accessible to admins only.
