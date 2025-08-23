// supabase/functions/create-inquiry/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

// WARNING: The service_role key has super admin rights and should be handled with care.
// It is required here to securely call the PostgreSQL function.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // --- 1. AUTHENTICATION ---
  // Get the authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing auth header' }), { status: 401 })
  }
  
  // Create a Supabase client with the user's token to verify their identity
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  // Get the logged-in user's data
  const { data: { user } } = await supabase.auth.getUser()

  // --- 2. GET REQUEST BODY ---
  const {
    artworkId,
    message,
    inquirerName,
    inquirerEmail
  } = await req.json()

  if (!artworkId || !message || !inquirerName || !inquirerEmail) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
  }

  // --- 3. CALL THE DATABASE FUNCTION ---
  // We use the admin client here to call the SECURITY DEFINER function
  const { data, error } = await supabaseAdmin.rpc('create_inquiry_and_notify', {
    p_artwork_id: artworkId,
    p_message_content: message,
    p_inquirer_name: inquirerName,
    p_inquirer_email: inquirerEmail,
    p_inquirer_user_id: user?.id, // Pass the user's ID if they are logged in, otherwise it's null
  })

  if (error) {
    console.error('RPC Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  // --- 4. RETURN SUCCESS ---
  return new Response(JSON.stringify({ conversation_id: data }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
