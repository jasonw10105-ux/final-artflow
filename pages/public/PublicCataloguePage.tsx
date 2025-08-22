// src/pages/public/PublicCataloguePage.tsx

import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

// FINAL DEBUGGING VERSION: This function has extensive logging.
const fetchCatalogueBySlug = async (artistSlug: string, catalogueSlug: string) => {
    console.log(`[Artflow Debug] Starting fetch for artist: "${artistSlug}", catalogue: "${catalogueSlug}"`);

    // --- Step 1: Fetch the artist ---
    const { data: artistData, error: artistError } = await supabase
        .from('profiles')
        .select('id, full_name, slug')
        .eq('slug', artistSlug)
        .single();

    if (artistError || !artistData) {
        console.error("[Artflow Debug] FATAL: Could not find artist.", { artistSlug, artistError });
        throw new Error('Artist not found'); // Force react-query to enter 'error' state
    }
    console.log("[Artflow Debug] Step 1 SUCCESS: Found artist:", artistData);

    // --- Step 2: Fetch the catalogue using the artist's ID ---
    const { data: catalogueData, error: catalogueError } = await supabase
        .from('catalogues')
        .select(`*, artworks:catalogue_artworks(position, artwork:artworks(*))`)
        .eq('slug', catalogueSlug)
        .eq('user_id', artistData.id)
        .single();

    if (catalogueError || !catalogueData) {
        console.error("[Artflow Debug] FATAL: Could not find catalogue for this artist.", { catalogueSlug, artistId: artistData.id, catalogueError });
        throw new Error('Catalogue not found'); // Force react-query to enter 'error' state
    }
    console.log("[Artflow Debug] Step 2 SUCCESS: Found catalogue data:", catalogueData);

    // --- Step 3: Combine and return ---
    const finalData = { ...catalogueData, artist: artistData };
    finalData.artworks = (finalData.artworks && Array.isArray(finalData.artworks)) ? finalData.artworks : [];
    finalData.artworks.sort((a, b) => (a.position || 0) - (b.position || 0));
    
    console.log("[Artflow Debug] Step 3 SUCCESS: Final data is ready.", finalData);
    return finalData;
};

const PublicCataloguePage = () => {
    const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string, catalogueSlug: string }>();
    
    // Use 'status' for more robust state handling.
    const { data: catalogue, status, error } = useQuery({
        queryKey: ['catalogue', artistSlug, catalogueSlug], 
        queryFn: () => fetchCatalogueBySlug(artistSlug!, catalogueSlug!),
        enabled: !!artistSlug && !!catalogueSlug,
    });

    // State 1: Loading
    if (status === 'loading') {
        return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading catalogue...</p>;
    }
    
    // State 2: Error (This will now be triggered correctly by the `throw new Error` calls)
    if (status === 'error') {
        console.error("[Artflow Debug] React Query entered ERROR state:", error);
        return <p style={{ textAlign: 'center', padding: '5rem' }}>Catalogue not found.</p>;
    }

    // State 3: Success, but with a safety net. This should prevent any crashes.
    return (
        <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                {/* Optional chaining `?.` makes it impossible to crash here. */}
                <h1>{catalogue?.title}</h1>
                {catalogue?.artist && <h2>by {catalogue.artist.full_name}</h2>}
                <p>{catalogue?.description}</p>
            </header>
            <main style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                {/* Check that artworks is an array before trying to map it. */}
                {Array.isArray(catalogue?.artworks) && catalogue.artworks.map((item: any) => {
                    const artwork = item?.artwork; // Safely access nested artwork
                    // Safely check all required properties before rendering the link
                    if (!artwork?.id || !catalogue?.artist?.slug || !artwork?.slug) {
                        return null; // Skip rendering this item if data is incomplete
                    }
                    return (
                        <div key={artwork.id}>
                            <Link to={`/artwork/${catalogue.artist.slug}/${artwork.slug}`}>
                                <img src={artwork.image_url} alt={artwork.title || ''} style={{ width: '100%', borderRadius: 'var(--radius)' }}/>
                            </Link>
                            <h3 style={{marginTop: '1rem'}}>{artwork.title}</h3>
                            <p style={{ color: 'var(--primary)'}}>${artwork.price}</p>
                        </div>
                    );
                })}
            </main>
        </div>
    );
};
export default PublicCataloguePage;
