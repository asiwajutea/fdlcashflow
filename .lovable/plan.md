## Issue 1 — My Payslips says "not linked"

The page queries `employees.user_id = auth.uid()` once in `useEffect`. The record IS linked in the DB (`user_id = cd09a787…`), so the most likely causes are stale state from the moment before the admin linked the record, and the absence of any fallback lookup.

**Fix in `src/pages/employee/MyInvoices.tsx`:**
- Convert the data fetch to a `useQuery` so it re-runs on tab focus / cache invalidation instead of a one-shot `useEffect`.
- Look up the employee with a broader query: `user_id = auth.uid()` OR `profile_id = auth.uid()` OR `lower(email) = lower(auth email)` (single round-trip using `.or(...)`).
- Only show the "not linked" message after the query finishes AND no row is found.

## Issue 2 — Finance page is blank

The `/finance` and `/my-finance` routes are not capability-gated (anyone signed in can hit them). The blank screen is a render-time issue, not access. Most likely culprits in `src/pages/employee/Finance.tsx`:

- `user!.id` is dereferenced before `useAuth` finishes loading.
- `Pie` is rendered with an empty `categoryBreakdown` and a `label` callback, which Recharts can throw on.
- `RequestsList` passes `userId={user!.id}` unconditionally.

**Fix in `src/pages/employee/Finance.tsx`:**
- Add an auth-loading guard at the top: return a small skeleton/spinner while `useAuth().loading` is true or `user` is null.
- Make Pie / Area charts no-op when their data array is empty (render a muted "No data yet" placeholder instead).
- Stop dereferencing `user!` — pass `user?.id ?? ''` and guard child components.
- Wrap the main render in a top-level try-safe structure so a single sub-section error cannot blank the whole page (early return for the specific section instead of letting it bubble).
- Keep the route open to all signed-in users (no CapabilityGuard change needed).

## Files touched
- `src/pages/employee/MyInvoices.tsx` — switch to `useQuery`, broaden employee lookup, fix loading state.
- `src/pages/employee/Finance.tsx` — auth loading guard, safe chart rendering, remove `user!` non-null assertions.

No DB migrations, no schema changes, no capability changes.