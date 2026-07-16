-- Interview type and location details
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS interview_type    TEXT DEFAULT 'virtual',  -- 'virtual' | 'physical'
  ADD COLUMN IF NOT EXISTS location_platform TEXT DEFAULT NULL,        -- 'google_meet' | 'zoom' | 'whatsapp' | 'office'
  ADD COLUMN IF NOT EXISTS office_address    TEXT DEFAULT NULL,        -- filled when platform = 'office'
  ADD COLUMN IF NOT EXISTS contact_phone     TEXT DEFAULT NULL;        -- HR contact number for candidate
