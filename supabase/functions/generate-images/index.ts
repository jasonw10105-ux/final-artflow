import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts';

// --- CONFIGURATION ---
const ROOM_SCENE_URL = 'https://mfddxrpiuawggmnzqagn.supabase.co/storage/v1/object/public/Visualization/IMG-20250823-WA0008.jpg'; 
const BENCH_REAL_WIDTH_M = 2.0;
const BENCH_PIXEL_WIDTH = 800;

serve(async (req) => {
  try {
    // This is the only correct way to initialize the client.
    // It securely reads the environment variables you set in the Supabase dashboard.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 
    );

    const { artworkId, forceWatermarkUpdate = false, forceVisualizationUpdate = false } = await req.json();
    console.log(`[${artworkId}] Function invoked.`);
    if (!artworkId) throw new Error("Artwork ID is required.");

    // 1. Fetch data
    console.log(`[${artworkId}] Fetching artwork and artist data...`);
    const { data: artwork, error: artworkError } = await supabaseClient
      .from('artworks')
      .select(`*, artist:profiles!user_id(full_name)`)
      .eq('id', artworkId)
      .single();

    if (artworkError) throw new Error(`Artwork fetch error: ${artworkError.message}`);
    if (!artwork) throw new Error(`Artwork with ID ${artworkId} not found.`);
    
    const artistName = (artwork.artist as any)?.full_name || 'Untitled Artist';
    const originalImageUrl = artwork.image_url;
    if (!originalImageUrl) throw new Error("Artwork is missing an image_url.");

    console.log(`[${artworkId}] Fetching original image...`);
    const originalImageResponse = await fetch(originalImageUrl);
    if (!originalImageResponse.ok) throw new Error(`Failed to fetch original image.`);
    const originalImageBuffer = await originalImageResponse.arrayBuffer();

    let watermarkedImageUrl = artwork.watermarked_image_url;
    let visualizationImageUrl = artwork.visualization_image_url;
    let needsDbUpdate = false;

    // --- Generate watermarked image object in memory first ---
    const image = await Image.decode(originalImageBuffer);
    const font = await Image.loadFont('https://deno.land/x/imagescript@1.2.17/formats/fonts/opensans/OpenSans-Regular.ttf');
    const watermarkText = `© ${artistName}`;
    const textImage = Image.renderText(font, 32, watermarkText, 0xFFFFFFFF);
    const watermarkedImageObject = image.clone().composite(textImage, image.width - textImage.width - 20, image.height - textImage.height - 20);
    console.log(`[${artworkId}] Watermarked image generated in memory.`);

    // --- TASK A: UPLOAD WATERMARKED IMAGE ---
    if (forceWatermarkUpdate || !artwork.watermarked_image_url) {
      console.log(`[${artworkId}] Uploading watermarked image to storage...`);
      const watermarkedImageBytes = await watermarkedImageObject.encode();
      const watermarkPath = `watermarked/${artwork.id}-${Date.now()}.png`;
      const { error: uploadError } = await supabaseClient.storage.from('artworks').upload(watermarkPath, watermarkedImageBytes, { contentType: 'image/png', upsert: true });
      if (uploadError) throw new Error(`Watermark upload failed: ${uploadError.message}`);

      watermarkedImageUrl = supabaseClient.storage.from('artworks').getPublicUrl(watermarkPath).data.publicUrl;
      needsDbUpdate = true;
      console.log(`[${artworkId}] Watermark uploaded successfully.`);
    }

    // --- TASK B: UPLOAD VISUALIZATION (USING THE WATERMARKED IMAGE) ---
    if (forceVisualizationUpdate || !artwork.visualization_image_url) {
      if (!artwork.dimensions?.width || !artwork.dimensions?.height || !artwork.dimensions?.unit) {
        console.log(`[${artworkId}] Skipping visualization: dimensions incomplete.`);
      } else {
        console.log(`[${artworkId}] Generating visualization using watermarked image...`);
        const roomSceneResponse = await fetch(ROOM_SCENE_URL);
        const roomSceneBuffer = await roomSceneResponse.arrayBuffer();
        const roomImage = await Image.decode(roomSceneBuffer);

        let artworkRealWidthM = parseFloat(artwork.dimensions.width);
        if (artwork.dimensions.unit.toLowerCase() === 'in') artworkRealWidthM *= 0.0254;
        if (artwork.dimensions.unit.toLowerCase() === 'cm') artworkRealWidthM *= 0.01;

        const pixelsPerMeter = BENCH_PIXEL_WIDTH / BENCH_REAL_WIDTH_M;
        const artworkPixelWidth = Math.round(artworkRealWidthM * pixelsPerMeter);
        
        watermarkedImageObject.resize(artworkPixelWidth, Image.RESIZE_AUTO);

        const centerX = roomImage.width / 2;
        const positionX = Math.round(centerX - (watermarkedImageObject.width / 2));
        const positionY = 150;

        roomImage.composite(watermarkedImageObject, positionX, positionY);
        const visualizationImageBytes = await roomImage.encode(0.8);
        const visualizationPath = `visualizations/${artwork.id}-${Date.now()}.jpg`;
        
        console.log(`[${artworkId}] Uploading visualization to storage...`);
        const { error: uploadError } = await supabaseClient.storage.from('artworks').upload(visualizationPath, visualizationImageBytes, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw new Error(`Visualization upload failed: ${uploadError.message}`);
        
        visualizationImageUrl = supabaseClient.storage.from('artworks').getPublicUrl(visualizationPath).data.publicUrl;
        needsDbUpdate = true;
        console.log(`[${artworkId}] Visualization uploaded successfully.`);
      }
    }

    // 4. Update the database if anything changed
    if (needsDbUpdate) {
      console.log(`[${artworkId}] Updating database record...`);
      const { error: updateError } = await supabaseClient
        .from('artworks')
        .update({ watermarked_image_url: watermarkedImageUrl, visualization_image_url: visualizationImageUrl })
        .eq('id', artworkId);

      if (updateError) throw new Error(`Failed to update artwork record: ${updateError.message}`);
      console.log(`[${artworkId}] Database record updated successfully.`);
    }

    return new Response(JSON.stringify({ success: true, watermarkedImageUrl, visualizationImageUrl }), {
      headers: { 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('!!! EDGE FUNCTION ERROR:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' }, status: 500,
    });
  }
});