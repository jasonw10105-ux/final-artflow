import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1'

// Create a singleton pipeline instance
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

serve(async (req) => {
  const { text } = await req.json()

  // Generate the embedding
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  const embedding = Array.from(output.data);

  return new Response(
    JSON.stringify({ embedding }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})