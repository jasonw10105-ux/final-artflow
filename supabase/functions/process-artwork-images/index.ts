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

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { Tfidf } from "npm:tiny-tfidf";

// --- Config with sane fallbacks (you should still set ENV values) ---
const ROOM_SCENE_URL = Deno.env.get("ROOM_SCENE_URL") ??
  "https://your-project-ref.supabase.co/storage/v1/object/public/visualization/room.jpg";
const BENCH_REAL_WIDTH_M = parseFloat(Deno.env.get("BENCH_REAL_WIDTH_M") ?? "2.0");
const BENCH_PIXEL_WIDTH = parseInt(Deno.env.get("BENCH_PIXEL_WIDTH") ?? "800", 10);

// Helpers --------------------------------------------------------------

function asHex(r: number, g: number, b: number) {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

async function averageHexFromImageBuffer(buf: ArrayBuffer): Promise<string> {
  const img = await Image.decode(buf);
  // Downscale to reduce cost, then average
  const targetW = 64;
  const scale = targetW / img.width;
  const targetH = Math.max(1, Math.round(img.height * scale));
  const small = img.clone();
  small.resize(targetW, targetH);

  let r = 0, g = 0, b = 0;
  const total = small.width * small.height;
  for (let y = 0; y < small.height; y++) {
    for (let x = 0; x < small.width; x++) {
      const rgba = small.getPixelAt(x, y);
      // rgba is number 0xRRGGBBAA
      const R = (rgba >> 24) & 0xff;
      const G = (rgba >> 16) & 0xff;
      const B = (rgba >> 8) & 0xff;
      r += R; g += G; b += B;
    }
  }
  return asHex(Math.round(r / total), Math.round(g / total), Math.round(b / total));
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
  const font = await Image.loadFont(
    "https://deno.land/x/imagescript@1.2.17/formats/fonts/opensans/OpenSans-Regular.ttf",
  );
  const wm = Image.renderText(font, Math.max(24, Math.round(img.width * 0.02)), text, 0xffffffff);
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
  scaled.resize(desiredWidthPx, Image.RESIZE_AUTO);

  // Position above center “bench”
  const x = Math.round(room.width / 2 - scaled.width / 2);
  const y = Math.round(room.height * 0.22); // tweak as needed
  room.composite(scaled, x, y);
  return await room.encodeJPEG(88);
}

// Keywords extraction
function extractKeywords(title: string | null, description: string | null, medium: string | null): string[] {
  const corpus = [title, description, medium].filter(Boolean).join(" ").toLowerCase();
  const tfidf = new Tfidf();
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
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    const { artworkId, force = false, forceWatermark = false, forceVisualization = false } = await req.json();

    if (!artworkId) {
      return new Response(JSON.stringify({ error: "artworkId is required" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1) Fetch artwork + artist name
    const { data: artwork, error: artErr } = await supabase
      .from("artworks")
      .select(`
        id, title, description, medium, dimensions, keywords, dominant_colors,
        user_id,
        profiles:profiles!artworks_user_id_fkey ( full_name )
      `)
      .eq("id", artworkId)
      .single();

    if (artErr || !artwork) {
      throw new Error(artErr?.message ?? "Artwork not found");
    }

    const artistName = (artwork as any).profiles?.full_name || "Artist";

    // 2) Fetch images for the artwork
    const { data: images, error: imgErr } = await supabase
      .from("artwork_images")
      .select("id, image_url, watermarked_image_url, visualization_image_url, position")
      .eq("artwork_id", artworkId)
      .order("position", { ascending: true });

    if (imgErr) throw new Error(`Failed to load images: ${imgErr.message}`);

    // 3) Preload room scene once
    const roomSceneBuf = await fetchBuffer(ROOM_SCENE_URL);

    // Figure out visualization scale from width in cm (required to place on wall)
    const dims = artwork.dimensions ?? {};
    const widthCm = parseMaybeNumber(dims.width);
    const unit = (dims.unit ?? "cm").toLowerCase();
    const usableWidthMeters = unit === "cm"
      ? (widthCm !== null ? cmToMeters(widthCm) : null)
      : unit === "m"
      ? (widthCm !== null ? widthCm : null)
      : null; // inches are not supported per spec

    const ppm = BENCH_PIXEL_WIDTH / BENCH_REAL_WIDTH_M; // pixels per meter
    const desiredArtPx = usableWidthMeters ? Math.max(80, Math.round(usableWidthMeters * ppm)) : null;

    // 4) Process each image
    let firstImageAverageHex: string | null = null;

    for (const img of (images ?? [])) {
      // Fetch original
      const originalBuf = await fetchBuffer(img.image_url);

      // Dominant color from first encountered original
      if (!firstImageAverageHex) {
        firstImageAverageHex = await averageHexFromImageBuffer(originalBuf);
      }

      // Watermark
      if (force || forceWatermark || !img.watermarked_image_url) {
        const wmBytes = await watermarkImage(originalBuf, `© ${artistName}`);
        const wmPath = `watermarked/${artworkId}/${img.id}-${Date.now()}.jpg`;
        const wmUrl = await uploadBytes(supabase, "artworks", wmPath, wmBytes, "image/jpeg");

        const { error: upErr } = await supabase
          .from("artwork_images")
          .update({ watermarked_image_url: wmUrl, updated_at: new Date().toISOString() })
          .eq("id", img.id);
        if (upErr) throw new Error(`Failed to update watermarked URL: ${upErr.message}`);
      }

      // Visualization
      if ((force || forceVisualization || !img.visualization_image_url) && desiredArtPx) {
        // Use watermarked if present; else original
        let sourceForViz: ArrayBuffer = originalBuf;
        // re-fetch watermarked to ensure we visualize the watermark version
        const { data: refreshed } = await supabase
          .from("artwork_images")
          .select("watermarked_image_url")
          .eq("id", img.id)
          .single();
        const useUrl = refreshed?.watermarked_image_url ?? img.watermarked_image_url ?? img.image_url;
        sourceForViz = await fetchBuffer(useUrl);

        const vizBytes = await composeVisualization(roomSceneBuf, sourceForViz, desiredArtPx);
        const vizPath = `visualizations/${artworkId}/${img.id}-${Date.now()}.jpg`;
        const vizUrl = await uploadBytes(supabase, "artworks", vizPath, vizBytes, "image/jpeg");

        const { error: upVizErr } = await supabase
          .from("artwork_images")
          .update({ visualization_image_url: vizUrl, updated_at: new Date().toISOString() })
          .eq("id", img.id);
        if (upVizErr) throw new Error(`Failed to update visualization URL: ${upVizErr.message}`);
      }
    }

    // 5) Update keywords + dominant colors on artwork
    const keywords = extractKeywords(artwork.title, artwork.description, artwork.medium);
    const dominant = firstImageAverageHex ? [firstImageAverageHex] : null;

    const { error: artUpdateErr } = await supabase
      .from("artworks")
      .update({
        keywords,
        dominant_colors: dominant,
        updated_at: new Date().toISOString(),
      })
      .eq("id", artworkId);

    if (artUpdateErr) throw new Error(`Failed to update artwork keywords/colors: ${artUpdateErr.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        artworkId,
        processedImages: (images ?? []).length,
        keywords,
        dominant_colors: dominant,
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("process-artwork-images ERROR:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
