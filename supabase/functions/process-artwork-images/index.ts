// supabase/functions/process-artwork-images/index.ts
// Production-ready Edge Function
//
// Responsibilities:
// 1) For every image in public.artwork_images for a given artwork:
//    - Generate a watermarked image (© Artist Name) and upload it
//    - Generate a room visualization (scaled by artwork width in cm) and upload it
//    - Update artwork_images.watermarked_image_url / visualization_image_url
// 2) Extract keywords from title/description/medium + simple TF-IDF and store in artworks.keywords
// 3) Compute dominant color (simple average) from the first available original image and store in artworks.dominant_colors
//
// Invocation: POST /functions/v1/process-artwork-images
// Body: { artworkId: string, force?: boolean, forceWatermark?: boolean, forceVisualization?: boolean }
// Auth: Service role key is used inside; endpoint can be invoked from client after save.
// Optional: you can also wire a DB trigger/webhook to call this automatically on insert/update.
//
// ENV VARS (set in Supabase > Project Settings > Functions):
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - ROOM_SCENE_URL   (public room scene image for visualization)
// - BENCH_REAL_WIDTH_M (e.g. "2.0")
// - BENCH_PIXEL_WIDTH  (e.g. "800")
// - WATERMARK_FONT_URL (Optional: Override default font URL)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import * as TinyTfidf from "https://esm.sh/tiny-tfidf";

// --- Config with sane fallbacks (you should still set ENV values) ---
// These are read from environment variables linked to this specific function
const ROOM_SCENE_URL = Deno.env.get("ROOM_SCENE_URL") ??
  "https://mfddxrpiuawggmnzqagn.supabase.co/storage/v1/object/public/Visualization/WhatsApp%20Image%202025-08-23%20at%2018.32.02.jpeg";
const BENCH_REAL_WIDTH_M = parseFloat(Deno.env.get("BENCH_REAL_WIDTH_M") ?? "2.0");
const BENCH_PIXEL_WIDTH = parseInt(Deno.env.get("BENCH_PIXEL_WIDTH") ?? "800", 10);

// Default to your hosted font, but allow override via environment variable
const WATERMARK_FONT_URL_CONFIG = Deno.env.get("WATERMARK_FONT_URL") ??
  "https://mfddxrpiuawggmnzqagn.supabase.co/storage/v1/object/public/fonts/InstrumentSans-Medium.ttf";

// Helpers --------------------------------------------------------------

function asHex(r: number, g: number, b: number) {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

async function averageHexFromImageBuffer(buf: ArrayBuffer): Promise<string> {
  let img: Image;
  try {
    img = await Image.decode(buf);
  } catch (decodeError) {
    console.error("Failed to decode image buffer:", decodeError);
    return "#000000"; // Return a default color if image can't be decoded
  }

  if (img.width < 1 || img.height < 1) {
    console.warn("Decoded image has invalid dimensions (width or height < 1); returning default color.");
    return "#000000";
  }

  const targetW = Math.min(img.width, 64);
  const scale = targetW / img.width;
  const targetH = Math.max(1, Math.round(img.height * scale));

  const small = img.clone();
  small.resize(targetW, targetH);

  if (small.width < 1 || small.height < 1) {
    console.warn("Resized image has invalid dimensions (width or height < 1); returning default color.");
    return "#000000";
  }

  let r = 0, g = 0, b = 0;
  const totalPixels = small.width * small.height;

  if (totalPixels > 0 && small.pixels) { // Ensure pixels array exists and has content
    for (let i = 0; i < small.pixels.length; i += 4) { // Iterate RGBA chunks
      r += small.pixels[i];     // Red
      g += small.pixels[i + 1]; // Green
      b += small.pixels[i + 2]; // Blue
      // Alpha small.pixels[i + 3] is ignored for average color
    }
  } else {
    console.warn("No pixels to process after resizing; returning default color.");
    return "#000000";
  }

  if (totalPixels === 0) {
      console.warn("Total pixels for average calculation is zero (should not happen here); returning default color.");
      return "#000000";
  }

  return asHex(Math.round(r / totalPixels), Math.round(g / totalPixels), Math.round(b / totalPixels));
}

function cmToMeters(cm: number) {
  return cm / 100;
}

function parseMaybeNumber(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const trimmed = v.trim().toLowerCase();
    if (!trimmed || trimmed === "variable" || trimmed === "var") return null;
    const n = Number(trimmed);
    if (!Number.isNaN(n) && isFinite(n)) return n;
  }
  return null;
}

async function fetchBuffer(url: string): Promise<ArrayBuffer> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url} (${resp.status})`);
  return await resp.arrayBuffer();
}

async function uploadBytes(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
  bytes: Uint8Array | ArrayBuffer,
  contentType: string,
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Upload failed (${path}): ${error.message}`);
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return pub.publicUrl;
}

async function watermarkImage(
  original: ArrayBuffer,
  text: string,
): Promise<Uint8Array> {
  const img = await Image.decode(original);
  
  let fontBuffer: ArrayBuffer;
  if (!WATERMARK_FONT_URL_CONFIG) { // Use the configured font URL
    console.error("WATERMARK_FONT_URL_CONFIG is not set. Watermarking will be skipped or may fail.");
    throw new Error("WATERMARK_FONT_URL_CONFIG (derived from env or default) is required for watermarking.");
  }

  try {
    fontBuffer = await fetchBuffer(WATERMARK_FONT_URL_CONFIG); // Fetch from your Storage
  } catch (fontError) {
    console.error(`Failed to load font from ${WATERMARK_FONT_URL_CONFIG}:`, fontError);
    throw new Error(`Critical: Failed to load font for watermarking. Details: ${fontError}`);
  }

  // Pass the raw fontBuffer directly to Image.renderText as per imagescript@1.2.17 API
  const wm = Image.renderText(fontBuffer, Math.max(24, Math.round(img.width * 0.02)), text, 0xffffffff);
  const out = img.clone();
  out.composite(wm, img.width - wm.width - 20, img.height - wm.height - 20);
  return await out.encodeJPEG(88);
}

async function composeVisualization(
  roomSceneBuf: ArrayBuffer,
  artworkBuf: ArrayBuffer,
  desiredWidthPx: number,
): Promise<Uint8Array> {
  const room = await Image.decode(roomSceneBuf);
  const art = await Image.decode(artworkBuf);
  const scaled = art.clone();
  // Ensure desiredArtPx is not null/undefined before passing to resize
  scaled.resize(desiredWidthPx || art.width, Image.RESIZE_AUTO); // Fallback to original width if desiredArtPx is missing

  // Position above center “bench”
  const x = Math.round(room.width / 2 - scaled.width / 2);
  const y = Math.round(room.height * 0.22); // tweak as needed
  room.composite(scaled, x, y);
  return await room.encodeJPEG(88);
}

// Keywords extraction
function extractKeywords(title: string | null, description: string | null, medium: string | null): string[] {
  const corpus = [title, description, medium].filter(Boolean).join(" ").toLowerCase();
  const tfidf = new TinyTfidf.Tfidf();
  tfidf.addDocument(corpus);
  const terms = tfidf.getTerms(0)
    .slice(0, 12)
    .map((t: { term: string }) => t.term)
    .filter(Boolean);

  // split medium into tokens as well
  const mediumTokens = (medium ?? "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

  // dedupe
  const unique = Array.from(new Set([...terms, ...mediumTokens]));
  return unique;
}

// Handler --------------------------------------------------------------

serve(async (req) => {
  // Always include CORS headers for Edge Functions that might be called cross-origin
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight requests
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
    const { artworkId, force = false, forceWatermark = false, forceVisualization = false } = body;

    if (!artworkId) {
      return new Response(JSON.stringify({ error: "artworkId is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[process-artwork-images] Processing artworkId: ${artworkId}`);

    // 1) Fetch artwork + artist name
    const { data: artwork, error: artErr } = await supabase
      .from("artworks")
      .select(`
        id, title, description, medium, dimensions, keywords, dominant_colors, genre, subject,
        user_id,
        profiles:profiles!artworks_user_id_fkey ( full_name )
      `)
      .eq("id", artworkId)
      .single();

    if (artErr || !artwork) {
      throw new Error(artErr?.message ?? `Artwork with ID ${artworkId} not found or failed to fetch details.`);
    }

    const artistName = (artwork as any).profiles?.full_name || "Artist";

    // 2) Fetch images for the artwork
    const { data: images, error: imgErr } = await supabase
      .from("artwork_images")
      .select("id, image_url, watermarked_image_url, visualization_image_url, position")
      .eq("artwork_id", artworkId)
      .order("position", { ascending: true });

    if (imgErr) throw new Error(`Failed to load images for artwork ${artworkId}: ${imgErr.message}`);

    // 3) Preload room scene once for visualization
    let roomSceneBuf: ArrayBuffer | null = null;
    try {
      if (ROOM_SCENE_URL) {
        roomSceneBuf = await fetchBuffer(ROOM_SCENE_URL);
      } else {
        console.warn("[process-artwork-images] ROOM_SCENE_URL is not set. Skipping visualization generation.");
      }
    } catch (err) {
      console.error("[process-artwork-images] Failed to fetch ROOM_SCENE_URL:", err);
      roomSceneBuf = null;
    }


    // Figure out visualization scale from width in cm (required to place on wall)
    const dims = artwork.dimensions ?? {};
    const widthCm = parseMaybeNumber(dims.width);
    const usableWidthMeters = (widthCm !== null) ? cmToMeters(widthCm) : null;

    const ppm = BENCH_PIXEL_WIDTH / BENCH_REAL_WIDTH_M; // pixels per meter
    const desiredArtPx = usableWidthMeters ? Math.max(80, Math.round(usableWidthMeters * ppm)) : null;

    // 4) Process each image
    let firstImageAverageHex: string | null = null;
    const currentArtworkKeywords = artwork.keywords || [];
    const currentArtworkGenre = artwork.genre;
    const currentArtworkSubject = artwork.subject;

    for (const img of (images ?? [])) {
      const originalBuf = await fetchBuffer(img.image_url);

      if (!firstImageAverageHex) {
        firstImageAverageHex = await averageHexFromImageBuffer(originalBuf);
      }

      // Watermark
      if (force || forceWatermark || !img.watermarked_image_url) {
        console.log(`[process-artwork-images] Generating watermark for image ${img.id}`);
        const wmBytes = await watermarkImage(originalBuf, `© ${artistName}`);
        const wmPath = `watermarked/${artworkId}/${img.id}-${Date.now()}.jpg`;
        const wmUrl = await uploadBytes(supabase, "artworks", wmPath, wmBytes, "image/jpeg");

        const { error: upErr } = await supabase
          .from("artwork_images")
          .update({ watermarked_image_url: wmUrl, updated_at: new Date().toISOString() })
          .eq("id", img.id);
        if (upErr) console.error(`Failed to update watermarked URL for image ${img.id}: ${upErr.message}`);
      }

      // Visualization
      if ((force || forceVisualization || !img.visualization_image_url) && desiredArtPx && roomSceneBuf) {
        console.log(`[process-artwork-images] Generating visualization for image ${img.id}`);
        let sourceForViz: ArrayBuffer = originalBuf;
        const useUrl = img.watermarked_image_url ?? img.image_url;
        try {
           sourceForViz = await fetchBuffer(useUrl);
        } catch (fetchVizErr) {
            console.warn(`Could not fetch image for visualization (${useUrl}): ${fetchVizErr}. Falling back to original.`);
            sourceForViz = originalBuf;
        }

        const vizBytes = await composeVisualization(roomSceneBuf, sourceForViz, desiredArtPx);
        const vizPath = `visualizations/${artworkId}/${img.id}-${Date.now()}.jpg`;
        const vizUrl = await uploadBytes(supabase, "artworks", vizPath, vizBytes, "image/jpeg");

        const { error: upVizErr } = await supabase
          .from("artwork_images")
          .update({ visualization_image_url: vizUrl, updated_at: new Date().toISOString() })
          .eq("id", img.id);
        if (upVizErr) console.error(`Failed to update visualization URL for image ${img.id}: ${upVizErr.message}`);
      }
    }

    // 5) Update keywords + dominant colors + genre + subject on artwork
    const imageKeywords: string[] = [];
    const imageGenre: string | null = null;
    const imageSubject: string | null = null;

    const textKeywords = extractKeywords(artwork.title, artwork.description, artwork.medium);
    const finalKeywords = Array.from(new Set([...currentArtworkKeywords, ...textKeywords, ...imageKeywords]));

    const updatePayload: any = {
      dominant_colors: firstImageAverageHex ? [firstImageAverageHex] : (artwork.dominant_colors || []),
      genre: imageGenre || currentArtworkGenre,
      subject: imageSubject || currentArtworkSubject,
      keywords: finalKeywords,
      updated_at: new Date().toISOString(),
    };

    const { error: artUpdateErr } = await supabase.from("artworks").update(updatePayload).eq("id", artworkId);
    if (artUpdateErr) throw new Error(`Failed to update artwork metadata: ${artUpdateErr.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        artworkId,
        message: "Artwork images and metadata processed successfully.",
        updatedMetadata: updatePayload,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("Error in process-artwork-images function:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});