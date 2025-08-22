// src/pages/public/BrowseArtworksPage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

// --- Type Definition ---
interface Artwork {
    id: string;
    title: string;
    image_url: string;
    slug: string;
    price: number;
    profile_full_name: string;
    profile_slug: string;
}

// --- API Function ---
const fetchAllArtworks = async (): Promise<Artwork[]> => {
    const { data, error } = await supabase.rpc('get_all_artworks');
    if (error) throw new Error(error.message);
    return data || [];
};

const BrowseArtworksPage = () => {
    const { data: artworks, isLoading, isError } = useQuery({
        queryKey: ['allArtworks'],
        queryFn: fetchAllArtworks,
    });

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading artworks...</p>;
    if (isError) return <p style={{ textAlign: 'center', padding: '5rem' }}>Could not load artworks.</p>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <h1 style={{ marginBottom: '3rem' }}>Browse All Artworks</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                {artworks?.map((art: Artwork) => (
                    // --- FIXED: Link updated to the new URL structure ---
                    <Link to={`/${art.profile_slug}/artwork/${art.slug}`} key={art.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                            <img src={art.image_url || 'https://placehold.co/600x400'} alt={art.title || ''} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                            <div style={{ padding: '1rem' }}>
                                <h4>{art.title}</h4>
                                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>{art.profile_full_name}</p>
                                <p style={{ color: 'var(--primary)', fontWeight: 600, marginTop: '0.5rem' }}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(art.price)}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default BrowseArtworksPage;