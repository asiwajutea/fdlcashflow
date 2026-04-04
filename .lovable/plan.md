

## Plan: Redesign Hero Section + Fix Employee Login

### Part 1: Hero Section Redesign

**Current state:** Full-screen hero with background images, dark gradient overlays, and text positioned bottom-left.

**Target design (from screenshots):** A split-layout hero with:
- Teal/steel-blue gradient background (no full-bleed image)
- Left side: badge, title, subtitle, and CTA buttons ("Register Now" / "Sign In" style)
- Right side: Featured image in a rounded card with a floating stat badge overlay
- Mobile: Stacked layout — text on top, image below, all centered
- Carousel transitions both the text AND the image card with each slide
- Existing slide navigation dots remain at the bottom

**Data source:** Existing `hero_slides` table (title, accent, subtitle, image_url) — no schema changes needed.

**Changes to `src/pages/public/Home.tsx`:**
- Replace the full-bleed background image hero with a two-column layout
- Background: solid teal-to-dark gradient (matching the screenshots, approximately `from-[#3a8e9e] via-[#357a8a] to-[#2c6070]`)
- Left column: "THE CHURCH OF..." badge becomes the company tagline badge, slide title/accent, subtitle, two CTA buttons (primary orange + white outline)
- Right column: Slide image displayed in a `rounded-2xl` card with shadow and a floating stat badge (e.g. "15,000+ Young Adults")
- Both columns animate/transition with each slide change (opacity + translateY)
- Mobile layout: single column, centered text, image below
- Keep the slide auto-advance (8s), dot navigation, and prev/next arrows
- Keep the stats counter section below unchanged

### Part 2: Fix Employee Login (Signup Trigger Missing)

**Root cause found:** The `handle_new_user()` function exists in the database but has **no trigger attached** to `auth.users`. When a user signs up, no profile or role row is created, so:
- Login fails because `user_roles` query returns null (no role → redirected to passcode step)
- Passcode check fails because `profiles` has no row for the user

**Fix:** Create a database migration to attach the trigger:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

This will ensure that every new signup automatically creates the corresponding `profiles` and `user_roles` rows.

Additionally, manually fix the two existing broken users (adeolabunmi53@gmail.com and adeolabunmi94@gmail.com) by inserting their missing profile and role rows.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/public/Home.tsx` | Redesign hero section to split-layout with gradient background and image card |
| Migration SQL | Create trigger `on_auth_user_created` on `auth.users`, backfill broken user data |

