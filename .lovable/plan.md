

## Phase 2: AI Screening, Interview Scheduling, and Contract Signing

This phase adds three major features to the existing recruitment module built in Phase 1.

---

### Feature 1: AI-Powered Screening Questionnaires

When an admin moves an application to "screening" status, the system uses Lovable AI to generate role-specific screening questions based on the job's title, description, and requirements.

**How it works:**

1. Admin changes application status to "screening" in `/applications`
2. System calls a new edge function `generate-screening-questions` that sends the job title, description, and requirements to Lovable AI (Gemini) with tool calling to extract structured JSON questions
3. The generated questions (5-8 multiple choice + short answer) are stored in `screening_responses` as the initial template
4. Candidate sees a "Complete Screening" button when they log in (new `/screening` page)
5. Candidate answers questions; responses are saved and AI scores them via a second edge function call (`score-screening`)

**Database changes:** Add a `screening_questions` table to store generated question templates per application (separate from responses), or use the existing `screening_responses.responses` JSONB field to hold both questions and answers.

Decision: Use existing `screening_responses` table. Store questions in `responses` JSONB as `{ questions: [...], answers: [...], generated_at }`.

**New edge function: `generate-screening`**
- Accepts: `{ job_title, department, description, requirements }`
- Uses Lovable AI with tool calling to return structured questions
- Returns: array of question objects `{ id, question, type: 'multiple_choice' | 'short_answer', options?: string[] }`

**New edge function: `score-screening`**
- Accepts: `{ questions, answers, job_requirements }`
- Uses Lovable AI to evaluate answers and return a score (0-100) with brief feedback
- Saves score to `screening_responses.score`

**New page: `/screening`**
- Candidate-facing questionnaire page
- Accepts `?applicationId=<id>` query param
- Renders AI-generated questions dynamically
- Submit button saves answers and triggers scoring

**Updates to `/applications`:**
- When admin sets status to "screening", trigger question generation
- Show screening score badge next to screened applications
- "View Screening" button to see candidate responses and AI score

---

### Feature 2: Interview Scheduling

When admin moves application to "interview" status, they can schedule an interview with date, time, meeting link, and interviewer name.

**Updates to `/applications` page:**
- Add "Schedule Interview" dialog when status is "interview"
- Form fields: interview date/time, meeting link (URL), interviewer name
- Creates record in existing `interviews` table
- Shows interview details inline in application detail dialog

**New page: `/interviews` (candidate-facing)**
- Shows upcoming interviews for the logged-in candidate
- Displays date, time, meeting link, interviewer
- Read-only view with "Join Meeting" button linking to meeting URL

**Updates to `/applications` (admin side):**
- After interview, admin can record: score (1-10), feedback text, outcome (pass/fail)
- Updates the `interviews` table record

---

### Feature 3: Contract Generation with Digital Signature

When admin moves application to "offered" status, they can generate a contract and upload it. The candidate then views the contract, draws their signature on a canvas, and submits.

**New component: `SignatureCanvas.tsx`**
- HTML5 Canvas-based signature pad
- Touch and mouse support
- Clear button to reset
- Returns signature as base64 data URL (PNG)

**New page: `/offers` (candidate-facing)**
- Lists contracts for the candidate's applications
- "View & Sign" button opens contract view
- Shows embedded PDF/contract URL via iframe or link
- Signature canvas below the contract
- "I Accept & Sign" button (mandatory signature before submit)
- On submit: saves `signature_data` (base64) and `signed_at` to `contracts` table, updates status to "signed"

**Updates to `/applications` (admin side):**
- "Generate Contract" button when status is "offered"
- Upload contract PDF to `contracts` storage bucket
- Creates record in `contracts` table with `contract_url`
- Shows contract status (pending, signed) in application details
- View signed contract with embedded signature

---

### New Routes

| Route | Page | Access |
|-------|------|--------|
| `/screening` | Candidate questionnaire | Candidates (own applications) |
| `/interviews` | Interview details | Candidates (own interviews) |
| `/offers` | Contract signing | Candidates (own contracts) |

---

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/generate-screening/index.ts` | AI question generation edge function |
| `supabase/functions/score-screening/index.ts` | AI answer scoring edge function |
| `src/pages/Screening.tsx` | Candidate screening questionnaire page |
| `src/pages/Interviews.tsx` | Candidate interview details page |
| `src/pages/Offers.tsx` | Contract viewing and digital signature page |
| `src/components/SignatureCanvas.tsx` | Reusable signature pad component |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Applications.tsx` | Add screening trigger, interview scheduling dialog, contract generation, score display |
| `src/App.tsx` | Add 3 new routes |
| `supabase/config.toml` | Register new edge functions with `verify_jwt = false` |

### Database Changes

A small migration to add a `screening_questions` JSONB column to `screening_responses` table is optional since the existing `responses` JSONB column can hold both questions and answers. No schema changes are strictly required -- all existing tables support the needed data.

---

### Technical Details

**AI Question Generation (edge function):**
- Uses Lovable AI gateway at `https://ai.gateway.lovable.dev/v1/chat/completions`
- Model: `google/gemini-3-flash-preview` (default)
- Uses tool calling to extract structured output (array of questions)
- System prompt instructs AI to generate 5-8 screening questions tailored to the job role and requirements
- Handles 429/402 rate limit errors gracefully

**AI Scoring (edge function):**
- Same gateway, non-streaming
- Tool calling returns `{ score: number, feedback: string }` 
- Score is 0-100 based on answer quality relative to job requirements

**Signature Canvas:**
- Pure HTML5 Canvas, no external libraries
- Captures mouse/touch events for drawing
- Exports to PNG base64 via `canvas.toDataURL()`
- Stored in `contracts.signature_data` column (text, already exists)

**Candidate Navigation:**
- After login, candidates land on `/jobs`
- Candidates can navigate to `/screening`, `/interviews`, `/offers` from a simple nav or notification cards on `/jobs` page
- Each page queries only the candidate's own data (RLS enforced)

