-- Update interview SMS template to include location and contact info
INSERT INTO public.sms_templates (key, name, body, variables, is_active) VALUES (
  'candidate_interview_scheduled',
  'Candidate: Interview Scheduled',
  'Hi {{name}}, your interview for {{job}} at Footprints Dynasty is on {{date}}. Location: {{link}}.{{contact}} Visit /interviews for details.',
  '["name","job","date","link","contact"]'::jsonb,
  true
)
ON CONFLICT (key) DO UPDATE SET
  name      = EXCLUDED.name,
  body      = EXCLUDED.body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;
