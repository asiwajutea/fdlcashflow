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
      throw new Error('Only admins can create users');
    }

    const { email, password, full_name, role = 'employee' } = await req.json();

    if (!email || !password || !full_name) {
      throw new Error('Email, password, and full_name are required');
    }

    // Validate role
    const validRoles = ['admin', 'employee', 'guest'];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    // Generate passcode
    const passcode = generatePasscode();

    // Create user with Supabase Admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        passcode
      }
    });

    if (createError) {
      throw createError;
    }

    // Update the profile with full_name (trigger already creates profile with passcode)
    if (userData.user) {
      await supabaseAdmin
        .from('profiles')
        .update({ full_name })
        .eq('id', userData.user.id);

      // If role is admin, grant all capabilities
      if (role === 'admin') {
        const allCapabilities = [
          'view_dashboard', 'enter_weekly_data', 'view_weekly_history',
          'manage_rates', 'generate_invoice', 'view_invoices',
          'manage_employees', 'view_daily_tracker', 'add_transactions',
          'view_statistics', 'manage_company_settings', 'bulk_invoice', 'manage_users'
        ];

        for (const capability of allCapabilities) {
          await supabaseAdmin
            .from('user_capabilities')
            .insert({
              user_id: userData.user.id,
              capability,
              granted_by: requestingUser.id
            });
        }
      } else if (role === 'employee') {
        // Default employee capabilities
        const defaultCapabilities = ['view_dashboard', 'view_daily_tracker', 'add_transactions'];
        for (const capability of defaultCapabilities) {
          await supabaseAdmin
            .from('user_capabilities')
            .insert({
              user_id: userData.user.id,
              capability,
              granted_by: requestingUser.id
            });
        }
      } else if (role === 'guest') {
        // Guest only gets view_dashboard
        await supabaseAdmin
          .from('user_capabilities')
          .insert({
            user_id: userData.user.id,
            capability: 'view_dashboard',
            granted_by: requestingUser.id
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userData.user?.id,
          email: userData.user?.email,
          full_name,
          role
        },
        passcode
      }),
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
