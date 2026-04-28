## Goal

Populate the Knowledge Base with comprehensive, well-structured articles extracted from the two uploaded documents:
1. **Footprints Dynasty Master Business Profile** — company overview, divisions, products, vision/mission.
2. **Oral Genealogy Full Documentation (PET User Instructions)** — operational SOP for the genealogy field workforce.

All articles will be inserted via a data migration (Supabase insert) as `published`, scoped globally (no department restriction) so every employee sees them. Pinned where it helps onboarding.

## New Categories to Add

The 6 existing categories cover most topics, but the Oral Genealogy content is large enough to deserve its own home. I'll add:

| Slug | Name | Icon | Order | Purpose |
|---|---|---|---|---|
| `company` | Company & Vision | `Building2` | 0 | Master profile, mission, brand positioning |
| `oral-genealogy` | Oral Genealogy Project | `BookOpen` | 7 | Project philosophy, workflow, FamilySearch partnership |
| `pet-tool` | Pedigree Entry Tool (PET) | `Laptop` | 8 | Step-by-step PET usage by role |
| `products` | Products & Platforms | `Sparkles` | 9 | BAT, AVTool, EduFlash |
| `events` | Events & Talent Programs | `Briefcase` | 10 | Bee Contest, SpeakUp, MAQ7 |

(Existing `Getting Started`, `HR & Policies`, `IT & Tools`, `Field Operations`, `Finance`, `Departments` are kept.)

## Articles to Create (≈18 articles)

Each article is markdown, with `summary`, `tags`, `status='published'`, `department_id=NULL`. Pinned ones marked ⭐.

### Company & Vision
1. ⭐ **Welcome to Footprints Dynasty Limited** — overview, what we do (heritage, youth, technology), brand positioning. Tags: overview, onboarding.
2. **Our Vision, Mission & Brand Statement** — verbatim vision, mission, positioning. Tags: vision, mission, culture.
3. **Our Core Business Divisions** — summary of all 5 divisions with internal links to the per-product articles. Tags: divisions, structure.
4. **Integrated Growth Strategy & Cross-Selling** — how field network feeds events + EduFlash. Tags: strategy, sales.

### Oral Genealogy Project
5. ⭐ **About the African Oral Genealogy Project** — philosophy ("when an elder dies, a library burns"), FamilySearch + Zamoph partnership, Footprints' role. Tags: heritage, partners.
6. **Genealogy Operations Workflow (End-to-End)** — the 8-step pipeline: Field Agents → Field Managers → PM → BAC → QA → Data Entry → PM review → VAC Ghana. Tags: workflow, sop.
7. **Roles & Responsibilities in Genealogy Operations** — what each role does (Field Agent, Field Manager, BAC auditor, QA Manager, Data Entry Clerk, Production Manager, Owner). Tags: roles, operations.

### Pedigree Entry Tool (PET)
8. ⭐ **PET Overview & System Requirements** — what PET is, browser/internet requirements, security rules (never share password). Tags: pet, security.
9. **Creating & Recovering a FamilySearch Account** — sign-up steps + password/username recovery. Tags: familysearch, account.
10. **PET Setup & First-Time Access** — what the Owner sends to Operations Manager, how to log in at familysearch.org/en/oral-gen/dashboard. Tags: setup, onboarding.
11. **Data Entry Clerk Guide** — step-by-step transcription: Add Interview, attach ZIP/PDF, Interviewee RIN, relation codes (P/S/C), birth/death rules, Living dropdown, Begin Next Page, Submit for Review, handling Review Failed status. Tags: data-entry, sop.
12. **Data Entry Manager Guide** — reviewing transcriptions, Awaiting Review queue (yellow/red labels), View PDF/Artifacts side-by-side, Approve vs Failed Review, sending back for rework, the Ready for Submission queue, printing Generation/Descendancy booklets (delivery within 30 days), clock-icon rework on Approved. Tags: review, qa.
13. **Owner & Production Manager Guide** — Manage Users (add Production Managers, Data Managers, Data Clerks), do NOT create profiles for staff, bulk Add Interviews (Upload Folder vs Upload Files), Reports (Staff Payment, Booklet Delivery, Failed by Cloud Audit, Failed by VAC). Tags: management, reports.
14. **Interview Status Reference** — table of all 10 statuses (Incomplete, Awaiting Review, Review Failed, Ready for Submission, Processing Submission, Submission Failed, Awaiting VAC Audit, VAC Audit Failed, VAC Audit Passed, Cancelled). Tags: status, reference.
15. **PET Filters & Search** — Interview ID, Data Clerk, Interviewer ID, Start/End Date filters. Tags: search, filters.
16. **Reporting Technical Problems & Helper Number** — what info to collect, support hours (Mon–Fri 5 AM – 1 PM Utah), WhatsApp +1 385 786 9177, Helper Number location. Tags: support, troubleshooting.

### Products & Platforms
17. **BAT — Back-End Audit Tool** — features, multi-tenant SaaS, licensing model. Tags: bat, saas, product.
18. **AVTool — Audit Verification Tool** — problem solved, audio/photo proof, offline/online, geo evidence. Tags: avtool, verification.
19. **EduFlash — Gamified Learning SaaS** — flashcards, payment tracking, school licensing, optional physical printing. Tags: eduflash, education.

### Events & Talent Programs
20. **Events Division Overview** — Bee Contest (since 2019), SpeakUp, MAQ7 (Music/Art/Questionnaire), virtual/physical/hybrid capabilities. Tags: events, youth.

### Getting Started (existing category)
21. ⭐ **Knowledge Base — How to Use** — explain search, categories, pinned articles, and that more content is added regularly. Tags: kb, help.

## Technical Implementation

1. **Migration #1 (schema-safe insert)**: a single `INSERT … ON CONFLICT DO NOTHING` on `kb_categories` for the 5 new categories (using `slug` as the conflict target — needs a unique constraint check; if absent we fall back to filtering by slug-not-exists).
2. **Migration #2**: bulk `INSERT` into `kb_articles` for all ~21 articles. Each row sets:
   - `title`, `slug` (kebab-case from title), `summary`, `body` (markdown), `tags` (jsonb array), `category_id` (subquery: `SELECT id FROM kb_categories WHERE slug = '…'`), `department_id = NULL`, `status = 'published'`, `published_at = now()`, `is_pinned` for the 4 starred items, `created_by = NULL` (system seed).
3. Use `ON CONFLICT (slug) DO NOTHING` if `kb_articles.slug` is unique; otherwise insert plain (re-runs would duplicate, so we'll guard with `WHERE NOT EXISTS`).
4. No code/UI changes required — the existing `KnowledgeBase.tsx`, `KnowledgeBaseArticle.tsx`, search (GIN), and category browse pages already render this content.

## Files Touched

- `supabase/migrations/<timestamp>_seed_kb_content.sql` — new migration with categories + articles.
- No frontend files need editing.

## Out of Scope

- No avatars/images attached to articles (cover_image left blank). Admins can add them later via CMS.
- Duplicate later pages (33–50) of the Oral Genealogy PDF are reprints of pages 1–17, so no extra content is lost.
- Pages 33–50 onward of the second PDF were truncated at the 50-page parse limit, but inspection shows they repeat the same PET instructions verbatim — nothing new to extract.