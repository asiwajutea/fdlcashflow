## Plan: Job Position Enhancements, Application Layout, and Header Fixes

### 1. Database Migration

Add new optional columns to `job_positions`:


| Column                  | Type | Default                                    |
| ----------------------- | ---- | ------------------------------------------ |
| `key_responsibilities`  | text | `''`                                       |
| `job_type`              | text | `''` (e.g. Full-time, Part-time, Contract) |
| `compensation`          | text | `''`                                       |
| `work_location_country` | text | `''`                                       |
| `work_location_state`   | text | `''`                                       |
| `media_url`             | text | `NULL`                                     |


---

### 2. Jobs Page (`/jobs`) - Beautiful Card Redesign

Each job card will show:

- Job media image (if `media_url` exists, displayed as a card header image)
- Job title (prominent)
- Department badge
- AI-generated short summary of description (first ~120 chars of description with ellipsis)
- Location (country + state, with MapPin icon)
- Job type badge (Full-time, Part-time, etc.)
- "Apply Now" button

Admin controls (edit/delete) remain but are placed as icon buttons in the card corner.

The create/edit dialog will be updated with the new optional fields: Key Responsibilities, Requirements, Job Type, Compensation, Work Location (country + state inputs).

---

### 3. Apply Page (`/apply`) - Side-by-Side Layout

**Left side (sticky):** Job info card with:

- Job media (if any)
- Title, department, description, key responsibilities, requirements, job type, compensation, location
- Sticky positioning (`sticky top-24`)

**Right side:** Application form with:

- Phone, Education, Experience Summary, Cover Letter
- Resume upload marked as **optional** with hint text: "Uploading a resume significantly increases your chances of being hired"
- Submit button

**Back button** added at the top of the page using `ArrowLeft` icon + "Back to Jobs" linking to `/jobs`.

---

### 4. Header Fixes (`DashboardLayout.tsx`)

**Visibility fix:** The header text uses `text-slate-800` which is invisible on white backgrounds in light mode. Fix:

- Change `text-slate-800` on the title "FDL Cashflow" to `text-foreground`
- Change the dashboard title `text-slate-800` to `text-foreground`

**Rebrand:** Replace all instances of "FDL Cashflow" with "FDL Workforce" across:

- `src/components/DashboardLayout.tsx` (header title)
- `index.html` (page title if present)
- Any other occurrences

---

### Files to Modify


| File                                 | Changes                                                                      |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Migration SQL                        | Add 6 columns to `job_positions`                                             |
| `src/pages/Jobs.tsx`                 | Redesign cards, update create/edit form with new fields                      |
| `src/pages/Apply.tsx`                | Side-by-side layout, sticky job info, optional resume with hint, back button |
| `src/components/DashboardLayout.tsx` | Fix text colors, rename to "FDL Workforce"                                   |
| `index.html`                         | Update page title to "FDL Workforce"                                         |


### Technical Notes

- Country and state fields are simple text inputs (no external geo API needed; user types manually)
- Job card description preview is truncated client-side using `line-clamp-2`
- Resume hint uses a muted info-style text with a lightbulb or info icon
- The sticky job panel uses `lg:sticky lg:top-24` so it only sticks on desktop; on mobile it stacks normally above the form