// supabase/functions/artwork-dna-extractor/index.ts

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { Tfidf } from 'npm:tiny-tfidf';
import { getAverageColor } from 'npm:fast-average-color-node';

interface Artwork {
  id: string;
  title: string | null;
  description: string | null;
  medium: string | null;
  image_url: string | null;
}

// Function to fetch the image as a buffer
async function fetchImageBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

Deno.serve(async (req) => {
  const { record: artwork }: { record: Artwork } = await req.json();

  if (!artwork) {
    return new Response(JSON.stringify({ error: 'No artwork record provided' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
  
  // Initialize Supabase client within the function
  const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // --- 1. NLP Feature Extraction ---
    const corpus = [artwork.title, artwork.description].filter(Boolean).join(' ');
    const tfidf = new Tfidf();
    tfidf.addDocument(corpus);
    // Get the top 10 keywords
    const keywords = tfidf.getTerms(0).slice(0, 10).map((term: { term: string }) => term.term);
    const tags = [...new Set([...keywords, ...(artwork.medium ? artwork.medium.toLowerCase().split(/\s+/) : [])])];

    // --- 2. Color Palette Extraction ---
    let colorPalette = null;
    if (artwork.image_url) {
      try {
        const imageBuffer = await fetchImageBuffer(artwork.image_url);
        const avgColor = await getAverageColor(Buffer.from(imageBuffer));
        colorPalette = {
          dominant: avgColor.hex,
          isDark: avgColor.isDark,
          isLight: avgColor.isLight,
        };
      } catch (colorError) {
        console.error(`Could not process color for artwork ${artwork.id}:`, colorError.message);
      }
    }

    // --- 3. Upsert Features into the Database ---
    const { error } = await supabase
      .from('artwork_features')
      .upsert({
        artwork_id: artwork.id,
        tags: tags,
        color_palette: colorPalette,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: `Features extracted for artwork ${artwork.id}` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in artwork-dna-extractor:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});