

## Plan: Fix 4 Issues — Profile Cropping, Role Template Badge, Capability Save, Add Job Capability

### Issue 1: Profile picture cropping + edit from profile page

**Current state:** ProfileSetup is a one-time upload page with no cropping. No way to edit profile details after initial setup.

**Fix:**
- Add a `react-image-crop` dependency and integrate a crop modal into ProfileSetup. After selecting an image, show a crop UI where users can adjust the crop area. The cropped image is then uploaded.
- Create a new "My Profile" page (`src/pages/Profile.tsx`) accessible from the sidebar/dashboard that shows the user's current avatar, full name, and allows editing both the photo (with crop) and name. Add a route `/profile` and a sidebar link.

### Issue 2: Role Template badge shows stale count (8 instead of 7)

**Current state:** In `RoleManagement.tsx`, the capabilities badge reads from the `custom_roles` table data. After editing a role template, `fetchRoles()` is called — but the `custom_roles` table row may not have been updated if the admin edited capabilities via the User Management capabilities dialog instead of the Role Templates tab.

**Actual root cause:** The badge in the Role Templates table correctly shows whatever is in the DB. The issue is the admin updated the Employee template to 7 capabilities but the DB still has 8. This means the role template update (`handleSave` in RoleManagement) might be failing silently, OR the admin edited capabilities on the *user* (not the template). The template itself still has 8.

**Fix:** After the admin edits and saves a role template, force re-fetch. Also ensure `handleSave` properly saves — it looks correct. The real fix is: when editing the Role Template, the save works, but the badge needs to reflect the DB state. We should add an explicit re-fetch after save. Also add a "Sync" feature: when editing a role template, offer to apply the updated capabilities to all users with that role.

### Issue 3: Capability toggle not saving for adeolabunmi53@gmail.com

**Root cause found:** In `handleCapabilityToggle` (line 192), the insert includes `granted_by: user?.id` — but the `user_capabilities` table only has columns `id`, `user_id`, `capability`. There is NO `granted_by` column. The typed Supabase client would reject this, causing a silent failure (the toast says "Capability Added" but the insert actually errored).

**Fix:** Remove `granted_by` from the insert call in `handleCapabilityToggle`. Change line 194 from:
```ts
.insert({ user_id: userId, capability, granted_by: user?.id });
```
to:
```ts
.insert({ user_id: userId, capability });
```

### Issue 4: No "Add Job Position" capability

**Current state:** `ALL_CAPABILITIES` in `useCapabilities.tsx` has `manage_recruitment` but no specific "add job position" capability.

**Fix:** Add a new capability `{ id: 'add_job_position', label: 'Add Job Position', description: 'Create and manage job postings' }` to the `ALL_CAPABILITIES` array. This gives granular control over who can create job listings vs. who can only review applications.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/ProfileSetup.tsx` | Add image cropping UI with react-image-crop |
| `src/pages/Profile.tsx` (new) | Full profile edit page with avatar crop + name editing |
| `src/App.tsx` | Add `/profile` route |
| `src/components/DashboardLayout.tsx` | Add "My Profile" sidebar link |
| `src/pages/UserManagement.tsx` | Remove `granted_by` from capability insert (line 194) |
| `src/hooks/useCapabilities.tsx` | Add `add_job_position` capability |
| `package.json` | Add `react-image-crop` dependency |

### Technical Details

- **Crop library:** `react-image-crop` — lightweight, well-maintained, supports aspect ratio locking (1:1 for avatars)
- **Crop flow:** Select image → show crop overlay → user adjusts → "Crop & Upload" button → canvas draws cropped region → uploads blob
- **Capability fix:** The `granted_by` field doesn't exist in the DB schema, causing every individual capability toggle to fail silently

