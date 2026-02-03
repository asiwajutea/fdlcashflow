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
      throw new Error('Only admins can update users');
    }

    const { user_id, full_name, role, is_active, new_password, regenerate_passcode } = await req.json();

    if (!user_id) {
      throw new Error('user_id is required');
    }

    const updates: any = {};

    // Update password if provided
    if (new_password) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        { password: new_password }
      );
      if (passwordError) throw passwordError;
    }

    // Regenerate passcode if requested
    let newPasscode: string | undefined;
    if (regenerate_passcode) {
      newPasscode = generatePasscode();
      await supabaseAdmin
        .from('profiles')
        .update({ passcode: newPasscode })
        .eq('id', user_id);
    }

    // Update profile fields
    if (full_name !== undefined || is_active !== undefined) {
      const profileUpdates: any = {};
      if (full_name !== undefined) profileUpdates.full_name = full_name;
      if (is_active !== undefined) profileUpdates.is_active = is_active;

      await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user_id);
    }

    // Update role if provided
    if (role) {
      const validRoles = ['admin', 'employee', 'guest'];
      if (!validRoles.includes(role)) {
        throw new Error('Invalid role');
      }

      await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', user_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        passcode: newPasscode
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
