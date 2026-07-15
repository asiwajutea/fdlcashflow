-- SMS sent to candidate when an interview is scheduled or rescheduled by HR
INSERT INTO public.sms_templates (key, name, body, variables, is_active) VALUES (
  'candidate_interview_scheduled',
  'Candidate: Interview Scheduled',
  'Hi {{name}}, your interview for the {{job}} role at Footprints Dynasty has been scheduled for {{date}}. Join via: {{link}}. Login to https://footprintsdynasty.com.ng.',
  '["name","job","date","link"]'::jsonb,
  true
)
ON CONFLICT (key) DO UPDATE SET
  name      = EXCLUDED.name,
  body      = EXCLUDED.body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;
