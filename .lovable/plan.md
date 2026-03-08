

## Plan: Two-Step Login — Email/Password First, Then Access Code for Employees

### Problem
The login form requires all users (including candidates) to provide an access code upfront, even though candidates don't need one.

### Solution
Convert login to a two-step flow on a single page:

**Step 1 — Email + Password** (all users)
- Remove the access code field from the initial login form
- On submit, authenticate with Supabase, then check the user's role
- If **candidate**: login complete, navigate to `/dashboard`
- If **employee/admin**: proceed to Step 2

**Step 2 — Access Code** (employees only)
- Show a new UI state with an access code input (styled nicely, e.g. using the OTP input component)
- Sign the user out temporarily (or keep session but block navigation) until code is verified
- On submit, verify passcode against `profiles.passcode`
- If valid: navigate to `/dashboard`
- If invalid or pending (`00000000`): sign out and show error

### Implementation — Single File Change: `src/pages/Auth.tsx`

1. Add a `loginStep` state: `'credentials' | 'passcode'`
2. Store the authenticated user temporarily after Step 1
3. **Step 1 form**: Only email + password fields. On success, check role:
   - Candidate → done, navigate away
   - Employee → set `loginStep = 'passcode'`, keep the session alive but don't navigate
4. **Step 2 form**: Show access code input with a back button. On success → navigate to `/dashboard`. On failure → sign out + error toast
5. Remove the access code `<Input>` from the current combined form
6. Remove `passcode` from `loginData` state, add it as separate state for Step 2

No database changes needed. No other files affected.

