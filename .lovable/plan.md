

## Plan: Add Image Management to Events CMS + Pre-populate Images

### Current State
- 5 events exist in the database (MAQ7, The Bee Contest, Speak Up Contest, Wife Material, StreeTalentz) — all with empty `image_url`
- The CMS form (`CMSEvents.tsx`) is missing the `image_url` field — admins can't set event images
- The public Events page uses `fallbackImages` based on slug matching, which is fragile

### Changes

#### 1. `src/pages/cms/CMSEvents.tsx` — Add Image URL Field
- Add `image_url: ''` to the `empty` object
- Add an Image URL input field with live preview thumbnail in the edit/create dialog
- Add an Image column to the data table showing thumbnails

#### 2. Database — Pre-populate Image URLs for 5 Existing Events
Using the insert tool (UPDATE statements):
- MAQ7 → pageant/talent show image
- The Bee Contest → quiz/competition image
- Speak Up Contest → public speaking/microphone image
- Wife Material → cultural celebration image
- StreeTalentz → street performance image

No schema changes needed — `image_url` column already exists on the `events` table.

### Files Changed
| File | Action |
|------|--------|
| `src/pages/cms/CMSEvents.tsx` | Add image_url field + preview to form and table |
| Database (data update) | Set image_url on 5 existing events |

