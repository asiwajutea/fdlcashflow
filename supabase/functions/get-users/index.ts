import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error('Invalid authorization');
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      throw new Error('Only admins can view all users');
    }

    // Get all users from auth.users via admin API
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) throw usersError;

    // Get profiles and roles for each user
    const users = await Promise.all(
      authUsers.users.map(async (user) => {
        const [profileResult, roleResult, capabilitiesResult] = await Promise.all([
          supabaseAdmin.from('profiles').select('*').eq('id', user.id).single(),
          supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).single(),
          supabaseAdmin.from('user_capabilities').select('capability').eq('user_id', user.id)
        ]);

        const p = profileResult.data || {};
        return {
          id: user.id,
          email: user.email,
          full_name: p.full_name || user.user_metadata?.full_name || null,
          passcode: p.passcode || null,
          is_active: p.is_active ?? true,
          approval_status: p.approval_status || 'approved',
          passcode_acknowledged: p.passcode_acknowledged ?? true,
          birthday: p.birthday || null,
          gender: p.gender || null,
          employee_id: p.employee_id || null,
          phone: p.phone || null,
          employment_start_date: p.employment_start_date || null,
          position_id: p.position_id || null,
          department_id: p.department_id || null,
          project_id: p.project_id || null,
          team_id: p.team_id || null,
          role: roleResult.data?.role || 'guest',
          capabilities: capabilitiesResult.data?.map(c => c.capability) || [],
          created_at: user.created_at
        };
      })
    );

    return new Response(
      JSON.stringify({ users }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
