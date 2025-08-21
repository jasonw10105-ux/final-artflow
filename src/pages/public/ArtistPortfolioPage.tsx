import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const fetchArtistBySlug = async (slug: string) => {
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('slug', slug).single();
    if (profileError) throw new Error('Artist not found');
    const { data: artworks } = await supabase.from('artworks').select('*').eq('user_id', profile.id).eq('status', 'Active');
    await supabase.rpc('log_profile_view', { p_artist_id: profile.id });
    return { profile, artworks: artworks || [] };
};

const ArtistPortfolioPage = () => {
    const { profileSlug } = useParams<{ profileSlug: string }>();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['artistPortfolio', profileSlug],
        queryFn: () => fetchArtistBySlug(profileSlug!),
        enabled: !!profileSlug,
    });

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading portfolio...</p>;
    if (isError) return <p style={{ textAlign: 'center', padding: '5rem' }}>Artist not found.</p>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            {data && (
                <>
                    <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <img src={data.profile.avatar_url || 'https://placehold.co/128x128'} alt={data.profile.full_name} style={{ width: '128px', height: '128px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                        <h1 style={{ marginTop: '1.5rem' }}>{data.profile.full_name}</h1>
                        <p style={{ marginTop: '1rem', color: 'var(--muted-foreground)', maxWidth: '600px', margin: '1rem auto' }}>{data.profile.bio}</p>
                    </header>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                        {data.artworks.map((art: any) => (
                            <Link to={`/artwork/${data.profile.slug}/${art.slug}`} key={art.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                    <img src={art.image_url} alt={art.title} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                                    <div style={{ padding: '1rem' }}>
                                        <h4>{art.title}</h4>
                                        <p style={{ color: 'var(--primary)' }}>${art.price}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
export default ArtistPortfolioPage;