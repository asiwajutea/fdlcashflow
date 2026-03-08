

## Plan: Enable Image Management for Services in CMS

### Current State
- Services are **already in the database** and the CMS page (`CMSServices.tsx`) exists with full CRUD
- However, the CMS form is **missing the `image_url` field** — so admins can't set/change service images from the backend
- All 5 services currently have empty `image_url`, relying on hardcoded fallback images in `Services.tsx`

### Changes

#### 1. `src/pages/cms/CMSServices.tsx` — Add Image URL Field
- Add an `image_url` input field to the edit/create dialog so admins can set a cover image URL for each service
- Add image preview thumbnail in the form when a URL is provided
- Add an `image_url` column to the data table so admins can see at a glance which services have images

#### 2. Database — Pre-populate Image URLs
- Update the 5 existing services to set their `image_url` to the relevant stock photos (currently used as fallbacks in the frontend):
  - Event Management → event/conference image
  - General Merchandize → retail/products image
  - SaaS Technology → technology image
  - EduTech → education image
  - OralGen → community/heritage image

This removes the dependency on hardcoded fallback images and makes everything editable from the CMS.

### Files Changed
| File | Action |
|------|--------|
| `src/pages/cms/CMSServices.tsx` | Add image_url field + preview to form |
| Database (data update) | Set image_url on 5 existing services |

No schema changes needed — `image_url` column already exists on the `services` table.

