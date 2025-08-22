// src/pages/public/PublicCataloguePage.tsx

import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

// --- FIXED ---
// This function was rewritten to solve the "Cannot filter on related table" error.
// 1. It first fetches the artist's profile using the `artistSlug` to get their ID.
// 2. It then uses this artist ID to correctly query for the catalogue, ensuring we get the right one.
const fetchCatalogueBySlug = async (artistSlug: string, catalogueSlug: string) => {
    // Step 1: Get the artist's ID from their slug
    const { data: artistData, error: artistError } = await supabase
        .from('profiles')
        .select('id, full_name, slug')
        .eq('slug', artistSlug)
        .single();

    if (artistError || !artistData) {
        throw new Error('Artist not found');
    }

    // Step 2: Use the artist's ID to fetch the correct catalogue
    const { data: catalogueData, error: catalogueError } = await supabase
        .from('catalogues')
        .select(`*, artworks:catalogue_artworks(position, artwork:artworks(*))`)
        .eq('slug', catalogueSlug)
        .eq('user_id', artistData.id) // Filter by the artist's ID
        .single();

    if (catalogueError) {
        throw new Error('Catalogue not found');
    }

    // Combine the data and sort artworks by position
    const finalData = {
        ...catalogueData,
        artist: artistData,
    };
    finalData.artworks.sort((a,b) => a.position - b.position);

    return finalData;
};

const PublicCataloguePage = () => {
    const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string, catalogueSlug: string }>();
    
    const { data: catalogue, isLoading, isError } = useQuery({
        queryKey: ['catalogue', artistSlug, catalogueSlug], 
        queryFn: () => fetchCatalogueBySlug(artistSlug!, catalogueSlug!),
        enabled: !!artistSlug && !!catalogueSlug,
    });

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading catalogue...</p>;
    
    // --- FIXED --- 
    // Added a check for `!catalogue` to prevent a crash if the query returns no data.
    if (isError || !catalogue) return <p style={{ textAlign: 'center', padding: '5rem' }}>Catalogue not found.</p>;

    return (
        <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1>{catalogue.title}</h1>
                {catalogue.artist && <h2>by {catalogue.artist.full_name}</h2>}
                <p>{catalogue.description}</p>
            </header>
            <main style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                {catalogue.artworks.map(({artwork}: any) => (
                    <div key={artwork.id}>
                        {catalogue.artist && (
                            <Link to={`/artwork/${catalogue.artist.slug}/${artwork.slug}`}>
                                <img src={artwork.image_url} alt={artwork.title} style={{ width: '100%', borderRadius: 'var(--radius)' }}/>
                            </Link>
                        )}
                        <h3 style={{marginTop: '1rem'}}>{artwork.title}</h3>
                        <p style={{ color: 'var(--primary)'}}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(artwork.price)}</p>
                    </div>
                ))}
            </main>
        </div>
    );
};
export default PublicCataloguePage;
