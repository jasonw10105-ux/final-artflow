import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Image } from 'imagescript';

// The background image for visualization.
// IMPORTANT: Upload your room scene image to a public bucket in Supabase Storage
// and paste its public URL here.
const ROOM_SCENE_URL = 'https://mfddxrpiuawggmnzqagn.supabase.co/storage/v1/object/public/Visualization/IMG-20250823-WA0008.jpg';
const BENCH_REAL_WIDTH_M = 2.0;
const BENCH_PIXEL_WIDTH = 800; // Manually determined pixel width of the bench in your scene image

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { artworkId, forceWatermarkUpdate, forceVisualizationUpdate } = await req.json();
    if (!artworkId) throw new Error("Artwork ID is required.");

    // 1. Fetch artwork and artist data
    const { data: artwork, error: artworkError } = await supabaseClient
      .from('artworks')
      .select(`*, user_id(display_name)`)
      .eq('id', artworkId)
      .single();

    if (artworkError || !artwork) throw new Error(artworkError?.message || "Artwork not found.");

    const artistName = (artwork.user_id as any)?.display_name || 'Untitled Artist';
    const originalImageUrl = artwork.image_url;
    if (!originalImageUrl) throw new Error("Artwork is missing an image URL.");

    const originalImageResponse = await fetch(originalImageUrl);
    const originalImageBuffer = await originalImageResponse.arrayBuffer();

    let watermarkedImageUrl = artwork.watermarked_image_url;
    let visualizationImageUrl = artwork.visualization_image_url;

    // --- TASK A: WATERMARKING ---
    if (forceWatermarkUpdate || !artwork.watermarked_image_url) {
        const image = await Image.decode(originalImageBuffer);
        const font = await Image.loadFont('https://deno.land/x/imagescript@1.2.17/formats/fonts/opensans/OpenSans-Regular.ttf');
        
        const watermarkText = `© ${artistName}`;
        const watermark = Image.renderText(font, 32, watermarkText, 0xFFFFFFFF);
        
        image.composite(watermark, image.width - watermark.width - 20, image.height - watermark.height - 20);
        
        const watermarkedImageBytes = await image.encode();
        const watermarkPath = `watermarked/${artwork.id}-${Date.now()}.png`;

        const { error: uploadError } = await supabaseClient.storage
            .from('artworks') // Assuming your image bucket is named 'artworks'
            .upload(watermarkPath, watermarkedImageBytes, { contentType: 'image/png', upsert: true });

        if (uploadError) throw new Error(`Watermark upload failed: ${uploadError.message}`);

        const { data: { publicUrl } } = supabaseClient.storage.from('artworks').getPublicUrl(watermarkPath);
        watermarkedImageUrl = publicUrl;
    }


    // --- TASK B: VISUALIZATION ---
    if (forceVisualizationUpdate || !artwork.visualization_image_url) {
        if (!artwork.dimensions?.width || !artwork.dimensions?.height || !artwork.dimensions?.unit) {
            console.log(`Skipping visualization for ${artworkId}: dimensions are incomplete.`);
        } else {
            const roomSceneResponse = await fetch(ROOM_SCENE_URL);
            const roomSceneBuffer = await roomSceneResponse.arrayBuffer();
            const roomImage = await Image.decode(roomSceneBuffer);

            let artworkRealWidthM = parseFloat(artwork.dimensions.width);
            if (artwork.dimensions.unit === 'in') artworkRealWidthM *= 0.0254;
            if (artwork.dimensions.unit === 'cm') artworkRealWidthM *= 0.01;

            const pixelsPerMeter = BENCH_PIXEL_WIDTH / BENCH_REAL_WIDTH_M;
            const artworkPixelWidth = Math.round(artworkRealWidthM * pixelsPerMeter);
            
            const artworkImage = await Image.decode(originalImageBuffer);
            artworkImage.resize(artworkPixelWidth, Image.RESIZE_AUTO);

            // Position the artwork above the center of the bench
            const centerX = roomImage.width / 2;
            const positionX = Math.round(centerX - (artworkImage.width / 2));
            const positionY = 150; // Adjust this Y-coordinate as needed

            roomImage.composite(artworkImage, positionX, positionY);

            const visualizationImageBytes = await roomImage.encode();
            const visualizationPath = `visualizations/${artwork.id}-${Date.now()}.jpg`;
            
            const { error: uploadError } = await supabaseClient.storage
                .from('artworks')
                .upload(visualizationPath, visualizationImageBytes, { contentType: 'image/jpeg', upsert: true });
                
            if (uploadError) throw new Error(`Visualization upload failed: ${uploadError.message}`);

            const { data: { publicUrl } } = supabaseClient.storage.from('artworks').getPublicUrl(visualizationPath);
            visualizationImageUrl = publicUrl;
        }
    }

    // 4. Update the artwork record with the new URLs
    const { error: updateError } = await supabaseClient
      .from('artworks')
      .update({ watermarked_image_url: watermarkedImageUrl, visualization_image_url: visualizationImageUrl })
      .eq('id', artworkId);

    if (updateError) throw new Error(`Failed to update artwork record: ${updateError.message}`);

    return new Response(JSON.stringify({ success: true, watermarkedImageUrl, visualizationImageUrl }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});