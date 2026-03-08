

## Plan: Fix Button Text Visibility on Public Pages

### Problem
The `outline` button variant includes `bg-background` (white) and `text-foreground` (dark navy). When public page buttons on **dark backgrounds** override the text to `text-primary-foreground` (white) without also overriding the background to transparent, the result is white text on a white button — invisible.

Additionally, one button on a light background has a conflicting `text-primary-foreground` class on its inner Link element.

### Affected Buttons

**Dark-background outline buttons (white text on white `bg-background`):**
| File | Line | Fix |
|------|------|-----|
| `Home.tsx` | ~222 | Add `bg-transparent` |
| `Home.tsx` | ~645, ~648 | Add `bg-transparent` |
| `About.tsx` | ~361 | Add `bg-transparent` |
| `EventDetail.tsx` | ~222 | Add `bg-transparent` |
| `BlogPost.tsx` | ~176 | Add `bg-transparent` |
| `InnovationDetail.tsx` | ~181 | Add `bg-transparent` |
| `ServiceDetail.tsx` | ~197 | Add `bg-transparent` |
| `Contact.tsx` | ~160 | Add `bg-transparent` |

**Light-background button with wrong inner text color:**
| File | Line | Fix |
|------|------|-----|
| `Home.tsx` | ~311 | Remove `text-primary-foreground` from the Link child (the button's `text-card-foreground` is correct) |

### Changes
For each dark-background outline button, add `bg-transparent` to the className so `tailwind-merge` overrides the variant's `bg-background`. Also add `hover:text-white` where missing to ensure hover state keeps text visible.

For the Home.tsx about-section button, remove the conflicting `text-primary-foreground` from the inner `<Link>`.

### Files Changed
| File | Action |
|------|--------|
| `src/pages/public/Home.tsx` | Fix 4 buttons |
| `src/pages/public/About.tsx` | Fix 1 button |
| `src/pages/public/EventDetail.tsx` | Fix 1 button |
| `src/pages/public/BlogPost.tsx` | Fix 1 button |
| `src/pages/public/InnovationDetail.tsx` | Fix 1 button |
| `src/pages/public/ServiceDetail.tsx` | Fix 1 button |
| `src/pages/public/Contact.tsx` | Fix 1 button |

