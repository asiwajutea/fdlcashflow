

## Plan: Redesign Services Page (Listing + Detail)

Redesign both `Services.tsx` and `ServiceDetail.tsx` to match the premium editorial aesthetic of the About page — cinematic hero, scroll animations, glassmorphic elements, and polished card designs.

### Changes

#### 1. `src/pages/public/Services.tsx` — Full Redesign

- **Cinematic Hero**: Full-width banner with background image, gradient overlays, grid pattern, glassmorphic badge ("What We Offer"), and animated heading — same pattern as About hero
- **Intro Section**: Brief company positioning text with `useInView` fade-up animation
- **Services Grid**: Redesigned cards with:
  - Service image (from `image_url`) or gradient fallback
  - Hover scale + shadow transitions
  - Orange accent icon container
  - `useInView` staggered fade-up animations
  - Rounded-2xl styling with border hover effects
- **Why Choose Us / Process Section**: A 3-4 step visual process strip (e.g., "Consult → Plan → Execute → Deliver") with numbered steps, connecting lines, and scroll-triggered animations
- **CTA Section**: Full-width gradient section matching About page CTA — "Ready to get started?" with Contact/Quote button

#### 2. `src/pages/public/ServiceDetail.tsx` — Full Redesign

- **Cinematic Hero**: Taller hero with service image as background, deep gradient overlays, breadcrumb back-link with glassmorphic badge, animated title + description with text shadows
- **Content Area**: Split layout (2/3 + 1/3) with:
  - Left: Description paragraphs with improved typography and spacing
  - Right: Sticky sidebar with service image card, "Interested?" CTA card with gradient button, and optionally a list of other services for cross-navigation
- **Other Services Section**: A "More Services" grid at the bottom showing 3 related/other services as cards linking back, with `useInView` animations
- **CTA Strip**: Gradient banner at bottom matching About page style

### No database or routing changes needed — only the two page files are modified.

