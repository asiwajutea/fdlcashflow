

## Plan: Redesign About Page + CMS-Driven Leadership Team

### 1. Database: Create `team_members` table

New migration to create a `team_members` table:

```sql
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role text NOT NULL DEFAULT '',
  bio text DEFAULT '',
  image_url text DEFAULT '',
  display_order integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage team members" ON public.team_members FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read published team members" ON public.team_members FOR SELECT USING (is_published = true);
```

### 2. CMS: Create `CMSTeamMembers.tsx`

Follow the exact same pattern as `CMSPartners.tsx` — a CRUD page with a table and dialog for adding/editing team members (full_name, role, bio, image_url, display_order, is_published).

### 3. Register CMS page

- **`App.tsx`**: Add route `/cms/team` → `CMSTeamMembers`
- **`CMSDashboard.tsx`**: Add "Team Members" link card to the CMS dashboard grid

### 4. Redesign `About.tsx`

Complete visual overhaul matching the homepage's premium editorial aesthetic:

- **Hero**: Full-width cinematic banner with a background image, gradient overlays, glassmorphic badge, and animated text (matching homepage hero style but shorter height)
- **Our Story**: Split layout with scroll-triggered `animate-slide-in-left/right`, decorative offset border on image, floating stat card — same pattern as homepage "About Snapshot"
- **Vision & Mission**: Large asymmetric cards with icon containers, gradient accents
- **Core Values**: Animated grid with `useInView` fade-up, hover scale transitions, rounded-2xl cards
- **Leadership Team**: Fetched from `team_members` table. Cards with real photos (or gradient fallback), hover overlay effects showing bio, scroll-triggered animations
- **Stats Bar**: Animated counters (years in business, team size, projects, etc.) using the `useCounter` hook from homepage
- **CTA Section**: Full-width gradient section with call-to-action buttons linking to Contact/Services

All sections use the `useInView` intersection observer hook for scroll-triggered entrance animations, matching the homepage patterns exactly.

### Files Changed
| File | Action |
|------|--------|
| Migration SQL | Create `team_members` table |
| `src/pages/cms/CMSTeamMembers.tsx` | New — CRUD for team members |
| `src/pages/cms/CMSDashboard.tsx` | Add Team Members link |
| `src/App.tsx` | Add `/cms/team` route |
| `src/pages/public/About.tsx` | Full redesign |

