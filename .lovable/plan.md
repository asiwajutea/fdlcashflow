

## Phase 1: HR Recruitment Module Foundation

This phase establishes the database structure, new role, storage, and the first two user-facing pages (Job Listings and Application). Subsequent phases will add screening, interviews, contracts with digital signatures, and candidate-to-employee conversion.

---

### What Phase 1 Includes

1. Add `candidate` role to `app_role` enum
2. Create 6 new database tables with RLS
3. Create 2 storage buckets (resumes, contracts)
4. Add new HR capabilities to the system
5. Build 2 new pages: `/jobs` (public job listings) and `/apply` (application form with resume upload)
6. Add an `/applications` admin page for reviewing submissions
7. Update Auth page to support candidate registration flow
8. Wire navigation links for admin users

### What Later Phases Will Add

- Screening questionnaires and scoring
- Interview scheduling with meeting links
- Contract generation, digital signature canvas, and PDF embedding
- Candidate-to-employee conversion workflow
- Email notifications
- AI candidate scoring

---

### Database Changes (Single Migration)

**1. Alter `app_role` enum:**
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'candidate';
```

**2. New Tables:**

| Table | Purpose |
|-------|---------|
| `job_positions` | Job openings managed by admin |
| `candidates` | Extended profile for candidate users |
| `applications` | Links candidates to jobs |
| `screening_responses` | Questionnaire answers (empty for now, structure only) |
| `interviews` | Interview records |
| `contracts` | Contract tracking with signature data |

All tables will have:
- UUID primary keys with `gen_random_uuid()`
- Timestamps (`created_at`, `updated_at`)
- Proper foreign keys (candidates.user_id references profiles.id, not auth.users)
- RLS policies using existing `is_admin()` and `has_capability()` functions

**3. RLS Policy Summary:**
- `job_positions`: Admin full CRUD; all authenticated users can SELECT (to browse jobs)
- `candidates`: Admin sees all; candidates see only their own record (`user_id = auth.uid()`)
- `applications`: Admin sees all; candidates see own applications
- `screening_responses`, `interviews`, `contracts`: Admin full access; candidates see own (via application join)

**4. Storage Buckets:**
- `resumes` bucket (authenticated uploads, admin + owner read)
- `contracts` bucket (admin upload, admin + owner read)

**5. New Capabilities:**
Add to `ALL_CAPABILITIES` in `useCapabilities.tsx`:
- `manage_recruitment` - Admin: manage job postings and review applications
- `review_applications` - View and process applications
- `schedule_interviews` - Set interview dates
- `generate_contracts` - Create contracts
- `submit_application` - Candidate: apply for jobs
- `complete_screening` - Candidate: fill screening form
- `view_interview` - Candidate: see interview details
- `sign_contract` - Candidate: sign contracts

---

### New Pages

**`/jobs` - Job Listings**
- Public to all authenticated users
- Card grid showing open positions with title, department, description
- "Apply" button links to `/apply?jobId=<id>`
- Admin sees "Manage Jobs" button to create/edit/close positions

**`/apply` - Application Form**
- For candidates (and self-registering users)
- Fields: cover letter textarea, resume file upload (to `resumes` bucket)
- On submit: creates `candidates` record if first application, then creates `applications` record
- Shows confirmation with "Your application has been submitted"

**`/applications` - HR Dashboard (Admin)**
- Table of all applications with candidate name, job title, status, date
- Status badges: submitted, screening, interview, offered, hired, rejected
- Action buttons to change status (approve/reject)
- Click to view candidate details and resume

---

### Auth Page Updates

- Add a third option or modify sign-up to allow selecting "I'm applying for a job"
- When selected, the user metadata includes `role: 'candidate'` instead of `'employee'`
- The `handle_new_user` trigger will assign the `candidate` role automatically
- Candidates with passcode `'00000000'` can still not log in until admin approves -- OR we allow candidates to log in without a passcode (to be decided in the flow)

**Candidate login consideration:** Since candidates need to submit applications, they should be able to log in. The plan will allow candidates to bypass the passcode requirement (passcode check skipped for `candidate` role), since they have limited access anyway. Admin can later convert them to employee with a real passcode.

---

### Navigation Updates

- Add "Recruitment" button in Quick Actions (admin only, guarded by `manage_recruitment`)
- Add `/jobs`, `/apply`, `/applications` routes to `App.tsx`

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Migration SQL | CREATE | New tables, enum, RLS, storage buckets |
| `src/hooks/useCapabilities.tsx` | MODIFY | Add 8 new HR capabilities |
| `src/pages/Jobs.tsx` | CREATE | Job listings page |
| `src/pages/Apply.tsx` | CREATE | Application form with resume upload |
| `src/pages/Applications.tsx` | CREATE | Admin HR dashboard |
| `src/pages/Auth.tsx` | MODIFY | Add candidate registration option |
| `src/pages/Index.tsx` | MODIFY | Add Recruitment quick action for admin |
| `src/App.tsx` | MODIFY | Add 3 new routes |
| `supabase/functions/create-user/index.ts` | MODIFY | Handle candidate role default capabilities |

### Technical Notes

- Resume uploads use Supabase Storage with path pattern `{user_id}/{filename}`
- The `candidates` table is separate from `profiles` to avoid modifying existing tables
- Digital contract signing with canvas will be implemented in Phase 2
- The `candidate` role in `app_role` enum is permanent and cannot be removed once added (Postgres limitation)
- Candidates bypass passcode verification at login since they only access job-related features

