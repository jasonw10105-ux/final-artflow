// src/pages/dashboard/collector/CollectorDashboardPage.tsx

import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { useRecentlyViewed } from '../../../hooks/useRecentlyViewed';
import { Link } from 'react-router-dom';

const CollectorDashboardPage = () => {
    const { profile, user } = useAuth();
    const { viewedArtworks: recentlyViewedArtworks } = useRecentlyViewed();

    const { data: recommendations, isLoading: recommendationsLoading } = useQuery({ // FIXED SYNTAX
        queryKey: ['recommendations', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data } = await supabase.rpc('get_artwork_recommendations', { p_viewer_id: user.id, p_limit: 5 });
            return data || [];
        },
        enabled: !!user
    });

    return (
        // ... rest of the component JSX is fine ...
        <div>
            <h1>Collector Dashboard</h1>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>Welcome, {profile?.full_name}!</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)'}}>
                    <h3>Artworks You Recently Viewed</h3>
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
                <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)'}}>
                    <h3>Suggested Works for You</h3>
                     {recommendationsLoading ? <p>Loading recommendations...</p> : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {recommendations?.map((rec: any) => (
                                <li key={rec.id}>
                                    <Link to={`/artwork/${rec.artist_slug}/${rec.slug}`}>{rec.title}</Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};
export default CollectorDashboardPage;