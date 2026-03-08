

## Plan: Add Image Management to Innovations CMS + Pre-populate Images

### Current State
- 4 innovations exist in the database (Dynasty Education, EduFlash, AVTool, BAT) — all with empty `image_url`
- The CMS form (`CMSInnovations.tsx`) is missing the `image_url` field
- The public page uses `fallbackImages` based on slug matching

### Changes

#### 1. `src/pages/cms/CMSInnovations.tsx` — Add Image URL Field
- Add `image_url: ''` to the `empty` object (line 15)
- Add Image URL input with live preview thumbnail in the edit/create dialog
- Add Image column to the data table

#### 2. Database — Pre-populate Image URLs for 4 Existing Innovations
- Dynasty Education → education/community image
- EduFlash → e-learning/flashcard image
- AVTool → audio/technology image
- BAT → data/auditing image

### Files Changed
| File | Action |
|------|--------|
| `src/pages/cms/CMSInnovations.tsx` | Add image_url field + preview to form and table |
| Database (data update) | Set image_url on 4 existing innovations |

No schema changes needed — `image_url` column already exists on the `innovations` table.

