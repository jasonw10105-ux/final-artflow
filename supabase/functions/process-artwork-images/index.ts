// supabase/functions/process-artwork-images/index.ts
//
// THIS VERSION IS DESIGNED FOR A *COMPLETELY FREE* SOLUTION RUNNABLE ON DENO EDGE FUNCTIONS
// WITH THE CURRENT DENO EDGE RUNTIME LIMITATIONS.
//
// It explicitly removes all external AI API calls (like Nyckel/Hugging Face) and
// ALL pixel-based image operations.
//
// Responsibilities:
// 1) Receives ALL artwork-level metadata (dominant_colors, genre, subject, orientation, keywords_from_image)
//    directly from the frontend (via the 'generate-images' orchestrator).
// 2) Extracts additional keywords from artwork text fields (title, description, medium).
// 3) Merges and updates the 'artworks' table with all collected metadata.
//
// Automatic image-based genre/subject classification, dominant color extraction (server-side),
// watermarking, and visualization are NOT performed by this function.
// These are expected to be handled CLIENT-SIDE, with generated image URLs stored directly
// on the 'artwork_images' table records via frontend Supabase calls.
//
// Invocation: POST /functions/v1/process-artwork-images
// Body: { artworkId: string, dominant_colors?: string[], genre?: string, subject?: string,
//         keywords_from_image?: string[], orientation?: string, force?: boolean }
// Auth: Service role key is used inside; endpoint can be invoked from client after save.
//
// ENV VARS (set in Supabase > Project Settings > Functions):
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.4";

// --- Basic Keyword Extraction (remains as text-based) ---
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "but", "or", "for", "nor", "so", "yet", "at", "by",
  "in", "of", "on", "to", "up", "down", "with", "from", "into", "on to", "over",
  "under", "about", "above", "across", "after", "against", "along", "among",
  "around", "before", "behind", "below", "beneath", "beside", "between", "beyond",
  "during", "except", "inside", "like", "near", "off", "out", "outside", "past",
  "through", "toward", "towards", "until", "upon", "within", "without", "this",
  "that", "these", "those", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall", "should",
  "can", "could", "may", "might", "must", "it", "its", "i", "me", "my", "mine",
  "you", "your", "yours", "he", "him", "his", "she", "her", "hers", "we", "us",
  "our", "ours", "they", "them", "their", "theirs", "what", "which", "who", "whom",
  "whose", "where", "when", "why", "how", "all", "any", "both", "each", "few",
  "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don",
  "should", "now", "d", "ll", "m", "o", "re", "ve", "y", "ain", "aren", "couldn",
  "didn", "doesn", "hadn", "hasn", "haven", "isn", "ma", "mightn", "mustn", "needn",
  "shan", "shouldn", "wasn", "weren", "won", "wouldn", "about", "above", "across",
  "after", "afterwards", "again", "against", "all", "almost", "alone", "along",
  "already", "also", "although", "always", "am", "among", "amongst", "amount",
  "an", "and", "another", "any", "anyhow", "anyone", "anything", "anyway", "anywhere",
  "are", "around", "as", "at", "back", "be", "became", "because", "become", "becomes",
  "becoming", "been", "before", "beforehand", "behind", "being", "below", "beside",
  "besides", "between", "beyond", "bill", "both", "bottom", "but", "by", "call",
  "can", "cannot", "co", "con", "de", "do", "done", "down", "due", "during", "each",
  "eg", "eight", "either", "eleven", "else", "elsewhere", "empty", "enough", "etc",
  "even", "ever", "every", "everyone", "everything", "everywhere", "except", "few",
  "fifteen", "fify", "fill", "find", "fire", "first", "five", "for", "former",
  "formerly", "forty", "found", "four", "front", "full", "further", "get", "give",
  "go", "had", "has", "hasnt", "have", "he", "hence", "her", "here", "hereafter",
  "hereby", "herein", "hereupon", "hers", "herself", "him", "himself", "his",
  "how", "however", "hundred", "ie", "if", "in", "inc", "indeed", "interest",
  "into", "is", "it", "its", "itself", "keep", "last", "latter", "latterly",
  "least", "less", "ltd", "made", "many", "may", "me", "meanwhile", "might",
  "mill", "mine", "more", "moreover", "most", "other", "others", "otherwise",
  "our", "ours", "ourselves", "out", "over", "own", "part", "per", "perhaps",
  "please", "put", "rather", "re", "same", "see", "seem",
  "seemed", "seeming", "seems", "serious", "several", "she", "should", "show",
  "side", "since", "six", "sixty", "so", "some", "somehow", "someone", "something",
  "sometime", "sometimes", "somewhere", "still", "such", "system", "take", "ten",
  "than", "that", "the", "their", "them", "themselves", "then", "thence", "there",
  "thereafter", "thereby", "therefore", "therein", "thereupon", "these", "they",
  "thick", "thin", "third", "this", "those", "though", "three", "through", "throughout",
  "thru", "thus", "to", "together", "top", "toward", "towards", "twelve", "twenty",
  "two", "un", "under", "until", "up", "upon", "us", "very", "via", "was", "we",
  "well", "were", "what", "whatever", "when", "whence", "whenever", "where",
  "whereafter", "whereby", "wherein", "whereupon", "wherever", "whether", "which",
  "while", "whither", "who", "whoever", "whole", "whom", "whose", "why", "will",
  "with", "within", "without", "would", "yet", "you", "your", "yours", "yourself",
  "yourselves", "z", "s", "t", "can", "will", "just", "don", "should", "now"
]);


function extractKeywords(title: string | null, description: string | null, medium: string | null): string[] {
  const combinedText = [title, description, medium].filter(Boolean).join(" ").toLowerCase();

  const words = combinedText.split(/\W+/)
                           .filter(word => word.length > 2 && !STOP_WORDS.has(word));

  return Array.from(new Set(words));
}

// Handler --------------------------------------------------------------

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Only POST requests are supported." }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY environment variables are not set for process-artwork-images.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { 
      artworkId, 
      dominant_colors: incomingDominantColors, 
      genre: incomingGenre, 
      subject: incomingSubject, 
      keywords_from_image: incomingImageKeywords, 
      orientation: incomingOrientation, 
      force = false // This flag is now mainly for frontend to decide re-generation
    } = body;


    if (!artworkId) {
      return new Response(JSON.stringify({ error: "artworkId is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[process-artwork-images] Processing artworkId: ${artworkId}`);

    // 1) Fetch artwork details to get existing metadata (title, description, medium for keywords)
    const { data: artwork, error: artErr } = await supabase
      .from("artworks")
      .select(`
        id, title, description, medium, keywords, dominant_colors, genre, subject, orientation,
        primary_image_url, user_id
      `) 
      .eq("id", artworkId)
      .single();

    if (artErr || !artwork) {
      throw new Error(artErr?.message ?? `Artwork with ID ${artworkId} not found or failed to fetch details.`);
    }

    // --- Prepare update payload ---
    const updatePayload: any = {};
    updatePayload.updated_at = new Date().toISOString();


    // --- Metadata Processing (All from frontend or text analysis) ---
    // Dominant Colors: Expected from frontend (via colorthief).
    if (incomingDominantColors && JSON.stringify(incomingDominantColors) !== JSON.stringify(artwork.dominant_colors)) {
        updatePayload.dominant_colors = incomingDominantColors;
    } else if (!artwork.dominant_colors && incomingDominantColors) { // If it was null in DB and frontend provided
        updatePayload.dominant_colors = incomingDominantColors;
    }

    // Genre: Expected from frontend input.
    if (incomingGenre !== undefined && incomingGenre !== artwork.genre) {
        updatePayload.genre = incomingGenre;
    }

    // Subject: Expected from frontend input.
    if (incomingSubject !== undefined && incomingSubject !== artwork.subject) {
        updatePayload.subject = incomingSubject;
    }

    // Keywords: Merge existing (from DB), text-derived (from backend), and image-derived (from frontend)
    const textKeywords = extractKeywords(artwork.title, artwork.description, artwork.medium);
    const finalKeywords = Array.from(new Set([
      ...(artwork.keywords || []),
      ...textKeywords,
      ...(incomingImageKeywords || [])
    ]));
    if (JSON.stringify(finalKeywords) !== JSON.stringify(artwork.keywords)) {
        updatePayload.keywords = finalKeywords;
    }

    // Orientation: Expected from frontend.
    if (incomingOrientation !== undefined && incomingOrientation !== artwork.orientation) {
        updatePayload.orientation = incomingOrientation;
    }

    // --- Log Warnings for Disabled Server-Side Features ---
    console.warn(`
      --- WARNING: Server-Side Image Processing Limitations ---
      Automatic image-based genre/subject classification is DISABLED (no free external AI found for Deno Edge).
      Server-side dominant color extraction (pixel-based) is DISABLED (client-side 'colorthief' is expected).
      Server-side watermarking and visualization operations are DISABLED (imagescript fails on Deno Edge).

      All these values (Genre, Subject, Orientation, Dominant Colors) are now expected to be provided by the frontend
      (either manual input or client-side generation/extraction). The backend function will store what the frontend provides.
      Watermarked and visualization image URLs are expected to be generated CLIENT-SIDE and updated directly
      on the 'artwork_images' table records via frontend Supabase calls, not via this function.
      ---
    `);


    // --- Perform Database Update ---
    if (Object.keys(updatePayload).length > 1) { // >1 because updated_at is always there
        console.log(`[process-artwork-images] Updating artwork ${artworkId} with payload:`, updatePayload);
        const { error: artUpdateErr } = await supabase.from("artworks").update(updatePayload).eq("id", artworkId);
        if (artUpdateErr) throw new Error(`Failed to update artwork metadata: ${artUpdateErr.message}`);
    } else {
        console.log(`[process-artwork-images] No significant metadata changes to update for artworkId: ${artworkId}.`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        artworkId,
        message: "Artwork metadata processed and updated (all image-derived features are frontend-provided).",
        updatedMetadata: updatePayload,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );

  } catch (err) {
    console.error("Error in process-artwork-images function:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});