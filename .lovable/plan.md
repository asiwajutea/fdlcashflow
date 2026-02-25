

## Plan: Apply Page Redesign, Candidate Dashboard, Inbox System, Profile Pictures, and Social Media Links

This is a large set of features. The implementation will be broken into 6 parts.

---

### Part 1: Apply Page -- Swap Sticky Sides + Accordion Job Details

The current layout has job info on the left (sticky) and form on the right. The request is to make the **form sticky** on the right and the **job details scrollable** on the left, with accordion sections.

**Changes to `src/pages/Apply.tsx`:**
- Swap: Left side becomes the scrollable job details, right side becomes the sticky application form
- Replace the flat job info sections with a Radix Accordion (`type="single"` with `collapsible` and `defaultValue` on the first item)
- Accordion sections: Description, Key Responsibilities, Requirements, Compensation, Location
- The form card gets `lg:sticky lg:top-24` positioning
- Polish the overall card styling with subtle gradients and spacing

---

### Part 2: Candidate Dashboard (New Welcome Page)

Candidates currently land on `/jobs` after login. Instead, they should land on a dedicated candidate dashboard at `/` that shows:

**Changes to `src/pages/Index.tsx`:**
- Detect `role === 'candidate'` early in the render
- When candidate, render a completely different dashboard instead of the financial one:
  - **Welcome card** with user name
  - **My Applications** section: Fetch the candidate's applications with status badges and action buttons (e.g., "Complete Screening", "View Interview", "Sign Contract") based on current application status
  - **Job Openings** card linking to `/jobs`
  - **Company Social Media** links (fetched from `company_settings`)
  - No MetricCards, no financial tabs, no budget/expense components

This means the financial overview (weekly income/expense, cashflow) and Budget/Expense tabs are completely hidden for candidates.

**Changes to `src/pages/Auth.tsx`:**
- After candidate login, navigate to `/` instead of `/jobs` (candidates will see their dashboard)

---

### Part 3: Social Media Links in Company Settings

**Database migration:**
- Add columns to `company_settings`: `social_facebook TEXT`, `social_twitter TEXT`, `social_instagram TEXT`, `social_linkedin TEXT`, `social_youtube TEXT`, `social_tiktok TEXT`, `social_website TEXT`

**Changes to `src/pages/CompanySettings.tsx`:**
- Add a new "Social Media" section with input fields for each platform URL
- Save/load these alongside existing settings

**Candidate dashboard** will read these links and display them as clickable icons.

---

### Part 4: Inbox / Messaging System

**Database migration -- new tables:**

| Table | Columns |
|-------|---------|
| `messages` | `id`, `sender_id` (UUID, ref profiles), `recipient_id` (UUID, ref profiles), `subject`, `body`, `parent_message_id` (for replies), `is_read` (bool), `created_at` |

RLS: Users can SELECT/INSERT messages where they are sender or recipient. Admins can see all.

Enable realtime on `messages` table for live notifications.

**New files:**
- `src/pages/Inbox.tsx` -- Full inbox page with two-panel layout: message list on left, message detail on right
  - Shows received messages with unread indicator
  - "Compose" button to send new messages
  - Reply functionality within message thread view
  - Messages look like emails with subject line and body
- `src/components/InboxCompose.tsx` -- Dialog to compose a new message, with recipient selector (dropdown of users), subject, body

**New route:** `/inbox` added to `App.tsx`

**Navigation:** Add inbox icon with unread count badge in the `DashboardLayout` header

**New capabilities:** `view_inbox`, `send_messages`

---

### Part 5: Application Stage Email/Message Templates

When an admin moves an application through stages (submitted -> screening -> interview -> offered -> hired), an automated message is sent to the candidate's inbox.

**Changes to `src/pages/Applications.tsx`:**
- After successfully updating application status, insert a message into `messages` table with:
  - `sender_id`: admin's user ID
  - `recipient_id`: candidate's user ID
  - `subject`: Stage-specific template (e.g., "Your application has moved to Screening")
  - `body`: Detailed template with job title, next steps, and instructions
- Templates for each stage transition:
  - **Screening**: "You've been selected for screening. Please complete the questionnaire."
  - **Interview**: "Congratulations! An interview has been scheduled for you."
  - **Offered**: "We're pleased to extend an offer. Please review and sign your contract."
  - **Hired**: "Welcome aboard! You've been officially hired."

Candidates can reply to these messages through the inbox.

---

### Part 6: Mandatory Profile Picture Upload

**Database migration:**
- Add `avatar_url TEXT` to `profiles` table (if not already present)

**Storage bucket:**
- Create `avatars` bucket (public) with RLS policies for user uploads

**New page: `src/pages/ProfileSetup.tsx`:**
- Shows after first login if `avatar_url` is null
- Image upload with preview
- Uploads to `avatars/{user_id}/avatar.png`
- Saves URL to `profiles.avatar_url`
- Cannot be skipped -- must upload before proceeding

**Changes to `src/App.tsx`:**
- Add `/profile-setup` route
- Add a wrapper/guard component that checks if `avatar_url` is set; if not, redirect to `/profile-setup`

**Changes to `src/components/DashboardLayout.tsx`:**
- Replace the `User` icon with the actual avatar image from `profiles.avatar_url`
- Show as a small circular avatar in the header

**Changes to `src/hooks/useAuth.tsx`:**
- Add `avatarUrl` to the `UserProfile` interface
- Fetch `avatar_url` from profiles alongside `full_name`

**Permissions updates to `src/hooks/useCapabilities.tsx`:**
- Add new capabilities: `view_inbox`, `send_messages`

---

### Database Migrations Summary

**Migration 1: Company social media columns**
```text
ALTER TABLE company_settings ADD COLUMN social_facebook TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN social_twitter TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN social_instagram TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN social_linkedin TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN social_youtube TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN social_tiktok TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN social_website TEXT DEFAULT '';
```

**Migration 2: Messages table**
```text
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: users see own sent/received; admins see all
-- Enable realtime
```

**Migration 3: Avatar URL on profiles**
```text
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
```

**Storage bucket:**
```text
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- RLS for user uploads
```

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Inbox.tsx` | Full inbox page with message list and detail view |
| `src/components/InboxCompose.tsx` | Compose new message dialog |
| `src/pages/ProfileSetup.tsx` | Mandatory profile picture upload page |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Apply.tsx` | Swap sticky sides, add accordion for job details |
| `src/pages/Index.tsx` | Add candidate dashboard branch, hide financial content for candidates |
| `src/pages/Auth.tsx` | Change candidate redirect to `/` |
| `src/pages/CompanySettings.tsx` | Add social media link inputs |
| `src/pages/Applications.tsx` | Send inbox messages on status change |
| `src/components/DashboardLayout.tsx` | Add inbox icon with badge, avatar image, inbox nav link |
| `src/hooks/useAuth.tsx` | Add `avatarUrl` field |
| `src/hooks/useCapabilities.tsx` | Add `view_inbox`, `send_messages` capabilities |
| `src/App.tsx` | Add `/inbox`, `/profile-setup` routes, add avatar guard |

---

### Technical Details

- Accordion uses `@radix-ui/react-accordion` (already installed) with `type="single"` and `collapsible` for auto-close behavior
- Messages use realtime subscription for live unread count updates in the header
- Avatar guard uses a wrapper component that checks `avatarUrl` from `useAuth` and redirects to `/profile-setup` if null
- Profile pictures are stored in a public `avatars` bucket; the URL is stored in `profiles.avatar_url`
- Application stage messages are inserted server-side (from the admin's client) after status update succeeds
- The candidate dashboard queries `applications` joined with `job_positions` to show status and available actions

