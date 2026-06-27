-- Staff notification SMS templates
-- These are sent TO admin/HR/finance staff when key events happen

INSERT INTO public.sms_templates (key, name, body, variables, is_active) VALUES

  -- 1. New finance request submitted by employee
  ('staff_finance_request', 'Staff: New Finance Request',
   'FDL Alert: {{requester}} submitted a {{kind}} request for NGN {{amount}}. Reason: {{reason}}. Review at {{link}}',
   '["requester","kind","amount","reason","link"]'::jsonb, true),

  -- 2. New job application received
  ('staff_new_application', 'Staff: New Job Application',
   'FDL Alert: New application received for {{job}} from {{candidate}}. Review at {{link}}',
   '["job","candidate","link"]'::jsonb, true),

  -- 3. Candidate submitted screening answers
  ('staff_screening_submitted', 'Staff: Screening Answers Submitted',
   'FDL Alert: {{candidate}} has completed the screening questionnaire for {{job}}. Ready for review at {{link}}',
   '["candidate","job","link"]'::jsonb, true),

  -- 4. New user pending approval
  ('staff_new_user_pending', 'Staff: New User Pending Approval',
   'FDL Alert: A new user {{name}} ({{email}}) has registered and is awaiting approval. Review at {{link}}',
   '["name","email","link"]'::jsonb, true),

  -- 5. Interview score submitted by HR
  ('staff_interview_scored', 'Staff: Interview Scored',
   'FDL Alert: Interview for {{candidate}} ({{job}}) has been scored {{score}}/10 by {{scorer}}. View at {{link}}',
   '["candidate","job","score","scorer","link"]'::jsonb, true),

  -- 6. Contract signed by candidate
  ('staff_contract_signed', 'Staff: Contract Signed',
   'FDL Alert: {{candidate}} has signed the contract for the {{job}} role. Review at {{link}}',
   '["candidate","job","link"]'::jsonb, true),

  -- 7. Payslip dispute / finance request over budget
  ('staff_over_budget_request', 'Staff: Over-Budget Finance Request',
   'FDL Alert: {{requester}} submitted a {{kind}} request for NGN {{amount}} which EXCEEDS their monthly limit of NGN {{limit}}. Review urgently at {{link}}',
   '["requester","kind","amount","limit","link"]'::jsonb, true)

ON CONFLICT (key) DO UPDATE SET
  name     = EXCLUDED.name,
  body     = EXCLUDED.body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;
