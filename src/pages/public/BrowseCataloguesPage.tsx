// src/pages/public/BrowseCataloguesPage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

interface Catalogue {
    id: string;
    title: string;
    cover_image_url: string;
    slug: string;
    profile_full_name: string;
    profile_slug: string;
}

const fetchAllCatalogues = async (): Promise<Catalogue[]> => {
    const { data, error } = await supabase.rpc('get_all_catalogues');
    if (error) {
        console.error("Error fetching catalogues:", error);
        throw new Error(error.message);
    }
    return data || [];
};

const BrowseCataloguesPage = () => {
    const { data: catalogues, isLoading, isError } = useQuery({
        queryKey: ['allCatalogues'],
        queryFn: fetchAllCatalogues,
    });

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading catalogues...</p>;
    if (isError) return <p style={{ textAlign: 'center', padding: '5rem' }}>Could not load catalogues at this time.</p>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <h1 style={{ marginBottom: '3rem' }}>Browse Catalogues</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                {catalogues && catalogues.length > 0 ? (
                    catalogues.map((cat: Catalogue) => (
                        // --- FIXED: Link updated to the new URL structure ---
                        <Link to={`/${cat.profile_slug}/catalogue/${cat.slug}`} key={cat.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                <img src={cat.cover_image_url || 'https://placehold.co/600x400'} alt={cat.title} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }} />
                                <div style={{ padding: '1rem' }}>
                                    <h4>{cat.title}</h4>
                                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>by {cat.profile_full_name}</p>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <p>No public catalogues are available at this time.</p>
                )}
            </div>
        </div>
    );
};

export default BrowseCataloguesPage;