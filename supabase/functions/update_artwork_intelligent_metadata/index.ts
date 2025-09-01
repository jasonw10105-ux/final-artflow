// functions/update_artwork_intelligent_metadata/index.ts
import { serve } from "std/server"; // supabase edge
import fetch from "node-fetch"; // only if needed
import { createClient } from "@supabase/supabase-js";

// Optional: include color extraction library suitable for edge runtime or implement a simple remote call.
// Here we will fetch image and use a small color quantization routine (simple kmeans is heavy).
// For robustness, you can call a small image-processing microservice or use colorthief server-side.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AI_VISION_ENDPOINT = Deno.env.get("AI_VISION_ENDPOINT") || ""; // optional
const AI_VISION_KEY = Deno.env.get("AI_VISION_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const colorToGroup = (r:number,g:number,b:number) => {
  // Simple mapping heuristics
  if (r > 200 && g < 150 && b < 150) return "red";
  if (g > 200 && r < 150 && b < 150) return "green";
  if (b > 200 && r < 150 && g < 150) return "blue";
  if (r > 200 && g > 200 && b < 150) return "yellow";
  if (r > 150 && g < 100 && b > 150) return "purple";
  return "neutral";
};

serve(async (req) => {
  try {
    const body = await req.json();
    const { artworkId } = body;
    if (!artworkId) return new Response(JSON.stringify({ error: "artworkId required" }), { status: 400 });

    // 1. get primary image for artwork
    const { data: imgs, error: imgErr } = await supabase
      .from("artwork_images")
      .select("*")
      .eq("artwork_id", artworkId)
      .eq("is_primary", true)
      .limit(1);

    if (imgErr) throw imgErr;
    const primary = (imgs && imgs[0]) || null;
    if (!primary) return new Response(JSON.stringify({ error: "No primary image found" }), { status: 400 });

    const imageUrl = primary.image_url;

    // 2. (Optional) fetch image bytes and run color extraction (placeholder: fallback to AI if cannot process)
    let dominantColors: string[] = [];
    let colorGroups: string[] = [];
    let orientation = "square";

    try {
      // We'll try a simple approach: fetch image and do a tiny canvas-like analysis if runtime supports it.
      // If the environment doesn't allow, call AI vision endpoint for colors & tags.
      // For portability we call AI_VISION_ENDPOINT (recommended: your own vision microservice that returns tags/colors/genre/orientation).
      if (AI_VISION_ENDPOINT) {
        const aiRes = await fetch(AI_VISION_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(AI_VISION_KEY ? { Authorization: `Bearer ${AI_VISION_KEY}` } : {})
          },
          body: JSON.stringify({ imageUrl })
        });
        const aiJson = await aiRes.json();
        dominantColors = aiJson.dominant_colors ?? aiJson.palette ?? [];
        colorGroups = (dominantColors.length ? dominantColors.map((hex:string) => {
          // simple conversion hex->rgb->group
          const hexSan = hex.replace("#", "");
          const r = parseInt(hexSan.slice(0,2),16);
          const g = parseInt(hexSan.slice(2,4),16);
          const b = parseInt(hexSan.slice(4,6),16);
          return colorToGroup(r,g,b);
        }) : []);
        orientation = aiJson.orientation ?? aiJson.orientation_guess ?? "square";
      }
    } catch (err) {
      console.warn("AI vision call failed:", err);
    }

    // 3. call AI again or use aiJson to extract tags/genre etc
    let tags: string[] = [];
    let genre = "";
    try {
      if (AI_VISION_ENDPOINT) {
        const ai2 = await fetch(AI_VISION_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(AI_VISION_KEY ? { Authorization: `Bearer ${AI_VISION_KEY}` } : {})
          },
          body: JSON.stringify({ imageUrl, mode: "metadata" })
        });
        const j = await ai2.json();
        tags = j.tags ?? tags;
        genre = j.genre ?? genre;
      }
    } catch (err) {
      console.warn("AI metadata failed:", err);
    }

    // If still empty, fallback to safe defaults
    if (!dominantColors.length) dominantColors = ["#999999"];
    if (!colorGroups.length) {
      colorGroups = dominantColors.map(hex => {
        const h = hex.replace("#","");
        const r = parseInt(h.slice(0,2),16);
        const g = parseInt(h.slice(2,4),16);
        const b = parseInt(h.slice(4,6),16);
        return colorToGroup(r,g,b);
      });
    }

    // 4. update artwork row
    const updatePayload: any = {
      dominant_colors: dominantColors,
      color_groups: Array.from(new Set(colorGroups)),
      keywords: tags,
      genre,
      orientation
    };

    const { error: updErr } = await supabase.from("artworks").update(updatePayload).eq("id", artworkId);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ success: true, updatePayload }), { status: 200 });
  } catch (err:any) {
    console.error("update_artwork_intelligent_metadata error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
});