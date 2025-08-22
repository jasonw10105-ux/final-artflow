// src/pages/public/ArtistPortfolioPage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';

// Fetch artist profile and their artworks
const fetchArtistPortfolio = async (slug: string) => {
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, bio, slug')
        .eq('slug', slug)
        .single();
        
    if (profileError) throw new Error('Artist not found');

    const { data: artworks, error: artworksError } = await supabase
        .from('artworks')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'Active')
        .order('created_at', { ascending: false });

    if (artworksError) throw new Error('Could not fetch artworks');

    return { profile, artworks };
};

const ArtistPortfolioPage = () => {
    const { artistSlug } = useParams<{ artistSlug: string }>();
    const navigate = useNavigate();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['artistPortfolio', artistSlug],
        queryFn: () => fetchArtistPortfolio(artistSlug!),
        enabled: !!artistSlug,
    });

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading Artist Portfolio...</p>;
    if (isError || !data) return <p style={{ textAlign: 'center', padding: '5rem' }}>Artist not found.</p>;

    const { profile, artworks } = data;

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
                <h1 style={{ fontSize: '2.5rem' }}>{profile.full_name}</h1>
                {profile.bio && <p style={{ fontSize: '1.1rem', color: 'var(--muted-foreground)', marginTop: '1rem', maxWidth: '800px', margin: '1rem auto' }}>{profile.bio}</p>}
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                {artworks.map(art => (
                    <Link key={art.id} to={`/artwork/${profile.slug}/${art.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                            <img src={art.image_url} alt={art.title || ''} style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
                            <div style={{ padding: '1rem' }}>
                                <h4 style={{ fontWeight: 600 }}>{art.title}</h4>
                                <p style={{ fontWeight: 'bold', marginTop: '0.5rem' }}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(art.price)}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
            {artworks.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>This artist does not have any artworks for sale at the moment.</p>
            )}
        </div>
    );
};

export default ArtistPortfolioPage;