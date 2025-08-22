// src/pages/public/PublicCataloguePage.tsx

import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

// FINAL FIX: This function is now robust and will throw an error if either
// the artist or the catalogue is not found, which correctly triggers the
// 'isError' state in the component.
const fetchCatalogueBySlug = async (artistSlug: string, catalogueSlug: string) => {
    // Step 1: Get the artist's ID from their slug.
    const { data: artistData, error: artistError } = await supabase
        .from('profiles')
        .select('id, full_name, slug')
        .eq('slug', artistSlug)
        .single();

    // CRITICAL FIX: Check for the error OR if no data was returned.
    // This handles the case where the slug does not exist.
    if (artistError || !artistData) {
        console.error("Could not find artist with slug:", artistSlug, artistError);
        throw new Error('Artist not found');
    }

    // Step 2: Use the artist's ID to fetch the correct catalogue.
    const { data: catalogueData, error: catalogueError } = await supabase
        .from('catalogues')
        .select(`*, artworks:catalogue_artworks(position, artwork:artworks(*))`)
        .eq('slug', catalogueSlug)
        .eq('user_id', artistData.id) // Filter by the artist's ID.
        .single();

    // CRITICAL FIX: Also check for the error OR if no catalogue data was returned.
    if (catalogueError || !catalogueData) {
        console.error("Could not find catalogue with slug:", catalogueSlug, "for artist:", artistData.id, catalogueError);
        throw new Error('Catalogue not found');
    }

    // By this point, we are guaranteed to have valid data.
    const finalData = {
        ...catalogueData,
        artist: artistData,
    };

    // Ensure artworks is always an array to prevent .sort() errors.
    finalData.artworks = (finalData.artworks && Array.isArray(finalData.artworks)) ? finalData.artworks : [];
    finalData.artworks.sort((a, b) => (a.position || 0) - (b.position || 0));
    
    return finalData;
};

const PublicCataloguePage = () => {
    const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string, catalogueSlug: string }>();
    
    const { data: catalogue, isLoading, isError } = useQuery({
        queryKey: ['catalogue', artistSlug, catalogueSlug], 
        queryFn: () => fetchCatalogueBySlug(artistSlug!, catalogueSlug!),
        enabled: !!artistSlug && !!catalogueSlug,
    });

    if (isLoading) {
        return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading catalogue...</p>;
    }
    
    // With the fix above, this guard clause will now work correctly.
    if (isError || !catalogue) {
        return <p style={{ textAlign: 'center', padding: '5rem' }}>Catalogue not found.</p>;
    }

    return (
        <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1>{catalogue.title}</h1>
                {catalogue.artist && <h2>by {catalogue.artist.full_name}</h2>}
                <p>{catalogue.description}</p>
            </header>
            <main style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                {catalogue.artworks.map(({artwork}: any) => {
                    // Add defensive check for artwork object before rendering
                    if (!artwork) return null;
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
