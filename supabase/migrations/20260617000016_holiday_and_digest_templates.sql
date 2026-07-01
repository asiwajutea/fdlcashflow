-- Holiday SMS template (sends to all employees on holiday dates)
INSERT INTO public.sms_templates (key, name, body, variables, is_active) VALUES
  ('holiday_greeting', 'Holiday Greeting',
   'Happy {{holiday}} from all of us at Footprints Dynasty! 🎉 Wishing you and your family a wonderful celebration. See you on the other side!',
   '["holiday"]'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET
  name      = EXCLUDED.name,
  body      = EXCLUDED.body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;
