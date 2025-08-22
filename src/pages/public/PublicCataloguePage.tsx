// src/pages/public/PublicCataloguePage.tsx

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';

const fetchPublicCatalogue = async (artistSlug: string, catalogueSlug: string) => {
    const { data: catalogue, error: catalogueError } = await supabase
        .from('catalogues')
        .select('*, artist:profiles!inner(full_name, slug)')
        .eq('slug', catalogueSlug)
        .eq('artist.slug', artistSlug) // Ensure the artist slug also matches
        .single();
    
    if (catalogueError) {
        console.error("Supabase error fetching catalogue:", catalogueError.message);
        throw new Error('Catalogue not found');
    }

    const { data: artworks, error: artworksError } = await supabase
        .from('artworks')
        .select('*')
        .eq('catalogue_id', catalogue.id)
        .eq('status', 'Active')
        .order('created_at', { ascending: false });

    if (artworksError) {
        console.error("Supabase error fetching artworks for catalogue:", artworksError.message);
        throw new Error('Could not fetch artworks for this catalogue');
    }
    
    return { catalogue, artworks };
};

const PublicCataloguePage = () => {
    const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string, catalogueSlug: string }>();
    const navigate = useNavigate();
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['publicCatalogue', artistSlug, catalogueSlug],
        queryFn: () => fetchPublicCatalogue(artistSlug!, catalogueSlug!),
        enabled: !!artistSlug && !!catalogueSlug,
        retry: false
    });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [catalogueSlug]);

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading Catalogue...</p>;
    
    if (isError) {
        console.error(error);
        return <p style={{ textAlign: 'center', padding: '5rem' }}>Catalogue not found.</p>;
    }

    const { catalogue, artworks } = data;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <button 
                onClick={() => navigate(-1)} 
                className="button button-secondary" 
                style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <ArrowLeft size={16} />
                Back
            </button>

            <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }}>{catalogue.title}</h1>
                {/* --- FIXED: Link to artist portfolio --- */}
                <Link to={`/${catalogue.artist.slug}`} style={{textDecoration: 'none'}}>
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
                        Curated by {catalogue.artist.full_name}
                    </h2>
                </Link>
                {catalogue.description && <p style={{ marginTop: '1rem', maxWidth: '800px', margin: '1rem auto', lineHeight: 1.6 }}>{catalogue.description}</p>}
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                {artworks.map(art => (
                    // --- FIXED: Link to artwork page ---
                    <Link key={art.id} to={`/${catalogue.artist.slug}/artwork/${art.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                            <img src={art.image_url || 'https://placehold.co/600x400'} alt={art.title || ''} style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
                            <div style={{ padding: '1rem' }}>
                                <h4 style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{art.title}</h4>
                                <p style={{ fontWeight: 'bold', marginTop: '0.5rem' }}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(art.price)}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
            
             {artworks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
                    <p style={{ color: 'var(--muted-foreground)' }}>There are no available artworks in this catalogue at the moment.</p>
                </div>
            )}
        </div>
    );
};

export default PublicCataloguePage;