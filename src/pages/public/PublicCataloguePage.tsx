// src/pages/public/PublicCataloguePage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

// --- API FUNCTION ---
const fetchPublicCatalogueData = async (artistSlug: string, catalogueSlug: string) => {
    // 1. Find the artist's profile by their slug
    const { data: profile, error: profileError } = await supabase
        .from('profiles').select('id, full_name, slug').eq('slug', artistSlug).single();
    if (profileError || !profile) throw new Error('Artist not found.');

    // 2. Find the catalogue by its slug, ensuring it belongs to the found artist
    const { data: catalogue, error: catalogueError } = await supabase
        .from('catalogues').select('*').eq('slug', catalogueSlug).eq('user_id', profile.id).single();
    if (catalogueError || !catalogue) throw new Error('Catalogue not found for this artist.');

    // 3. Fetch all artworks that belong to this catalogue
    const { data: artworks, error: artworksError } = await supabase
        .from('artworks')
        .select('id, title, image_url, slug, price, dimensions, medium')
        .eq('catalogue_id', catalogue.id)
        .order('created_at', { ascending: false }); // Or any other order you prefer
    if (artworksError) throw new Error('Could not fetch artworks for this catalogue.');

    // 4. Combine all data into a single object
    return { ...catalogue, artist: profile, artworks: artworks || [] };
};


// --- MAIN COMPONENT ---
const PublicCataloguePage = () => {
    const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string, catalogueSlug: string }>();

    const { data: catalogue, isLoading, isError, error } = useQuery({
        queryKey: ['publicCatalogue', artistSlug, catalogueSlug],
        queryFn: () => fetchPublicCatalogueData(artistSlug!, catalogueSlug!),
        enabled: !!artistSlug && !!catalogueSlug,
        retry: false,
    });

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading catalogue...</p>;
    if (isError) return <p style={{ textAlign: 'center', padding: '5rem' }}>{error instanceof Error ? error.message : 'Could not load catalogue.'}</p>;
    if (!catalogue) return <p style={{ textAlign: 'center', padding: '5rem' }}>Catalogue not found.</p>;

    return (
        <div style={{ maxWidth: '1000px', margin: '4rem auto', padding: '0 2rem' }}>
            <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <h1 style={{fontSize: '3rem', marginBottom: '0.5rem'}}>{catalogue.title}</h1>
                <Link to={`/${catalogue.artist.slug}`} style={{textDecoration: 'none', color: 'var(--muted-foreground)', fontSize: '1.25rem'}}>
                    A collection by {catalogue.artist.full_name}
                </Link>
                {catalogue.description && <p style={{marginTop: '1.5rem', maxWidth: '600px', margin: '1.5rem auto 0 auto', lineHeight: 1.6}}>{catalogue.description}</p>}
            </header>

            <main style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                {catalogue.artworks && catalogue.artworks.length > 0 ? (
                    catalogue.artworks.map((artwork: any) => (
                        <div key={artwork.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
                            <Link to={`/artwork/${catalogue.artist.slug}/${artwork.slug}`}>
                                <img src={artwork.image_url} alt={artwork.title} style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}/>
                            </Link>
                            <div>
                                <h3 style={{marginTop: '0', fontSize: '1.75rem'}}>
                                    <Link to={`/artwork/${catalogue.artist.slug}/${artwork.slug}`} style={{textDecoration: 'none', color: 'inherit'}}>
                                        {artwork.title}
                                    </Link>
                                </h3>
                                <p style={{margin: '0.5rem 0', color: 'var(--muted-foreground)'}}>{artwork.medium}</p>
                                <p style={{margin: '0.5rem 0', color: 'var(--muted-foreground)'}}>
                                    {artwork.dimensions ? `${artwork.dimensions.height}h x ${artwork.dimensions.width}w ${artwork.dimensions.unit || ''}` : ''}
                                </p>
                                {artwork.price && <p style={{ fontWeight: 'bold', fontSize: '1.2rem', marginTop: '1rem' }}>${artwork.price.toLocaleString()}</p>}
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                        There are no artworks in this catalogue yet.
                    </p>
                )}
            </main>
        </div>
    );
};

export default PublicCataloguePage;