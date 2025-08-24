// src/pages/dashboard/collector/CollectorDashboardPage.tsx

import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { useRecentlyViewed } from '../../../hooks/useRecentlyViewed';

const CollectorDashboardPage = () => {
    const { profile, user } = useAuth();
    const { viewedArtworks: recentlyViewedArtworks } = useRecentlyViewed();

    const { data: artworkRecommendations, isLoading: artworkLoading } = useQuery({
        queryKey: ['artworkRecommendations', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase.rpc('get_artwork_recommendations', { p_viewer_id: user.id, p_limit: 10 });
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    const { data: artistRecommendations, isLoading: artistLoading } = useQuery({
        queryKey: ['artistRecommendations', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase.rpc('get_artist_recommendations', { p_viewer_id: user.id, p_limit: 10 });
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    return (
        <div>
            <h1>Collector Dashboard</h1>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>Welcome, {profile?.full_name}!</p>

            <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem'}}>
                <h3>Artworks You Might Like</h3>
                {artworkLoading ? <p>Loading recommendations...</p> : (
                    <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                        {artworkRecommendations?.map((rec: any) => (
                            <Link to={`/artwork/${rec.artist_slug}/${rec.slug}`} key={rec.id} style={{ flex: '0 0 160px', textDecoration: 'none', color: 'inherit' }}>
                                <img src={rec.image_url} alt={rec.title} style={{ width: '160px', height: '160px', borderRadius: 'var(--radius)', objectFit: 'cover', marginBottom: '0.5rem' }} />
                                <p style={{ margin: 0, fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.title}</p>
                            </Link>
                        ))}
                         {artworkRecommendations?.length === 0 && <p style={{color: 'var(--muted-foreground)'}}>No recommendations for you yet. Start browsing to get started!</p>}
                    </div>
                )}
            </div>

            <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem'}}>
                <h3>Artists to Discover</h3>
                {artistLoading ? <p>Loading artists...</p> : (
                    <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                        {artistRecommendations?.map((artist: any) => (
                            <Link to={`/artist/${artist.slug}`} key={artist.id} style={{ flex: '0 0 150px', textAlign: 'center', textDecoration: 'none', color: 'inherit' }}>
                                <img src={artist.avatar_url} alt={artist.full_name} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 0.75rem auto' }} />
                                <p style={{ margin: 0, fontWeight: '500' }}>{artist.full_name}</p>
                            </Link>
                        ))}
                        {artistRecommendations?.length === 0 && <p style={{color: 'var(--muted-foreground)'}}>No artist recommendations at this time.</p>}
                    </div>
                )}
            </div>

            <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)'}}>
                <h3>Recently Viewed</h3>
                 {recentlyViewedArtworks.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {recentlyViewedArtworks.map((art: any) => (
                            <li key={art.id}>
                                <Link to={`/artwork/${art.artist_slug}/${art.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <img src={art.image_url} alt={art.title} style={{ width: '40px', height: '40px', borderRadius: 'var(--radius)', objectFit: 'cover' }} />
                                    <span>{art.title}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p style={{ color: 'var(--muted-foreground)' }}>No recently viewed artworks.</p>
                )}
            </div>
        </div>
    );
};
export default CollectorDashboardPage;