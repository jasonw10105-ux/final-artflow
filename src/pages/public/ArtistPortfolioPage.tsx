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
        .select('id, full_name, bio, slug, avatar_url')
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

    // Log the profile view after successfully fetching the profile
    await supabase.rpc('log_profile_view', { p_artist_id: profile.id });

    return { profile, artworks };
};

const ArtistPortfolioPage = () => {
    // --- FIXED: Changed to 'profileSlug' to match the route in App.tsx ---
    const { profileSlug } = useParams<{ profileSlug: string }>();
    const navigate = useNavigate();
    const { data, isLoading, isError } = useQuery({
        // --- FIXED: Use the correct variable in the queryKey ---
        queryKey: ['artistPortfolio', profileSlug],
        queryFn: () => fetchArtistPortfolio(profileSlug!),
        enabled: !!profileSlug,
    });

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading Artist Portfolio...</p>;
    if (isError || !data) return <p style={{ textAlign: 'center', padding: '5rem' }}>Artist not found.</p>;

    const { profile, artworks } = data;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <button 
                onClick={() => navigate('/artists')} 
                className="button button-secondary" 
                style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <ArrowLeft size={16} />
                All Artists
            </button>
            
            <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <img src={profile.avatar_url || 'https://placehold.co/128x128'} alt={profile.full_name || ''} style={{ width: '128px', height: '128px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                <h1 style={{ fontSize: '2.5rem', marginTop: '1.5rem' }}>{profile.full_name}</h1>
                {profile.bio && <p style={{ fontSize: '1.1rem', color: 'var(--muted-foreground)', marginTop: '1rem', maxWidth: '800px', margin: '1rem auto' }}>{profile.bio}</p>}
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                {artworks.map(art => (
                    // --- FIXED: Link updated to the new URL structure ---
                    <Link key={art.id} to={`/${profile.slug}/artwork/${art.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                            <img src={art.image_url || 'https://placehold.co/600x400'} alt={art.title || ''} style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
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
                <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '3rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>This artist does not have any artworks for sale at the moment.</p>
            )}
        </div>
    );
};

export default ArtistPortfolioPage;