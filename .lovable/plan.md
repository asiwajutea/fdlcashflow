

## Plan: Redesign Events Page (Listing + Detail)

Redesign both `Events.tsx` and `EventDetail.tsx` to match the Services page premium editorial aesthetic — cinematic hero, scroll animations, glassmorphic elements, image-blended cards, and polished layouts.

### Changes

#### 1. `src/pages/public/Events.tsx` — Full Redesign

- **Cinematic Hero**: Full-width banner with event-themed background image, gradient overlays, grid pattern, glassmorphic badge ("Our Events"), animated heading — identical pattern to Services hero
- **Intro Section**: Positioning statement about events with `useInView` fade-up
- **Events Grid**: Cards with:
  - Event `image_url` blended with navy gradient overlay (fallback images for events without photos)
  - Calendar icon accent container
  - Event date displayed on cards when available
  - Hover scale + shadow transitions, staggered `useInView` fade-up
  - "Learn more" arrow on hover
  - Rounded-2xl styling
- **Upcoming Events Highlight**: Dark navy section (similar to "How We Work" process section) showcasing what makes the events special — e.g. 3-4 value props like "World-Class Talent", "Cultural Celebration", "Community Impact", "Unforgettable Experiences"
- **CTA Section**: Full-width gradient section — "Want to Partner With Us?" with Contact button

#### 2. `src/pages/public/EventDetail.tsx` — Full Redesign

- **Cinematic Hero**: Taller hero with event image as background, deep gradient overlays, breadcrumb back-link, glassmorphic badge, animated title + event date with text shadows
- **Content Area**: Split layout (2/3 + 1/3) with:
  - Left: Description paragraphs with improved typography
  - Right: Sticky sidebar with event image card, registration CTA button, contact button
- **Gallery Section**: Enhanced with `useInView` animations, hover effects on thumbnails
- **More Events Section**: Grid of 3 other events at the bottom for cross-navigation
- **CTA Strip**: Gradient banner at bottom

### Files Changed
| File | Action |
|------|--------|
| `src/pages/public/Events.tsx` | Full redesign |
| `src/pages/public/EventDetail.tsx` | Full redesign |

No database or routing changes needed.

