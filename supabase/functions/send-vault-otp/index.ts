import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    // Generate a 6-digit OTP and send it via email
    const { data, error } = await supabase.auth.signInWithOtp({
      email: user.email!,
      options: {
        shouldCreateUser: false, // Don't create a new user
      },
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, message: `A secure code has been sent to ${user.email}` }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})