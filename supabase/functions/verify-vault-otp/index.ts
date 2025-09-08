import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { token } = await req.json()
    if (!token) throw new Error('Missing OTP token')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    const { error } = await supabase.auth.verifyOtp({
      email: user.email!,
      token: token,
      type: 'email', // The type used in signInWithOtp
    })

    if (error) throw new Error(`Invalid OTP: ${error.message}`)

    // On successful verification, we can proceed.
    // In a real high-security scenario, you might issue a short-lived JWT here.
    // For simplicity, we'll rely on a client-side flag.
    return new Response(JSON.stringify({ success: true, message: 'Verification successful.' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401, // Unauthorized
      headers: { 'Content-Type': 'application/json' },
    })
  }
})