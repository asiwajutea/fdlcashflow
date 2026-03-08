

## Plan: Add Navigation Menu to DashboardLayout

### Problem
The `DashboardLayout` header only has a clickable logo that goes to `/dashboard` — there's no navigation menu. Once a user navigates to a sub-page like `/cms`, they have no way to reach other sections without using the browser back button.

### Solution
Add a dropdown navigation menu to the `DashboardLayout` header that provides links to all major sections, filtered by the user's capabilities. This keeps the header compact while making all pages accessible.

### Changes

#### `src/components/DashboardLayout.tsx`
- Import `DropdownMenu` components and relevant icons
- Import `useCapabilities` hook
- Add a **hamburger/menu button** next to the logo (or a "Navigation" dropdown)
- Inside the dropdown, list navigation links filtered by capability:
  - **Dashboard** → `/dashboard` (always visible)
  - **Generate Invoice** → `/generate-invoice` (requires `generate_invoice`)
  - **Bulk Invoice** → `/bulk-invoice` (requires `bulk_invoice`)
  - **Company Settings** → `/company-settings` (requires `manage_company_settings`)
  - **Daily Tracker** → `/daily-tracker` (requires `view_daily_tracker`)
  - **User Management** → `/user-management` (admin only)
  - **HR Recruitment** → `/applications` (requires `manage_recruitment`)
  - **Website CMS** → `/cms` (requires `manage_website_content`)
  - **Job Openings** → `/jobs` (always visible)
  - **Inbox** → `/inbox` (always visible)
- Highlight the current route using `useLocation`

### Files Changed
| File | Action |
|------|--------|
| `src/components/DashboardLayout.tsx` | Add dropdown navigation menu with capability-based links |

No other files need changes.

