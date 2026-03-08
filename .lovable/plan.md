

## Plan: Fix Light/Dark Theme for Authenticated Backend

### Problem
The `:root` (light mode) CSS variables define a **dark navy background** (`214 95% 15%`) with **white foreground text** (`0 0% 95%`), essentially making the "light" theme look dark. Meanwhile, cards are white (`0 0% 100%`) with dark card-foreground text — but elements using `text-foreground` (white) or `text-muted-foreground` become invisible on white card surfaces. The `.dark` theme is almost identical, compounding the issue.

### Solution
Rewrite the `:root` variables to be a proper **light theme** (white/light gray backgrounds, dark text) while keeping the `.dark` variables as a proper **dark theme** (navy backgrounds, light text). Both themes maintain the navy blue + orange brand identity.

### Changes

#### `src/index.css` — Rewrite `:root` light theme variables

**Light mode (`:root`)** — key changes:
- `--background`: white/very light gray (e.g. `0 0% 100%`)
- `--foreground`: dark navy text (e.g. `214 95% 15%`)
- `--card`: white (`0 0% 100%`) — stays the same
- `--card-foreground`: dark text — stays the same
- `--primary`: navy blue — stays the same
- `--muted`: light gray (e.g. `214 20% 96%`)
- `--muted-foreground`: medium gray for readability on white
- `--border` / `--input`: light gray borders
- `--sidebar-*`: keep navy for sidebar contrast

**Dark mode (`.dark`)** — keep existing dark navy palette, ensure completeness:
- `--background`: dark navy (`214 95% 15%`)
- `--foreground`: white (`0 0% 98%`)
- `--card`: dark navy card (`214 70% 22%`)
- Add missing variables: `--card-border`, `--primary-light`, `--primary-dark`, `--sidebar-*`, `--success-*`, `--danger-*`, `--warning-*`

### Files Changed
| File | Action |
|------|--------|
| `src/index.css` | Rewrite `:root` to proper light theme; complete `.dark` variables |

No other files need changes — all components already use the CSS variables via Tailwind classes.

