-- Seed Knowledge Base with content from Footprints Dynasty Master Profile + Oral Genealogy PET docs

-- 1. New categories (idempotent via NOT EXISTS on slug)
INSERT INTO public.kb_categories (name, slug, description, icon, display_order, is_active)
SELECT * FROM (VALUES
  ('Company & Vision', 'company', 'About Footprints Dynasty Limited — who we are, what we do, and where we are going.', 'Building2', 0, true),
  ('Oral Genealogy Project', 'oral-genealogy', 'The African Oral Genealogy & Family History Project — philosophy, partners, and end-to-end workflow.', 'BookOpen', 7, true),
  ('Pedigree Entry Tool (PET)', 'pet-tool', 'Step-by-step instructions for using the FamilySearch Pedigree Entry Tool by role.', 'Laptop', 8, true),
  ('Products & Platforms', 'products', 'Our proprietary technology products: BAT, AVTool, and EduFlash.', 'Sparkles', 9, true),
  ('Events & Talent Programs', 'events', 'Bee Contest, SpeakUp, MAQ7 and other youth and talent development programs.', 'Briefcase', 10, true)
) AS v(name, slug, description, icon, display_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.kb_categories c WHERE c.slug = v.slug);

-- 2. Articles
WITH cats AS (
  SELECT slug, id FROM public.kb_categories
)
INSERT INTO public.kb_articles (title, slug, summary, body, category_id, department_id, tags, status, is_pinned, published_at)
SELECT v.title, v.slug, v.summary, v.body,
  (SELECT id FROM cats WHERE slug = v.cat_slug),
  NULL, v.tags::jsonb, 'published', v.is_pinned, now()
FROM (VALUES

-- COMPANY & VISION
('Welcome to Footprints Dynasty Limited',
 'welcome-to-footprints-dynasty',
 'Start here — a quick tour of who we are, what we build, and the impact we drive across Africa.',
 E'# Welcome to Footprints Dynasty Limited\n\nFootprints Dynasty Limited is a multifaceted African enterprise operating at the intersection of **event management, educational development, technology innovation, AI automation, and cultural preservation**.\n\nRegistered as an events management and general merchandise organization, the company has evolved into a **strategic operations, software, and impact-driven organization** delivering solutions across education, heritage preservation, and digital transformation.\n\n## Our Mission\n\n> To build systems, platforms, and experiences that preserve African heritage, develop future leaders, and empower organizations through technology.\n\n## What we do at a glance\n\n- **Heritage preservation** — operational partner on the African Oral Genealogy Project.\n- **Proprietary SaaS** — BAT, AVTool, and EduFlash.\n- **Youth & talent development** — flagship events including The Bee Contest, SpeakUp, and MAQ7.\n- **Technology-driven operational excellence** for partners and clients.\n\n## Brand Positioning\n\nFootprints Dynasty Limited is **not merely an event company or software company** — it is a systems-driven impact organization building the infrastructure for cultural preservation, educational transformation, and youth empowerment across Africa.',
 'company', '["overview","onboarding","welcome"]', true),

('Our Vision, Mission & Brand Statement',
 'vision-mission-brand',
 'Our vision, mission, and brand positioning — the strategic compass for everything we do.',
 E'# Vision\n\nTo become **Africa''s leading integrated heritage-preservation, youth-development, and technology-enablement company** by building scalable systems that preserve the past, empower the present, and develop the future.\n\n# Mission\n\nTo create transformative impact across Africa through:\n\n- Heritage preservation\n- Youth empowerment\n- Educational innovation\n- Technology-driven operational excellence\n- Strategic partnerships\n\n# Brand Positioning\n\nFootprints Dynasty Limited is not merely an event company or software company — it is a **systems-driven impact organization** building the infrastructure for cultural preservation, educational transformation, and youth empowerment across Africa.',
 'company', '["vision","mission","culture","brand"]', false),

('Our Core Business Divisions',
 'core-business-divisions',
 'A summary of the five divisions that make up Footprints Dynasty Limited.',
 E'# Core Business Divisions\n\n## 1. African Oral Genealogy & Family History Operations\nOperational partner on the **African Oral Genealogy Project**, in collaboration with **Zamoph Resources Company Limited** and anchored globally by **FamilySearch International**.\n\n## 2. BAT — Back-End Audit Tool\nA proprietary AI-enhanced multi-tenant SaaS platform that powers genealogy field operations: workflow tracking, fraud detection, and decision-support automation.\n\n## 3. AVTool — Audit Verification Tool\nField-proof verification platform: audio recording, photo capture, geo evidence, and offline/online sync to guarantee verification integrity.\n\n## 4. EduFlash\nA multi-tenant educational SaaS that gamifies learning with flashcards, manages tuition payments, and supports physical flashcard fulfillment.\n\n## 5. Events & Talent Development\nFlagship programs for teenagers and youth (13–25): The Bee Contest, SpeakUp, and MAQ7 — delivered virtually, physically, or as hybrid events.',
 'company', '["divisions","structure","overview"]', false),

('Integrated Growth Strategy & Cross-Selling',
 'integrated-growth-strategy',
 'How our genealogy field network powers multiple revenue streams across the company.',
 E'# Integrated Growth Strategy\n\nFootprints Dynasty Limited leverages its **genealogy field network** as a primary marketing and distribution funnel.\n\n## How it works\n\nWhile conducting genealogy interviews, field teams:\n\n- Collect family data and contact information\n- Promote educational and talent-development events to households\n- Market youth-focused programs to eligible family members\n- Introduce schools and families to **EduFlash**\n\n## Strategic advantage\n\nA single field-acquisition system supports **multiple revenue streams**:\n\n- Genealogy operations\n- Event participation\n- Educational SaaS adoption\n- Institutional partnerships\n\n## Partnership opportunities\n\nWe are open to:\n\n- Partnering with additional genealogy contractors / subcontractors\n- Licensing **BAT** and **AVTool** to organizations globally\n- Collaborating with educational institutions via **EduFlash**\n- Strategic event partnerships and sponsorships\n- White-label / enterprise SaaS deployments',
 'company', '["strategy","sales","growth"]', false),

-- ORAL GENEALOGY PROJECT
('About the African Oral Genealogy Project',
 'about-oral-genealogy-project',
 'Project philosophy, partners, and Footprints Dynasty''s strategic role in preserving African oral history.',
 E'# About the African Oral Genealogy Project\n\nThe African Oral Genealogy and Family History Project is a heritage preservation initiative designed to ensure African families document and preserve their genealogy, oral traditions, and family history for future generations.\n\n## Project philosophy\n\nThe project is rooted in the African belief that:\n\n> *"When an elder dies, a library burns."*\n\nThe initiative seeks to preserve oral history before it is lost by documenting genealogical records and oral family stories across African communities.\n\n## Strategic positioning of Footprints Dynasty\n\n- Subcontractor / Operational Partner supporting the African Oral Genealogy Project.\n- Current operational partnership with **Zamoph Resources Company Limited**.\n- Project anchored globally by **FamilySearch International**.\n- Open to partnerships with other contractors / subcontractors involved in similar genealogy preservation initiatives.\n\n## Our operational responsibilities\n\nFootprints Dynasty Limited oversees production and quality control operations including:\n\n- Recruitment, training, and management of field agents\n- Deployment of field managers for interview verification\n- Back-end audit and quality review processes\n- Quality assurance management\n- Data entry and pedigree processing\n- Final production review before visual audit submission',
 'oral-genealogy', '["heritage","partners","familysearch","zamoph"]', true),

('Genealogy Operations Workflow (End-to-End)',
 'genealogy-operations-workflow',
 'The eight-step pipeline that takes an interview from the field to the Visual Audit Center in Ghana.',
 E'# Genealogy Operations Workflow\n\n1. **Field Agents** collect genealogy and oral history data from communities.\n2. **Field Managers** verify interview authenticity directly with the interviewees.\n3. **Production Manager** oversees field output and workflow.\n4. **Back-End Audit Center (BAC)** conducts backend quality and fraud checks.\n5. **Quality Assurance Manager** reviews and distributes work for data entry.\n6. **Data Entry Clerks** input records into **Pedigree Entry 2 (PET)**.\n7. **Production Manager** performs the final review and submission.\n8. **Visual Audit Center (VAC)** in Ghana performs the final visual audit.\n\n```text\nField Agent → Field Manager → Production Manager → BAC → QA Manager\n           → Data Entry Clerk (PET) → Production Manager → VAC (Ghana)\n```\n\nEach handover is tracked end-to-end inside our proprietary **BAT (Back-End Audit Tool)** so every interview can be traced from collection to final visual audit.',
 'oral-genealogy', '["workflow","sop","operations"]', false),

('Roles & Responsibilities in Genealogy Operations',
 'roles-responsibilities-genealogy',
 'Who does what across the genealogy production pipeline.',
 E'# Roles & Responsibilities\n\n## Field Agent\n- Conducts interviews in the community using the mobile app.\n- Collects oral history, family relationships, and supporting evidence.\n\n## Field Manager\n- Visits interviewees to verify the interview actually happened and that the data is accurate.\n- Uses **AVTool** to capture audio + photo proof of every verification visit.\n\n## Back-End Audit Center (BAC) Auditor\n- Performs backend quality and fraud checks on submitted interviews.\n- Flags issues before work moves to data entry.\n\n## QA Manager\n- Reviews BAC output, distributes interviews for data entry, and ensures policy compliance.\n\n## Data Entry Clerk\n- Transcribes interview collection forms into the **Pedigree Entry Tool (PET)** exactly as written.\n- Submits completed interviews for review by a Data Entry Manager.\n\n## Data Entry Manager\n- Reviews transcriptions in PET, approves or sends back for rework, prints family booklets.\n\n## Production Manager\n- Oversees field output and workflow; performs final review before submission.\n- Adds users to PET and downloads operational reports.\n\n## Owner\n- Holds the highest privileges in PET; can add Production Managers, Data Managers, and Data Entry Clerks.',
 'oral-genealogy', '["roles","operations","responsibilities"]', false),

-- PET TOOL
('PET Overview & System Requirements',
 'pet-overview-requirements',
 'What the Pedigree Entry Tool is, what you need to use it, and the security rules every user must follow.',
 E'# Pedigree Entry Tool (PET)\n\nThe Pedigree Entry Tool is a **web application for transcribing, submitting and auditing interviews**.\n\n## Requirements\n\n- A **stable internet connection** is required.\n- A **FamilySearch username** for every manager and employee doing data entry work.\n- A modern internet browser (e.g. Google Chrome).\n\n## Access rules\n\n- Before you begin, ensure every team member can log in and has access to the application.\n- Team members will only need to **share their FamilySearch username** with you or technical support — and with no one else.\n\n## Security — read this carefully\n\n- **Never share your password.** Do not ask or allow staff to share their passwords with anyone, inside or outside our organization.\n- Sharing credentials is a major security risk and may lead to serious problems that will affect our business.\n\n## Support\n\n- Staff questions about training should be answered by their manager first.\n- If the manager cannot answer, they can contact the Operations Manager for help.\n- Technical problems can be reported to our support channel: **Oral Gen WhatsApp +1 385 786 9177**.',
 'pet-tool', '["pet","security","requirements"]', true),

('Creating & Recovering a FamilySearch Account',
 'familysearch-account-create-recover',
 'How to create a free FamilySearch account and how to recover a forgotten username or password.',
 E'# Creating a Free FamilySearch Account\n\nIf you already have a FamilySearch account, skip to *Signing in to the PET*.\n\n1. Go to [www.familysearch.org](https://www.familysearch.org).\n2. Click **Create Account** in the top right.\n3. Click **Create a username and password**.\n4. Complete the form:\n   - First (given) name — your name, **not** your contractor or manager.\n   - Last (family) name.\n   - Date of birth.\n5. Choose a **username** you can remember. If it is taken, the system suggests alternatives.\n6. Choose a **password** of at least 8 characters (including spaces). **Do not share this password — even with your boss.**\n7. Enter a personal recovery email (and optionally a mobile number) for account recovery.\n8. Check the box accepting the **Terms of Use** and **Privacy Notice**, then click **Done**.\n9. Activate your account via the link sent to your email or phone.\n\n# Recovering Your Account\n\nIf you forgot your password or username:\n\n1. On the login page, click **Forgot username or password**.\n2. **To recover your password**: check the box "I do not remember my password", choose **Email** or **Mobile Number**, and click **OK**.\n3. **To recover your username**: leave the password box unchecked, choose **Email** or **Mobile Number**, and click **OK**.\n\n# How to Find Your Username\n\nOnce signed in:\n\n1. Click your name in the top right.\n2. Click **Settings** → **Account**.\n3. Your username appears just below the **Change Password** section.\n\nSend that username to the Support Team if they need to set you up.',
 'pet-tool', '["familysearch","account","recovery"]', false),

('PET Setup & First-Time Access',
 'pet-setup-first-access',
 'How owners onboard a new user to PET and how everyone signs in for the first time.',
 E'# PET Setup\n\nTo be set up on the Pedigree Entry Tool (PET), the **Owner** of the company must send the following to their **Operations Manager**, who will notify them when they can log in:\n\n- Full name\n- FamilySearch username\n\n## Logging in to PET\n\n1. Go to **[www.familysearch.org/en/oral-gen/dashboard](https://www.familysearch.org/en/oral-gen/dashboard)**.\n2. Enter your FamilySearch **username** and **password**.\n3. Click **Sign in**.\n\nOn first sign-in your personal dashboard will be displayed and ready for you to start transcribing interviews.',
 'pet-tool', '["setup","onboarding","login"]', false),

('Data Entry Clerk Guide',
 'pet-data-entry-clerk-guide',
 'Step-by-step transcription workflow for Data Entry Clerks using PET.',
 E'# Data Entry Clerk — Transcribing an Interview\n\n## 1. Start a new interview\n\n- On your dashboard, click **Add Interview**.\n- Attach the **mobile app ZIP file** for the interview. (The scanned PDF can be attached now or later.)\n- Click **Begin Interview**. You cannot start until the ZIP file is attached.\n\n## 2. Interview details\n\n- Most header details auto-fill from the ZIP file.\n- The only editable field is the **Interviewee RIN** — enter the interviewee record identification number from the collection form.\n\n## 3. Transcribe the form — exactly as written\n\n> **Do not skip any individuals.**\n\n- Click **VIEW PDF** (after the PDF is uploaded) and place it side-by-side with PET to streamline data entry.\n- **Relation column** — use codes:\n  - `P` = parent, `S` = spouse, `C` = child, followed by the RIN of the relative. e.g. `P13` = parent of RIN 13.\n  - If a child has parents from different marriages, list both RINs separated by a comma, e.g. `C1, C2`.\n  - The first RIN of the interview does not need a relationship code.\n- **Given Names / Family Names** — fill in if provided. If only a last name was given, put it in **Given Names**.\n- **Birth Date** — mandatory for the interviewee and immediate family (spouse and children). Use the dates exactly as recorded. **Never estimate.** Verify any leap-year dates are real leap years.\n- **Birth Place** — required for every name. **Blank locations are not permitted.** All four location levels are required for the interviewee and immediate family, separated by commas.\n- **Living?** — required for every name. If "No", the **Death Date** and **Death Place** fields appear; only fill them if the interviewee provided that information.\n\n## 4. Move between pages\n\n- After finishing a page, click **Begin Next Page**. Progress saves automatically.\n\n## 5. Submit for review\n\n- When the interview is ready, click **Submit for Review** in the top right.\n- Confirm in the popup. You will see a success message and the interview will appear in your **Transcriptions in Progress** list.\n\n## 6. Handle Review Failed status\n\n- Open the failed interview by clicking the **pencil icon**.\n- Read the manager''s note in the **Data Manager Notes** under the header.\n- Make corrections, tick the box next to the manager''s note, and re-upload for another review.\n\n## 7. Find an interview\n\n- Use the **Find an Interview** search and type the **full interview folder name**.\n\n## 8. Replace bad files\n\n- If a file is wrong (e.g. blurry photo), click **Replace** on the interview to upload a corrected file. Make sure replacements are correct or the interview may be rejected or cancelled.',
 'pet-tool', '["data-entry","sop","transcription"]', false),

('Data Entry Manager Guide',
 'pet-data-entry-manager-guide',
 'How Data Entry Managers review, approve, fail, and submit interviews — including booklet printing.',
 E'# Data Entry Manager\n\n> Every Manager is a Data Entry Clerk, but not all Data Entry Clerks are Managers.\n\nYour responsibility is to ensure that the information transcribed in PET corresponds **exactly** to the interview collection form.\n\n## 1. Open the Interviews dashboard\n\n- After signing in, click **Interviews** in the top-left navigation.\n\n## 2. Find work to review\n\n- Click the **Awaiting Review** filter.\n  - **Yellow** label = not yet reviewed.\n  - **Red** label = previously failed at least one review.\n- Click the down caret next to an interview, then **Review Interview** on the right.\n\n## 3. Review the transcription\n\n- The interview opens read-only.\n- Click **VIEW PDF** to open the scanned form in a separate window — place windows side-by-side.\n- Click **VIEW ARTIFACTS** to review metadata, audios, and photos.\n- If this is a re-review, remove the previous rework note unless a new one is needed.\n\n## 4. Approve or fail\n\n- **Approve**: top right → **Approve Interview** → confirm. The interview moves to *ready for submission to audit*.\n- **Fail**: write what is wrong in **Data Manager Notes** under the header, then click **Failed Review** → **Needs Rework** to confirm.\n\n## 5. Easy fixes yourself\n\n- On a failed interview, click the **pencil icon** to fix it yourself.\n- ⚠️ This changes the **Data Entry by** field, which affects how the original clerk is paid.\n\n## 6. Replace bad files\n\n- Use **Replace** for blurry photos or wrong files. This does **not** change the *Data Entry By* field.\n\n## 7. Print family booklets\n\n- Click the **Ready for Submission** filter.\n- Click the **printer icon** on the interview, then choose **Generation Printout** or **Descendancy Printout**.\n- ⏰ Booklets must be printed and delivered to interviewees **within 30 days** of receiving payment from FamilySearch International.\n\n## 8. Send an approved interview back\n\n- In the Approved tab, click the **clock icon** to send back for rework. Use this only if you find an error missed earlier or approved one in error.',
 'pet-tool', '["review","qa","manager"]', false),

('Owner & Production Manager Guide',
 'pet-owner-production-manager-guide',
 'Managing users, bulk-uploading interviews, and downloading operational reports in PET.',
 E'# Owner & Production Manager Access\n\n> Owner and Production Manager rights are similar to those of a Data Entry Manager, **plus** user management, bulk uploads, and reports.\n\n## Managing Users\n\n1. Click **Manage Users** in the top-left of the main page.\n2. Choose the right tab: **Production Managers**, **Data Managers**, or **Data Clerks**.\n3. Click **Add New …** for the role you need.\n4. You will need each user''s **full name** and **FamilySearch username**.\n   - Data Entry Managers can add new Data Entry Clerks but cannot assign other people to be managers.\n\n> ⚠️ **Do not create FamilySearch profiles on behalf of your staff or for your business.** It is a security risk and can lead to suspension or termination. If an employee leaves, their interviews are not deleted when their profile is removed.\n\nIf adding fails, ask the user to verify their username (see the *Find Your Username* article).\n\n## Bulk Adding Interviews\n\n1. Open the **Interviews** section, then click **Add Interviews**.\n2. Choose one of:\n   - **Upload Folder** — bulk upload. Each interview must be in its own folder containing at least a ZIP file. PDF and FDB can follow later.\n   - **Upload Files** — pick individual files. For Legacy-software interviews, if you upload only the ZIP you cannot upload the FDB later.\n3. Newly added interviews appear with **Incomplete** status.\n\n## Downloading Reports\n\n1. On the Interviews page, click **Reports**.\n2. Choose a **Report Type**:\n   - **Staff Payment** — interview data, including submitted, duplicates, and approved names.\n   - **Booklet Delivery** — interviews ready for booklet printing and delivery.\n   - **Failed by Cloud Audit** — interviews that failed PET cloud audit, with notes.\n   - **Failed by VAC** — interviews that failed VAC audit, with reasons.\n3. Pick a date range and click **Download Report**.',
 'pet-tool', '["management","owner","reports"]', false),

('Interview Status Reference',
 'pet-interview-status-reference',
 'What every interview status in PET means.',
 E'# Interview Status Reference\n\n| Status | Meaning |\n|---|---|\n| **Incomplete** | Needs to be completed by the Data Entry Clerk and sent to a Manager for review. |\n| **Awaiting Review** | Waiting for a Manager to complete the review. |\n| **Review Failed** | Failed a Manager''s review. The transcription was incorrect or another problem is noted. Can be reworked. |\n| **Ready for Submission** | Passed Manager review. Ready to submit to Cloud Audit. |\n| **Processing Submission** | Currently being audited by Cloud Audit. |\n| **Submission Failed** | Problems found in Cloud Audit. Can be reworked. |\n| **Awaiting VAC Audit** | Passed Cloud Audit. Ready for the VAC (Visual Audit Center) to audit. |\n| **VAC Audit Failed** | Failed the VAC audit. Can be reworked. |\n| **VAC Audit Passed** | Passed the VAC audit. ✅ |\n| **Cancelled** | Flagged for fraud. **Cannot be reworked.** |',
 'pet-tool', '["status","reference"]', false),

('PET Filters & Search',
 'pet-filters-search',
 'How to filter and search the Interviews list in PET.',
 E'# Filters & Search\n\nThe interview page lists all interviews and their statuses. Multiple filters can be applied at the same time.\n\n## Status filters\n\nUse the checkboxes on the right (Incomplete, Awaiting Review, Review Failed, Ready for Submission, Processing Submission, Submission Failed, Awaiting VAC Audit, VAC Audit Failed, VAC Audit Passed, Cancelled).\n\n## Field filters\n\n| Field | Description |\n|---|---|\n| **Interview ID (Folder Name)** | Find an interview by typing its full ID / folder name. |\n| **Data Clerk** | Search all interviews transcribed by a specific data entry clerk. |\n| **Interviewer ID** | Search all interviews conducted by a specific interviewer. |\n| **Start Date** | Interviews on or after a date. |\n| **End Date** | Interviews on or before a date. |\n\nClick **Reset Filters** to clear everything.',
 'pet-tool', '["filters","search","reference"]', false),

('Reporting Technical Problems & Helper Number',
 'pet-reporting-tech-problems',
 'How to report PET technical problems and where to find your FamilySearch Helper Number.',
 E'# Reporting Technical Problems\n\nReview every issue with your manager first. Your manager will start a chat with our support number: **Oral Gen WhatsApp +1 385 786 9177**.\n\nThe manager may be asked to submit:\n\n- **Internet browser** — required (e.g. Google Chrome)\n- **What were you trying to do?** — required\n- **What is the issue?** — required\n- **Mobile App File** — if requested\n- **Photo of the error AND the URL** — required\n\n### Example\n\n- *Internet browser:* Google Chrome\n- *What were you trying to do?* After adding the file, I was trying to upload an interview.\n- *What is the issue?* After clicking **Begin Interview**, nothing happened. The button turned gray, but no file picker appeared. Refreshing produced the same result.\n\n### Support hours\n\n> Monday to Friday, **5:00 AM – 1:00 PM (Utah time)**.\n>\n> Each reported error will be responded to **within 24 hours**. Do **not** wait to report problems — the same issue may be affecting other users.\n\n# Helper Number\n\nIf the FamilySearch User Support Technician asks for your Helper Number, click the **Help icon** (top right of the screen) and read the Helper Number to them.',
 'pet-tool', '["support","troubleshooting","helper"]', false),

-- PRODUCTS
('BAT — Back-End Audit Tool',
 'product-bat-back-end-audit-tool',
 'Our proprietary AI-enhanced multi-tenant SaaS platform for genealogy field operations.',
 E'# BAT — Back-End Audit Tool\n\nA proprietary **AI-enhanced operational audit platform** built to optimize genealogy field operations.\n\n## Features\n\n- Connects Field Agents, Field Managers, QA Managers, and Production Managers.\n- Tracks the interview workflow **end-to-end**.\n- AI-powered **fraud detection** and anomaly identification.\n- Decision-support automation.\n- Quality-assurance dashboards and workflow management.\n- Designed for scalable field-audit operations.\n\n## Commercial model\n\n- Built as a **SaaS (Software as a Service)** product.\n- Structured as a **multi-tenant platform**.\n- Available for **licensing to contractors / subcontractors globally**.',
 'products', '["bat","saas","product"]', false),

('AVTool — Audit Verification Tool',
 'product-avtool-audit-verification-tool',
 'Field-proof verification platform that guarantees a verification visit actually happened.',
 E'# AVTool — Audit Verification Tool\n\nA field-proof verification platform developed to ensure **physical verification integrity**.\n\n## Problem solved\n\nDeveloped after discovering dishonest verification practices among field managers using manual checklists.\n\n## Features\n\n- **Audio recording** of the verification process\n- **Photo capture** with the interviewee / informant\n- Digital proof of field verification\n- Cloud synchronization\n- **Offline / online** functionality\n- Geo / accountability evidence for audit compliance\n\n## Strategic value\n\nProvides **indisputable proof** that verification visits occurred.',
 'products', '["avtool","verification","product"]', false),

('EduFlash — Gamified Learning SaaS',
 'product-eduflash',
 'Multi-tenant educational SaaS that gamifies learning and helps schools manage tuition.',
 E'# EduFlash\n\nA multi-tenant educational SaaS platform built to **gamify learning** and improve **institutional finance management**.\n\n## Core purpose\n\nTransform educational materials into **interactive flashcards** and game-based learning experiences.\n\n## Features\n\n- Converts study materials into flashcards.\n- Gamifies learning for improved student engagement.\n- Lets institutions upload curriculum / subject content.\n- Supports **physical flashcard printing** and delivery.\n- Tracks tuition / payment obligations.\n- Sends automated payment reminders.\n- Supports installment payments.\n- Helps institutions manage financial records.\n- Enables teachers to use gamified learning as extracurricular support.\n\n## Commercial model\n\n- SaaS licensing for schools and institutions.\n- Optional physical flashcard production and fulfillment service.',
 'products', '["eduflash","education","saas"]', false),

-- EVENTS
('Events & Talent Programs Overview',
 'events-talent-programs-overview',
 'Our flagship youth programs and the full event capabilities we deliver across Africa.',
 E'# Events & Talent Development Division\n\nFootprints Dynasty Limited organizes transformational events focused on **education, talent development, and youth empowerment**.\n\n## Core demographic\n\n- Teenagers (13+)\n- Youth (up to 25)\n\n## Strategic philosophy\n\nWe believe that investing in the rising generation creates long-term societal transformation.\n\n## Flagship programs\n\n### The Bee Contest\n- Educational spelling competition launched in **2019**.\n- One of our flagship annual events.\n\n### SpeakUp Contest\n- Public speaking and oratory development competition for teenagers and youth across Africa.\n\n### MAQ7\nA **triple-format competition** featuring:\n\n- **M** — Music Competition\n- **A** — Art Competition\n- **Q** — Questionnaire / Brain Teaser Competition\n\n## Event capabilities\n\n- Virtual events\n- Physical events\n- Hybrid events\n- Media coverage / event documentation\n- Event hosting and production\n- Full event management services',
 'events', '["events","youth","talent"]', false),

-- GETTING STARTED
('Knowledge Base — How to Use',
 'kb-how-to-use',
 'Quick guide to searching, browsing categories, and finding what you need in the Knowledge Base.',
 E'# Using the Knowledge Base\n\nThe Knowledge Base is your central library for company information, product docs, SOPs, and quick reference guides.\n\n## Search\n\n- Use the search bar at the top to find articles by **title, summary, or content**.\n- Search is powered by full-text indexing — partial words and synonyms work well.\n\n## Browse by category\n\n- **Company & Vision** — who we are and where we''re going.\n- **Oral Genealogy Project** — project philosophy and end-to-end workflow.\n- **Pedigree Entry Tool (PET)** — step-by-step PET instructions per role.\n- **Products & Platforms** — BAT, AVTool, EduFlash.\n- **Events & Talent Programs** — Bee Contest, SpeakUp, MAQ7.\n- **HR & Policies**, **IT & Tools**, **Field Operations**, **Finance**, **Departments** — internal references.\n\n## Pinned articles\n\nPinned articles appear at the top of each category. Start with these if you''re new — they cover the essentials.\n\n## Department-scoped articles\n\nSome articles are scoped to specific departments. You will only see articles relevant to **your department** plus all global articles.\n\n## Need something that''s not here?\n\nReach out to your manager or the Operations team. Admins can add new articles at any time via the CMS.',
 'getting-started', '["kb","help","onboarding"]', true)

) AS v(title, slug, summary, body, cat_slug, tags, is_pinned)
WHERE NOT EXISTS (SELECT 1 FROM public.kb_articles a WHERE a.slug = v.slug);