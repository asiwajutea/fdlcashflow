

## Plan: Add Lazy Loading with Prefetching for Faster Load Times

### Problem
All 40+ page components are eagerly imported in `App.tsx`, meaning the entire app's JavaScript is downloaded on first visit regardless of which page the user navigates to.

### Solution
Use `React.lazy()` for code splitting and prefetch high-traffic public pages so they load instantly when navigated to.

### Caching & Prefetch Strategy

**Eagerly loaded (kept as direct imports):**
- `Home` — landing page, always the first load

**Prefetched on idle** (likely next navigations from homepage):
- `About`, `Services`, `Contact`, `Careers` — top nav links visitors click first

**Lazy loaded on demand** (everything else):
- All detail pages (`ServiceDetail`, `EventDetail`, etc.)
- All backend/CMS pages (only needed by authenticated employees)
- `Auth`, `Apply`, `Blog`, `Gallery`, `Innovations`

### Technical Approach

**File: `src/App.tsx`**
1. Convert all imports except `Home` to `React.lazy()` 
2. Wrap `<AppRoutes>` in `<Suspense>` with a loading fallback
3. Add a `prefetchRoutes()` function that uses `requestIdleCallback` to trigger dynamic imports for About, Services, Contact, and Careers after the homepage renders

### Also configure React Query stale times

**File: `src/App.tsx`**
- Set `QueryClient` defaults: `staleTime: 5 * 60 * 1000` (5 min) and `gcTime: 10 * 60 * 1000` so CMS data fetched on the homepage isn't re-fetched when navigating to sub-pages.

### Files Changed
| File | Action |
|------|--------|
| `src/App.tsx` | Lazy load routes, add Suspense, prefetch key pages, configure query cache |

