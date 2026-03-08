

## Plan: Add Image Upload Support to CMS + Media Library

### Overview
Two features:
1. **Direct image upload** on all CMS forms (Services, Events, Innovations, Gallery, Hero Slides, Partners, Team Members, Blog) — an upload button alongside the existing URL input
2. **Media Library page** in the CMS — a central place to upload, browse, and copy image URLs for use anywhere on the site

### Changes

#### 1. Storage Bucket (Database Migration)
Create a public `cms-media` storage bucket with RLS policies:
- Public SELECT (anyone can view images)
- Authenticated INSERT/DELETE for admins only

#### 2. Reusable `ImageUpload` Component
Create `src/components/cms/ImageUpload.tsx`:
- Accepts `value` (current URL) and `onChange` (callback with new URL)
- Shows a file input button + the existing URL text input
- On file select: uploads to `cms-media` bucket, returns public URL
- Shows image preview when a URL is set
- Used across all CMS forms to replace the current manual URL input

#### 3. Update All CMS Pages
Replace the Image URL `<Input>` + preview pattern in these files with the new `<ImageUpload>` component:
- `CMSServices.tsx`
- `CMSEvents.tsx`
- `CMSInnovations.tsx`
- `CMSGallery.tsx`
- `CMSHeroSlides.tsx`
- `CMSPartners.tsx`
- `CMSTeamMembers.tsx`
- `CMSBlog.tsx`

Each form will support both: typing a URL manually OR clicking upload to select a file.

#### 4. Media Library Page (`src/pages/cms/CMSMediaLibrary.tsx`)
- New CMS page at `/cms/media`
- Grid view of all files in the `cms-media` bucket
- Upload button to add new images
- Click-to-copy URL for each image
- Delete button on each image
- Add route to `App.tsx` and link to `CMSDashboard.tsx`

### Files Changed
| File | Action |
|------|--------|
| Database migration | Create `cms-media` storage bucket + RLS policies |
| `src/components/cms/ImageUpload.tsx` | New reusable upload component |
| `src/pages/cms/CMSMediaLibrary.tsx` | New media library page |
| `src/pages/cms/CMSDashboard.tsx` | Add Media Library link |
| `src/App.tsx` | Add `/cms/media` route |
| `CMSServices.tsx` | Use `ImageUpload` component |
| `CMSEvents.tsx` | Use `ImageUpload` component |
| `CMSInnovations.tsx` | Use `ImageUpload` component |
| `CMSGallery.tsx` | Use `ImageUpload` component |
| `CMSHeroSlides.tsx` | Use `ImageUpload` component |
| `CMSPartners.tsx` | Use `ImageUpload` component |
| `CMSTeamMembers.tsx` | Use `ImageUpload` component |
| `CMSBlog.tsx` | Use `ImageUpload` component |

