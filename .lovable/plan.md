

# FDL Workforce -- Full Website Rebuild Plan

This is a large project that needs to be broken into multiple phases to avoid breaking existing functionality. I recommend we tackle it step by step across several conversations.

---

## Phase 0: Fix Email Confirmation (Immediate)

The `finance@footprintsdynasty.com.ng` and `guest@footprintsdynasty.com.ng` accounts have unconfirmed emails. I will update their `email_confirmed_at` timestamps in the database so they can log in immediately.

---

## Phase 1: Foundation -- Public Layout and Homepage

### New files to create:
- `src/components/PublicLayout.tsx` -- Header with nav menu (Home, About, Services, Events, Innovations, Gallery, Careers, Blog, Contact) + Employee Login and Apply buttons + sticky header + footer with social links
- `src/pages/public/Home.tsx` -- The new public homepage with all requested sections (Hero, About snapshot, Services grid, Flagship Events, Innovations, Partners, Featured In, CTA banner)
- `src/pages/public/About.tsx`
- `src/pages/public/Services.tsx` and `src/pages/public/ServiceDetail.tsx`
- `src/pages/public/Events.tsx` and `src/pages/public/EventDetail.tsx`
- `src/pages/public/Innovations.tsx` and `src/pages/public/InnovationDetail.tsx`
- `src/pages/public/Gallery.tsx`
- `src/pages/public/Careers.tsx`
- `src/pages/public/Blog.tsx` and `src/pages/public/BlogPost.tsx`
- `src/pages/public/Contact.tsx`

### Routing changes in `App.tsx`:
- `/` becomes the public homepage (not the dashboard)
- `/dashboard` becomes the authenticated financial dashboard (current `/` page)
- All existing backend routes remain unchanged, just the Index redirects to `/dashboard`
- Public routes: `/`, `/about`, `/services`, `/services/:slug`, `/events`, `/events/:slug`, `/innovations`, `/innovations/:slug`, `/gallery`, `/careers`, `/blog`, `/blog/:slug`, `/contact`
- Auth route stays at `/auth`

### Database tables to create:
1. **`website_sections`** -- CMS-editable content blocks (hero text, about text, etc.)
2. **`services`** -- Service entries with slug, title, description, image, CTA type
3. **`events`** -- Event entries with slug, title, description, gallery, registration CTA
4. **`innovations`** -- Innovation entries with slug, title, description, image
5. **`gallery_items`** -- Media gallery with category filtering
6. **`blog_posts`** -- Blog CMS with title, slug, body, featured_image, status (draft/published), SEO fields
7. **`blog_categories`** and **`blog_tags`** -- Taxonomy tables
8. **`contact_submissions`** -- Contact form submissions
9. **`partners`** -- Partner logos
10. **`testimonials`** -- Testimonials

All tables will have proper RLS: public SELECT for published content, admin-only for INSERT/UPDATE/DELETE.

### New capability:
- `manage_website_content` added to `user_capabilities` for CMS access

---

## Phase 2: CMS Admin Dashboard

- Add CMS management pages under `/admin/website` (or as a new tab in the existing dashboard)
- CRUD interfaces for: Services, Events, Innovations, Gallery, Blog, Partners, Testimonials, Homepage sections, SEO settings
- Rich text editing for blog posts (using a simple markdown or HTML editor)

---

## Phase 3: SEO and Performance

- Dynamic `<title>` and meta tags per page using `react-helmet-async`
- Open Graph and Twitter card meta tags
- Structured data (JSON-LD) for organization and articles
- Lazy loading for images
- Animated counters on homepage
- Accessibility improvements (ARIA labels)

---

## Implementation Approach

Given the size, I recommend we proceed **one phase at a time**:

1. **This session**: Fix email confirmation + set up Phase 1 foundation (PublicLayout, routing, database tables, homepage)
2. **Next session**: Build out remaining public pages (About, Services, Events, etc.)
3. **Following session**: CMS admin + Blog system
4. **Final session**: SEO, performance, polish

### Technical Details

- The public layout will be completely separate from `DashboardLayout`
- Mobile-first with a hamburger menu for mobile navigation
- Brand colors: Navy Blue `#0B1F3B` / Orange `#FF7A00` (already configured in CSS)
- All public pages will NOT require authentication
- The `AvatarGuard` in `App.tsx` will be scoped to only apply to dashboard routes
- Existing payroll, invoice, employee, and recruitment code remains untouched

