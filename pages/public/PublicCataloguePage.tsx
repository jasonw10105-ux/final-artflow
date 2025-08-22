// src/pages/public/PublicCataloguePage.tsx

import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

// FIX: This function is rewritten to correctly fetch data and prevent crashes.
// The original query `.eq('profiles.slug', artistSlug)` is invalid and causes the error.
const fetchCatalogueBySlug = async (artistSlug: string, catalogueSlug: string) => {
    // Step 1: We must first find the artist's unique ID using their public slug.
    const { data: artistData, error: artistError } = await supabase
        .from('profiles')
        .select('id, full_name, slug')
        .eq('slug', artistSlug)
        .single();

    if (artistError || !artistData) {
        console.error("Artist not found:", artistError);
        throw new Error('Artist not found');
    }

    // Step 2: Now we can reliably find the catalogue using its slug AND the artist's ID.
    // This ensures we get the correct catalogue belonging to the correct artist.
    const { data: catalogueData, error: catalogueError } = await supabase
        .from('catalogues')
        .select(`*, artworks:catalogue_artworks(position, artwork:artworks(*))`)
        .eq('slug', catalogueSlug)
        .eq('user_id', artistData.id) // This is the crucial, correct filter.
        .single();
    
    if (catalogueError || !catalogueData) {
        console.error("Catalogue not found:", catalogueError);
        throw new Error('Catalogue not found');
    }

    // Step 3: Combine the data to match the structure the component expects.
    const finalData = {
        ...catalogueData,
        artist: artistData,
    };

    // Ensure artworks is an array before sorting to prevent errors.
    if (finalData.artworks && Array.isArray(finalData.artworks)) {
        finalData.artworks.sort((a,b) => a.position - b.position);
    } else {
        finalData.artworks = []; 
    }
    
    return finalData;
};

const PublicCataloguePage = () => {
    const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string, catalogueSlug: string }>();
    const { data: catalogue, isLoading, isError } = useQuery({
        // FIX: The query key must include all dependencies (both slugs) for correct caching.
        queryKey: ['catalogue', artistSlug, catalogueSlug], 
        queryFn: () => fetchCatalogueBySlug(artistSlug!, catalogueSlug!),
        enabled: !!artistSlug && !!catalogueSlug,
    });

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading catalogue...</p>;
    
    if (isError || !catalogue) return <p style={{ textAlign: 'center', padding: '5rem' }}>Catalogue not found.</p>;

    return (
        <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1>{catalogue.title}</h1>
                {/* FIX: Add a defensive check for catalogue.artist to prevent render errors. */}
                {catalogue.artist && <h2>by {catalogue.artist.full_name}</h2>}
                <p>{catalogue.description}</p>
            </header>
            <main style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                {catalogue.artworks.map(({artwork}: any) => {
                    // FIX: Ensure artwork object exists before trying to render.
                    if (!artwork) return null;
                    return (
                        <div key={artwork.id}>
                            {catalogue.artist && artwork.slug && (
                                <Link to={`/artwork/${catalogue.artist.slug}/${artwork.slug}`}>
                                    <img src={artwork.image_url} alt={artwork.title} style={{ width: '100%', borderRadius: 'var(--radius)' }}/>
                                </Link>
                            )}
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
