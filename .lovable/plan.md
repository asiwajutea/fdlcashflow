## Plan: Fix Three Issues

### Issue 1: Public nav should reflect login state

**Problem:** When a user is logged in, the PublicLayout header still shows "Employee Login" and "Apply for Job" buttons.
**Solution:** Import and use `useAuth` in `PublicLayout.tsx`. When `user` is logged in, replace those two buttons with a "Go to Dashboard" button (and show the user's name/avatar).

**Changes:**

- `src/components/PublicLayout.tsx`: Import `useAuth`, conditionally render dashboard link vs login/apply buttons in both desktop and mobile menus.

---

### Issue 2: Employee Management 404

**Problem:** `DashboardLayout.tsx` nav links to `/employee-management` (line 47), but `App.tsx` registers the route as `/employees` (line 142).
**Solution:** Update the nav path in `DashboardLayout.tsx` from `/employee-management` to `/employees` to match the actual route.

**Changes:**

- `src/components/DashboardLayout.tsx`: Change path from `/employee-management` to `/employees`.

---

### Issue 3: Role update and passcode display not working

**Problem:** Two sub-issues:

1. **Passcode not showing:** The `get-users` edge function reads `profileResult.data?.is_active` (line 69) but the `profiles` table has no `is_active` column — it defaults to `true` via `??`. The passcode itself (`profileResult.data?.passcode`) should work. However, the `profiles` RLS policy only allows users to read their **own** profile (`id = auth.uid()`), but the edge function uses the **service role key** which bypasses RLS. So the passcode fetch should work server-side. The likely issue is that the passcode value in the database is the default `'00000000'` and the eye toggle reveals it but it looks "empty" or confusing. Need to verify the get-users function is actually returning passcode data correctly.
2. **Role update not working:** The `update-user` edge function updates `user_roles` with `.update({ role }).eq('user_id', user_id)`. The `role` column is of type `app_role` enum which has values `admin`, `employee`, `guest` (not `candidate`). If updating from `guest` to `employee`, this should work. The issue may be that the `update-user` function validates against `['admin', 'employee', 'guest']` (line 93) but the enum `app_role` might not include all values, or there could be a silent error not surfaced to the UI.

**Root cause identified:** The `update-user` function's role update uses `.update({ role })` which sets the column value. But the `app_role` enum values need to match exactly. Looking at the `handle_new_user` trigger, it casts to `app_role` — the enum includes `admin`, `moderator`, `user` based on the standard template, but the actual database shows roles like `employee`, `guest`, `candidate`. The edge function validates `['admin', 'employee', 'guest']` which should be fine.

**Most likely cause for role update failure:** The response from `update-user` doesn't report individual operation errors — if the role update SQL fails silently (no matching row, or constraint violation), it returns `success: true` anyway. Need to add error checking on the role update operation.

**Changes:**

- `supabase/functions/update-user/index.ts`: Add proper error handling for the role update query (check for errors after the `.update()` call). Also add error handling for profile updates.
- `supabase/functions/get-users/index.ts`: The passcode display issue — verify the function returns passcode. It does (line 68). The client-side code toggles visibility correctly. The issue may be that some users have `null` passcode. Ensure the UI handles null gracefully.
- `src/pages/UserManagement.tsx`: Update passcode display to show "Not set" when passcode is null instead of showing dots.

---

### Summary of file changes


| File                                      | Change                                      |
| ----------------------------------------- | ------------------------------------------- |
| `src/components/PublicLayout.tsx`         | Add auth-aware header buttons               |
| `src/components/DashboardLayout.tsx`      | Fix `/employee-management` → `/employees`   |
| `supabase/functions/update-user/index.ts` | Add error handling for role/profile updates |
| `src/pages/UserManagement.tsx`            | Handle null passcode display                |
