import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// createClient is only needed if this function directly interacts with the DB,
// but for an orchestrator, it's good to have for potential error logging or future needs.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Helper function to correctly handle CORS preflight requests
function handleCorsPreflight(request: Request) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS'); // Allow POST for actual request, OPTIONS for preflight
  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type'); // Required headers from client
  headers.set('Access-Control-Max-Age', '86400'); // Cache preflight response for 24 hours
  return new Response(null, { status: 204, headers }); // 204 No Content for successful preflight
}

serve(async (req) => {
  // 1. Handle CORS preflight requests FIRST
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  // 2. Set CORS headers for the actual response (POST or errors)
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Only POST requests are supported." }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client for potential direct DB interaction if needed.
    // Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Edge Function env.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL environment variable is not set for generate-images.");
    }
    if (!serviceRoleKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set for generate-images.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey); // Initialize client with validated vars

    const body = await req.json();
    const { artworkId, force = false, forceWatermark = false, forceVisualization = false } = body;

    if (!artworkId) {
      return new Response(JSON.stringify({ error: "artworkId is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[generate-images] Received request for artworkId: ${artworkId} with force=${force}, forceWatermark=${forceWatermark}, forceVisualization=${forceVisualization}`);

    // --- Orchestration Logic: Invoke 'process-artwork-images' ---
    // Construct the URL for the 'process-artwork-images' function dynamically.
    const processArtworkImagesUrl = `${supabaseUrl}/functions/v1/process-artwork-images`;
    
    console.log(`[generate-images] Invoking: ${processArtworkImagesUrl}`);

    const invokeResponse = await fetch(processArtworkImagesUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`, // Authenticate with service role key
        'apikey': serviceRoleKey, // Also often needed by Supabase functions
      },
      body: JSON.stringify({ artworkId, force, forceWatermark, forceVisualization }),
    });

    if (!invokeResponse.ok) {
      const errorText = await invokeResponse.text();
      console.error(`Error response from process-artwork-images: ${invokeResponse.status} - ${errorText}`);
      // Re-throw the error from the invoked function to propagate the failure reason
      throw new Error(`Failed to trigger process-artwork-images (Status: ${invokeResponse.status}): ${errorText}`);
    }

    const invokeResult = await invokeResponse.json(); 

    console.log(`[generate-images] Successfully triggered process-artwork-images for artwork ${artworkId}. Result:`, invokeResult);

    return new Response(
      JSON.stringify({
        success: true,
        artworkId,
        message: "Image processing orchestrated by generate-images and triggered process-artwork-images.",
        orchestration_result: invokeResult // Pass the result from the invoked function
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );

  } catch (err) {
    console.error("Error in generate-images function:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});