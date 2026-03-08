

## Plan: Redesign 5 Public Pages to Match Premium Editorial Aesthetic

Apply the same cinematic hero, `useInView` scroll animations, glassmorphic elements, image-blended cards, and polished layouts used on Services/Events/About pages to all remaining public pages.

---

### 1. `src/pages/public/Innovations.tsx` — Full Redesign

- **Cinematic Hero**: Background image (tech/innovation themed), gradient overlays, glassmorphic "Our Innovations" badge, animated heading
- **Intro text**: Fade-up positioning statement
- **Cards Grid**: Image-blended navy gradient cards with fallback images (tech, education, genealogy themed), hover scale, staggered `useInView` fade-up, "Explore" arrow on hover
- **Impact Section**: Dark navy section with 4 value props (e.g., "Cutting-Edge Tech", "Social Impact", "Scalable Solutions", "Community First")
- **CTA Section**: Gradient banner — "Have an idea? Let's innovate together" with Contact button

### 2. `src/pages/public/InnovationDetail.tsx` — Full Redesign

- **Cinematic Hero**: Innovation image as background, deep gradient overlays, breadcrumb back-link, glassmorphic badge, animated title
- **Split Layout**: 2/3 content + 1/3 sticky sidebar with CTA card and image
- **More Innovations**: Grid of 3 other innovations at bottom with `useInView`
- **CTA Strip**: Gradient banner

### 3. `src/pages/public/Gallery.tsx` — Full Redesign

- **Cinematic Hero**: Photography-themed background image, gradient overlays, glassmorphic "Gallery" badge
- **Filter Bar**: Redesigned category pills with improved styling and animations
- **Photo Grid**: `useInView` staggered fade-up on images, hover overlay with zoom effect, lightbox on click
- **CTA Section**: "Want to see more?" gradient banner

### 4. `src/pages/public/Blog.tsx` — Full Redesign

- **Cinematic Hero**: Writing/storytelling background, glassmorphic "Our Blog" badge
- **Blog Grid**: Cards with featured image blended with navy gradient, date badge overlay, hover scale, staggered `useInView` fade-up, "Read more" arrow
- **CTA Section**: "Stay Updated" gradient banner with Contact link

### 5. `src/pages/public/BlogPost.tsx` — Full Redesign

- **Cinematic Hero**: Featured image as background, gradient overlays, breadcrumb, glassmorphic badge, animated title + date
- **Split Layout**: 2/3 article content + 1/3 sticky sidebar with CTA
- **More Posts**: Grid of 3 related posts at bottom
- **CTA Strip**: Gradient banner

### 6. `src/pages/public/Careers.tsx` — Full Redesign

- **Cinematic Hero**: Professional/team background, glassmorphic "Join Our Team" badge
- **Intro Section**: Company culture positioning with fade-up
- **Job Cards**: Redesigned with image-blended navy backgrounds (using department-themed fallbacks), hover effects, staggered `useInView`
- **Why Join Us Section**: Dark navy section with 4 perks (Growth, Impact, Culture, Innovation)
- **CTA Section**: "Don't see your role?" gradient banner linking to Contact

### 7. `src/pages/public/Contact.tsx` — Full Redesign

- **Cinematic Hero**: Office/handshake background, glassmorphic "Get In Touch" badge
- **Info Cards**: Redesigned with navy gradient backgrounds, icon accents, hover effects, `useInView` fade-up
- **Form**: Enhanced card with gradient accent border, improved input styling
- **Map/CTA Section**: Gradient banner at bottom

---

### Files Changed
| File | Action |
|------|--------|
| `src/pages/public/Innovations.tsx` | Full redesign |
| `src/pages/public/InnovationDetail.tsx` | Full redesign |
| `src/pages/public/Gallery.tsx` | Full redesign |
| `src/pages/public/Blog.tsx` | Full redesign |
| `src/pages/public/BlogPost.tsx` | Full redesign |
| `src/pages/public/Careers.tsx` | Full redesign |
| `src/pages/public/Contact.tsx` | Full redesign |

No database or routing changes needed. All pages follow the identical pattern: `useInView` hook, cinematic hero, glassmorphic badges, image-blended cards, highlights section, gradient CTA strip.

