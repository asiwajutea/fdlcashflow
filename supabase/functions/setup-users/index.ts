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

    // Create admin user
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: 'finance@footprintsdynasty.com',
      password: '@Dynastypassword18#',
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        passcode: '18012019'
      }
    });

    if (adminError && !adminError.message.includes('already registered')) {
      throw adminError;
    }

    // Create guest user
    const { data: guestData, error: guestError } = await supabaseAdmin.auth.admin.createUser({
      email: 'guest@footprintsdynasty.com',
      password: '@dynastyguest',
      email_confirm: true,
      user_metadata: {
        role: 'guest',
        passcode: '00000000'
      }
    });

    if (guestError && !guestError.message.includes('already registered')) {
      throw guestError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Users created successfully',
        admin: adminData?.user?.email,
        guest: guestData?.user?.email
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
