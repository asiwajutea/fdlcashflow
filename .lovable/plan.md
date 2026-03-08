

## Plan: Custom Role Management with Capability Templates

### Current State
- Roles are hardcoded as an enum (`app_role`: admin, employee, guest, candidate) in the database
- Capabilities are assigned per-user individually
- No concept of "role templates" — each user's capabilities are managed one by one

### Approach
Rather than modifying the database enum (which would require migration for every new role), create a **custom_roles** table that acts as capability templates. Admins can create named roles with pre-defined capability sets, then apply a role template to users (bulk-assigning capabilities). The underlying `user_roles` enum and `user_capabilities` table remain unchanged — custom roles are a UI/management layer on top.

### Database Changes

**New table: `custom_roles`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| name | text (unique) | e.g. "Finance Manager", "HR Lead" |
| description | text | Optional |
| capabilities | jsonb | Array of capability IDs |
| created_by | uuid | Admin who created it |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS**: Admins can CRUD, authenticated users can read.

### UI Changes (in `src/pages/UserManagement.tsx`)

1. **New "Manage Roles" section/tab** above the users table with:
   - List of custom roles showing name, description, capability count
   - "Create Role" button → dialog with name, description, and capability checklist
   - Edit/delete buttons per role

2. **Enhanced user creation & edit dialogs**: Add a "Apply Role Template" dropdown that, when selected, bulk-assigns all capabilities from that custom role to the user

3. **Enhanced capabilities dialog**: Add a quick-apply dropdown at the top — "Apply from role template" — that checks all capabilities defined in the selected custom role

### Files Changed
| File | Action |
|------|--------|
| Migration | Create `custom_roles` table with RLS |
| `src/pages/UserManagement.tsx` | Add role management UI section, role template application in capabilities dialog |

