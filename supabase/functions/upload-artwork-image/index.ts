// supabase/functions/upload-artwork-image/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts';

const ROOM_SCENE_URL = Deno.env.get('ROOM_SCENE_URL')!;
const BENCH_REAL_WIDTH_M = parseFloat(Deno.env.get('BENCH_REAL_WIDTH_M') ?? "2");
const BENCH_PIXEL_WIDTH = parseInt(Deno.env.get('BENCH_PIXEL_WIDTH') ?? "800", 10);

serve(async (req) => {
  try {
    if (req.method !== 'POST') throw new Error('Method not allowed');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const formData = await req.formData();
    const artworkId = formData.get('artworkId') as string;
    const file = formData.get('file') as File;

    if (!artworkId || !file) throw new Error('Missing artworkId or file');

    // --- Upload original image ---
    const arrayBuffer = await file.arrayBuffer();
    const filename = `${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from('artworks')
      .upload(`originals/${artworkId}/${filename}`, arrayBuffer, { contentType: file.type, upsert: true });
    if (uploadErr) throw uploadErr;

    const { data: publicUrlData } = supabase.storage.from('artworks').getPublicUrl(`originals/${artworkId}/${filename}`);
    const imageUrl = publicUrlData.publicUrl;

    // --- Insert into artwork_images ---
    const { data: inserted } = await supabase.from('artwork_images').insert({
      artwork_id: artworkId,
      image_url: imageUrl,
      position: 0, // temporary, will reorder later
    }).select().single();

    // --- Trigger watermark + visualization generation ---
    await fetch(`${Deno.env.get('SUPABASE_FUNCTIONS_BASE_URL')}/process-artwork-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworkId, forceWatermark: true, forceVisualization: true })
    });

    return new Response(JSON.stringify({ success: true, imageId: inserted.id, imageUrl }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
