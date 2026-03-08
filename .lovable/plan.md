

## Plan: Add Section Labels to Navigation Dropdown

### Problem
The hamburger menu lists all nav items in a flat list with only separators — no section headings to help users quickly find what they need.

### Solution
Replace the flat list with grouped sections using `DropdownMenuLabel` for section headings. The current index-based separator logic will be replaced with a structured section-based approach.

### Sections
1. **General** — Dashboard
2. **Invoicing** — Generate Invoice, Bulk Invoice, View Invoices, Statistics
3. **Operations** — Daily Tracker, Employees, Company Settings
4. **Administration** — User Management, HR Recruitment, Website CMS
5. **Other** — Job Openings, Inbox

### Changes

#### `src/components/DashboardLayout.tsx`
- Import `DropdownMenuLabel` from the dropdown-menu UI component
- Restructure `NAV_ITEMS` into a grouped `NAV_SECTIONS` array:
  ```
  [
    { label: 'General', items: [Dashboard] },
    { label: 'Invoicing', items: [Generate, Bulk, View, Statistics] },
    { label: 'Operations', items: [Daily Tracker, Employees, Company Settings] },
    { label: 'Administration', items: [User Management, HR Recruitment, Website CMS] },
    { label: 'Other', items: [Job Openings, Inbox] },
  ]
  ```
- Render each section with a `DropdownMenuLabel` heading + `DropdownMenuSeparator` between sections
- Filter items within each section by capability; hide entire section if no items are visible

| File | Action |
|------|--------|
| `src/components/DashboardLayout.tsx` | Restructure nav items into labeled sections |

