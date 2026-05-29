import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMPLOYEE_CAPS = ['view_inbox', 'send_messages'];
const CANDIDATE_CAPS = ['submit_application', 'complete_screening', 'view_interview', 'sign_contract'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requester } } = await admin.auth.getUser(token);
    if (!requester) throw new Error('Unauthorized');

    const { data: roleRow } = await admin.from('user_roles').select('role').eq('user_id', requester.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) throw new Error('Admin only');

    const { application_id } = await req.json();
    if (!application_id) throw new Error('application_id required');

    // Get application -> candidate -> user
    const { data: app, error: appErr } = await admin
      .from('applications')
      .select('id, candidates!inner(id, user_id), job_positions!inner(title)')
      .eq('id', application_id)
      .single();
    if (appErr || !app) throw new Error('Application not found');

    const userId = (app as any).candidates.user_id;
    const jobTitle = (app as any).job_positions.title;

    // Get user info
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const email = userData?.user?.email || '';
    const fullName = (userData?.user?.user_metadata?.full_name as string) || email.split('@')[0];

    // 1. Replace role candidate -> employee
    await admin.from('user_roles').delete().eq('user_id', userId);
    await admin.from('user_roles').insert({ user_id: userId, role: 'employee' });

    // 2. Replace capabilities
    await admin.from('user_capabilities').delete().eq('user_id', userId).in('capability', CANDIDATE_CAPS);
    for (const cap of EMPLOYEE_CAPS) {
      await admin.from('user_capabilities').upsert({ user_id: userId, capability: cap }, { onConflict: 'user_id,capability' });
    }

    // 3. Approve profile
    await admin.from('profiles').update({ approval_status: 'approved' }).eq('id', userId);

    // 4. Update auth metadata
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: { ...(userData?.user?.user_metadata || {}), role: 'employee' },
    });

    // 5. Link or create employee record
    const { data: existingByEmail } = await admin
      .from('employees')
      .select('id, user_id')
      .ilike('email', email)
      .maybeSingle();

    if (existingByEmail) {
      await admin.from('employees').update({ user_id: userId, profile_id: userId }).eq('id', existingByEmail.id);
    } else {
      const { data: existingByUser } = await admin.from('employees').select('id').eq('user_id', userId).maybeSingle();
      if (!existingByUser) {
        const empId = 'EMP-' + userId.substring(0, 8);
        await admin.from('employees').insert({
          employee_id: empId,
          full_name: fullName,
          designation: jobTitle || '',
          email,
          user_id: userId,
          profile_id: userId,
        });
      }
    }

    // Hire SMS
    try {
      const { data: prof } = await admin.from('profiles').select('full_name, phone').eq('id', userId).maybeSingle();
      if (prof?.phone) {
        const firstName = (prof.full_name || fullName || 'there').split(' ')[0];
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: prof.phone, user_id: userId, template_key: 'candidate_hire',
            vars: { name: firstName, position: jobTitle || 'your role' },
          }),
        }).catch((e) => console.error('hire sms failed', e));
      }
    } catch (e) { console.error('hire sms wrap', e); }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
