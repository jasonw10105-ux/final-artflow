// src/pages/public/PublicCataloguePage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';
import '../../index.css';

const fetchPublicCatalogue = async (artistSlug: string, catalogueSlug: string) => {
    // First, find the catalogue ensuring it belongs to the correct artist via their slug
    const { data: catalogue, error: catalogueError } = await supabase
        .from('catalogues')
        .select('*, artist:profiles!inner(full_name, slug)')
        .eq('slug', catalogueSlug)
        .eq('artist.slug', artistSlug)
        .single();
    
    if (catalogueError) {
        console.error("Supabase error fetching catalogue:", catalogueError.message);
        throw new Error('Catalogue not found.');
    }

    // If the catalogue is found, fetch its published artworks
    const { data: artworks, error: artworksError } = await supabase
        .from('artworks')
        .select('id, title, slug, image_url, price')
        .eq('catalogue_id', catalogue.id)
        .eq('status', 'Published') // Only show published artworks publicly
        .order('created_at', { ascending: false });

    if (artworksError) {
        console.error("Supabase error fetching artworks for catalogue:", artworksError.message);
        throw new Error('Could not fetch artworks for this catalogue.');
    }
    
    return { catalogue, artworks };
};

const PublicCataloguePage = () => {
    const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string; catalogueSlug: string; }>();
    const navigate = useNavigate();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['publicCatalogue', artistSlug, catalogueSlug],
        queryFn: () => fetchPublicCatalogue(artistSlug!, catalogueSlug!),
        enabled: !!artistSlug && !!catalogueSlug,
        retry: 1, // Retry once on failure
    });

    if (isLoading) {
        return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading Catalogue...</p>;
    }
    
    if (isError || !data) {
        return <p style={{ textAlign: 'center', padding: '5rem' }}>This catalogue could not be found.</p>;
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
                <Link to={`/${catalogue.artist.slug}`} style={{textDecoration: 'none'}}>
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
                        From the collection of {catalogue.artist.full_name}
                    </h2>
                </Link>
                {catalogue.description && (
                    <p style={{ marginTop: '1rem', maxWidth: '800px', margin: '1rem auto', lineHeight: 1.6 }}>
                        {catalogue.description}
                    </p>
                )}
            </header>

            {artworks && artworks.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                    {artworks.map(art => (
                        <Link key={art.id} to={`/${catalogue.artist.slug}/artwork/${art.slug}`} className="artwork-card-link">
                            <div className="artwork-card">
                                <img 
                                    src={art.image_url || 'https://placehold.co/600x400?text=No+Image'} 
                                    alt={art.title || 'Artwork'} 
                                    className="artwork-card-image" 
                                />
                                <div className="artwork-card-info">
                                    <h4>{art.title}</h4>
                                    <p>${new Intl.NumberFormat('en-US').format(art.price)}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
                    <p style={{ color: 'var(--muted-foreground)' }}>There are no available artworks in this catalogue at the moment.</p>
                </div>
            )}
        </div>
    );
};

export default PublicCataloguePage;
