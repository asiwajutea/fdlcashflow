## Plan: Mobile Optimization, Screening Enhancements & Voice Recording

### Overview

Four workstreams: (1) mobile-responsive fixes for Homepage and Apply pages, (2) enhanced AI screening prompt for field-work-specific questions (this is for field-related job screening), (3) making screening accessible to candidates from their dashboard, and (4) voice recording for long-answer questions with HR playback.

---

### 1. Mobile Optimization

**Homepage (`src/pages/public/Home.tsx`)**

- Reduce hero height on mobile (`h-[450px]` instead of `650px`)
- Scale down hero text sizes for small screens (e.g., `text-3xl` on mobile)
- Reduce CTA button spacing and padding on mobile
- Make animated shapes smaller/hidden on mobile (`hidden md:block` for some)
- Ensure stats grid, services grid, events grid, and testimonials all render cleanly on mobile (most already use responsive classes but need fine-tuning)

**Apply Page (`src/pages/Apply.tsx`)**

- On mobile, stack the layout vertically (already `flex-col lg:flex-row`) -- verify the sticky form doesn't cause issues on mobile
- Reduce image banner height on mobile
- Ensure form inputs and accordion are touch-friendly

**Careers Page (`src/pages/public/Careers.tsx`)**

- Already mostly responsive, minor padding tweaks

---

### 2. Enhanced Screening Questions for Field Work

**File: `supabase/functions/generate-screening/index.ts**`

- Update the system prompt to explicitly instruct the AI to include questions covering:
  1. Current location and willingness to relocate temporarily
  2. Past field work experience
  3. Understanding that the role involves field work and interaction with strangers
  4. Medical fitness for field work (self-declaration, no paperwork)
  5. Salary expectations
  6. Ability to work in a team and unsupervised
  7. Other relevant field-role screening questions
- Keep the existing structured output format (mix of multiple_choice and short_answer)

---

### 3. Candidate Access to Screening

Currently, the `/screening?applicationId=xxx` page exists and works, but candidates may not know how to get there. 

**Candidate Dashboard Integration:**

- In the candidate's dashboard or application status view, add a "Complete Screening" button/link that navigates to `/screening?applicationId=xxx` when a screening record exists but hasn't been answered yet
- Search for where candidate applications are displayed and add the screening link there

---

### 4. Voice Recording for Short-Answer Questions

**Database: Create a storage bucket**

- Create a `screening-audio` storage bucket (public) for storing voice recordings

**New Component: `VoiceRecorder.tsx**`

- Uses the browser's `MediaRecorder` API to record audio from the microphone
- Shows record/stop/play controls
- On stop, uploads the audio file to the `screening-audio` bucket
- Stores the public URL in the answer field (e.g., `audio::https://...url`)

**Screening Page (`src/pages/Screening.tsx`)**

- For `short_answer` type questions, show both the textarea AND a voice record button
- Candidate can type OR record (or both)
- Display audio player for already-recorded answers

**Screening View Dialog (`src/components/hr/ScreeningViewDialog.tsx`)**

- When an answer contains an audio URL (prefixed with `audio::`), render an `<audio>` player so HR can listen to the response
- Show text answers normally alongside audio

**Score Screening Edge Function (`supabase/functions/score-screening/index.ts`)**

- When an answer is audio-only (`audio::url`), note it as "Voice response provided" in the Q&A text sent to AI for scoring, since the AI can't listen to audio
- The AI will score based on text answers and note voice responses

---

### Technical Details

**Storage bucket migration:**

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('screening-audio', 'screening-audio', true);
-- RLS: anyone authenticated can upload, public can read
CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'screening-audio');
CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'screening-audio');
```

**VoiceRecorder component pattern:**

- `navigator.mediaDevices.getUserMedia({ audio: true })`
- `new MediaRecorder(stream, { mimeType: 'audio/webm' })`
- Collect chunks, create blob, upload to storage bucket
- Return public URL via callback

**Answer format convention:**

- Text answer: stored as plain string
- Audio answer: stored as `audio::https://...public-url`
- Both: stored as `text content\naudio::https://...public-url`

This allows backward compatibility and easy parsing in both the scoring function and the review dialog.