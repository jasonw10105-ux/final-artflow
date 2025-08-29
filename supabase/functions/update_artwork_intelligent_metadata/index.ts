// Supabase Edge Function
// Run: supabase functions deploy update_artwork_intelligent_metadata
// Call: supabase.functions.invoke("update_artwork_intelligent_metadata", { body: { artwork_id } })

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import ColorThief from "npm:colorthief";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Map RGB values to a rough color group
function rgbToGroup([r, g, b]: number[]): string {
  const hsl = rgbToHsl(r, g, b);
  const [h, s, l] = hsl;

  if (l < 0.1) return "black";
  if (l > 0.9) return "white";
  if (s < 0.15) return "gray";

  if (h < 15 || h >= 345) return "red";
  if (h < 45) return "orange";
  if (h < 65) return "yellow";
  if (h < 170) return "green";
  if (h < 260) return "blue";
  if (h < 320) return "purple";
  return "brown";
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s, l];
}

// Guess orientation based on image dimensions
function getOrientation(width: number, height: number): "landscape" | "portrait" | "square" {
  if (width > height) return "landscape";
  if (height > width) return "portrait";
  return "square";
}

// Basic genre guess (placeholder - you could extend with ML API later)
function guessGenre(colors: string[], orientation: string): string {
  if (colors.includes("green") && orientation === "landscape") return "Landscape";
  if (colors.includes("blue") && orientation === "portrait") return "Portrait";
  if (colors.includes("gray")) return "Abstract";
  return "Figurative";
}

// Extract keywords from metadata
function buildKeywords(colors: string[], orientation: string, genre: string): string[] {
  return [...new Set([...colors, orientation, genre])];
}

serve(async (req) => {
  try {
    const { artwork_id } = await req.json();
    if (!artwork_id) throw new Error("artwork_id required");

    // Get primary image
    const { data: images, error: imgError } = await supabase
      .from("artwork_images")
      .select("*")
      .eq("artwork_id", artwork_id)
      .order("position", { ascending: true })
      .limit(1);

    if (imgError) throw imgError;
    if (!images || images.length === 0) throw new Error("No images found");

    const primary = images[0];
    const imageUrl = primary.image_url;

    // Fetch image for analysis
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error("Failed to fetch image");
    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Extract dominant colors (returns [r,g,b] arrays)
    const palette = await ColorThief.getPalette(buffer, 6);
    const groups = palette.map(rgbToGroup);
    const uniqueGroups = [...new Set(groups)];

    // Fake image size detection (replace with Sharp or ML in prod)
    const width = 1200, height = 900; // placeholder dimensions
    const orientation = getOrientation(width, height);
    const genre = guessGenre(uniqueGroups, orientation);
    const keywords = buildKeywords(uniqueGroups, orientation, genre);

    // Save metadata
    const { error: updateError } = await supabase
      .from("artworks")
      .update({
        genre,
        orientation,
        dominant_colors: uniqueGroups,
        keywords,
      })
      .eq("id", artwork_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, artwork_id, genre, orientation, dominant_colors: uniqueGroups, keywords }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("Metadata update failed", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
