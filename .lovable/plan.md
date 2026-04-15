

## Plan: Fix Employee Login After Passcode + Build Error

### Problem Analysis

Two issues found:

1. **Race condition in passcode verification**: After `signInWithPassword` succeeds in step 1, the Supabase auth client fires `onAuthStateChange`. Meanwhile, if a stale refresh token is being processed (visible in console logs as "Invalid Refresh Token"), `getSession()` in step 2 may return null, causing "Session expired" error. Additionally, if the user is signed out by the error handler, the session is lost.

2. **Build error**: `src/pages/cms/CMSHeroSlides.tsx` line 26 has a stray `ng` causing `TS2304: Cannot find name 'ng'`.

### Fix

**`src/pages/Auth.tsx`:**
- Store the authenticated user session from step 1 in component state (`useState`)
- In `handlePasscodeSubmit`, use the stored session instead of calling `getSession()` — this eliminates the race condition entirely
- On passcode failure, don't sign out immediately — just show the error and let them retry. Only sign out if they click "Back to Sign In"

**`src/pages/cms/CMSHeroSlides.tsx`:**
- Remove stray `ng` text on line 26

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Store session from step 1, use in step 2 passcode check; improve error handling |
| `src/pages/cms/CMSHeroSlides.tsx` | Remove stray `ng` on line 26 |

