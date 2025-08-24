// supabase/functions/generate-images/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts';

// --- IMPORTANT CONFIGURATION ---
// Upload your room scene image to a public bucket in Supabase Storage
// and paste its public URL here.
const ROOM_SCENE_URL = 'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/your-public-bucket/your-room-scene.jpg';
const BENCH_REAL_WIDTH_M = 2.0; // Real-world width (in meters) of the reference object (e.g., a bench).
const BENCH_PIXEL_WIDTH = 800; // The width (in pixels) of that same reference object in your scene image.

// Helper function to fetch the font data
async function getFont(): Promise<Uint8Array> {
  const fontUrl = 'https://github.com/google/fonts/raw/main/ofl/opensans/OpenSans-Regular.ttf';
  const response = await fetch(fontUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${response.statusText}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}


serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { artworkId, forceWatermarkUpdate = false, forceVisualizationUpdate = false } = await req.json();
    if (!artworkId) throw new Error("Artwork ID is required.");

    // 1. Fetch artwork and artist data
    const { data: artwork, error: artworkError } = await supabaseClient
      .from('artworks')
      .select(`*, user_id:profiles!user_id(full_name)`) // Correctly join on profiles
      .eq('id', artworkId)
      .single();

    if (artworkError || !artwork) throw new Error(artworkError?.message || "Artwork not found.");

    const artistName = (artwork.user_id as any)?.full_name || 'Untitled Artist';
    const originalImageUrl = artwork.image_url;
    if (!originalImageUrl) throw new Error("Artwork is missing an image URL.");

    const originalImageResponse = await fetch(originalImageUrl);
    const originalImageBuffer = await originalImageResponse.arrayBuffer();

    let watermarkedImageUrl = artwork.watermarked_image_url;
    let visualizationImageUrl = artwork.visualization_image_url;

    const fontData = await getFont(); // Fetch font once

    // --- TASK A: WATERMARKING ---
    if (forceWatermarkUpdate || !artwork.watermarked_image_url) {
      console.log(`Generating watermark for artwork: ${artworkId}`);
      const image = await Image.decode(originalImageBuffer);
      const font = Image.font(fontData);
      
      const watermarkText = `© ${artistName}`;
      const watermark = Image.renderText(font, 32, watermarkText, 0xFFFFFFFF);
      
      image.composite(watermark, image.width - watermark.width - 20, image.height - watermark.height - 20);
      
      const watermarkedImageBytes = await image.encode();
      const watermarkPath = `watermarked/${artwork.id}-${Date.now()}.png`;

      const { error: uploadError } = await supabaseClient.storage
          .from('artworks')
          .upload(watermarkPath, watermarkedImageBytes, { contentType: 'image/png', upsert: true });

      if (uploadError) throw new Error(`Watermark upload failed: ${uploadError.message}`);
      watermarkedImageUrl = supabaseClient.storage.from('artworks').getPublicUrl(watermarkPath).data.publicUrl;
    }

    // --- TASK B: VISUALIZATION ---
    if (forceVisualizationUpdate || !artwork.visualization_image_url) {
      if (!artwork.dimensions?.width || !artwork.dimensions?.height || !artwork.dimensions?.unit) {
        console.log(`Skipping visualization for ${artworkId}: dimensions are incomplete.`);
      } else {
        console.log(`Generating visualization for artwork: ${artworkId}`);
        const roomSceneResponse = await fetch(ROOM_SCENE_URL);
        const roomSceneBuffer = await roomSceneResponse.arrayBuffer();
        const roomImage = await Image.decode(roomSceneBuffer);

        let artworkRealWidthM = parseFloat(artwork.dimensions.width);
        if (artwork.dimensions.unit.toLowerCase() === 'in') artworkRealWidthM *= 0.0254;
        if (artwork.dimensions.unit.toLowerCase() === 'cm') artworkRealWidthM *= 0.01;

        const pixelsPerMeter = BENCH_PIXEL_WIDTH / BENCH_REAL_WIDTH_M;
        const artworkPixelWidth = Math.round(artworkRealWidthM * pixelsPerMeter);
        
        const artworkImage = await Image.decode(originalImageBuffer);
        artworkImage.resize(artworkPixelWidth, Image.RESIZE_AUTO);

        const centerX = roomImage.width / 2;
        const positionX = Math.round(centerX - (artworkImage.width / 2));
        const positionY = 150; // Adjust this Y-coordinate to position artwork vertically

        roomImage.composite(artworkImage, positionX, positionY);

        const visualizationImageBytes = await roomImage.encode(0.8); // Encode JPEG with 80% quality
        const visualizationPath = `visualizations/${artwork.id}-${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabaseClient.storage
            .from('artworks')
            .upload(visualizationPath, visualizationImageBytes, { contentType: 'image/jpeg', upsert: true });
            
        if (uploadError) throw new Error(`Visualization upload failed: ${uploadError.message}`);
        visualizationImageUrl = supabaseClient.storage.from('artworks').getPublicUrl(visualizationPath).data.publicUrl;
      }
    }

    // --- Final Step: Update the artwork record ---
    if (watermarkedImageUrl !== artwork.watermarked_image_url || visualizationImageUrl !== artwork.visualization_image_url) {
        const { error: updateError } = await supabaseClient
          .from('artworks')
          .update({ watermarked_image_url: watermarkedImageUrl, visualization_image_url: visualizationImageUrl })
          .eq('id', artworkId);

        if (updateError) throw new Error(`Failed to update artwork record: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ success: true, watermarkedImageUrl, visualizationImageUrl }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});