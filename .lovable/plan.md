

## Plan: Force Light Mode on Public Pages

### Problem
The `ThemeProvider` and `PublicLayout` both modify `document.documentElement.classList` via competing `useEffect` hooks. When the user has dark mode selected, the `ThemeProvider` can override `PublicLayout`'s forced light mode due to React's effect execution order.

### Solution
Add a `data-force-light` attribute mechanism. `PublicLayout` sets this attribute on `<html>`, and `ThemeProvider` checks for it before applying the theme class — skipping dark mode when the attribute is present.

### Changes

#### `src/components/theme-provider.tsx`
- In the `useEffect`, check `root.hasAttribute('data-force-light')` before applying the theme
- If the attribute is present, always apply `light` class regardless of stored theme

#### `src/components/PublicLayout.tsx`
- Replace the current `useEffect` with one that sets `data-force-light` attribute on `<html>` and forces `light` class
- On cleanup, remove the attribute and let `ThemeProvider` re-apply the stored theme

### Files Changed
| File | Action |
|------|--------|
| `src/components/theme-provider.tsx` | Respect `data-force-light` attribute |
| `src/components/PublicLayout.tsx` | Set `data-force-light` attribute instead of just toggling classes |

