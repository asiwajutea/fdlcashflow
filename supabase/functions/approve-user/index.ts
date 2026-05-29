import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generatePasscode(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !requestingUser) throw new Error('Invalid authorization');

    const { data: roleData } = await supabaseAdmin
      .from('user_roles').select('role').eq('user_id', requestingUser.id).single();
    if (roleData?.role !== 'admin') throw new Error('Only admins can approve users');

    const { user_id, action } = await req.json();
    if (!user_id || !['approve', 'reject'].includes(action)) {
      throw new Error('user_id and valid action (approve|reject) are required');
    }

    if (action === 'reject') {
      await supabaseAdmin.from('profiles').update({ approval_status: 'rejected' }).eq('id', user_id);
      return new Response(JSON.stringify({ success: true, status: 'rejected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Approve: generate passcode, set approved
    const passcode = generatePasscode();
    const { error: updErr } = await supabaseAdmin.from('profiles')
      .update({ approval_status: 'approved', passcode, passcode_acknowledged: false })
      .eq('id', user_id);
    if (updErr) throw updErr;

    // Apply default employee capabilities (from custom_roles "Employee" template if it exists)
    const { data: tpl } = await supabaseAdmin.from('custom_roles').select('capabilities').eq('name', 'Employee').maybeSingle();
    const caps: string[] = Array.isArray(tpl?.capabilities)
      ? (tpl!.capabilities as string[])
      : ['view_dashboard', 'view_daily_tracker', 'add_transactions', 'view_inbox', 'send_messages'];

    // Clear and reinsert
    await supabaseAdmin.from('user_capabilities').delete().eq('user_id', user_id);
    if (caps.length) {
      await supabaseAdmin.from('user_capabilities')
        .insert(caps.map((c) => ({ user_id, capability: c })));
    }

    // Send approval SMS (fire-and-forget; non-blocking)
    try {
      const { data: prof } = await supabaseAdmin
        .from('profiles').select('full_name, phone').eq('id', user_id).maybeSingle();
      if (prof?.phone) {
        const firstName = (prof.full_name || 'there').split(' ')[0];
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: prof.phone, user_id, template_key: 'account_approved',
            vars: { name: firstName },
          }),
        }).catch((e) => console.error('approval sms failed', e));
      }
    } catch (e) { console.error('approval sms wrap error', e); }

    return new Response(JSON.stringify({ success: true, status: 'approved' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
