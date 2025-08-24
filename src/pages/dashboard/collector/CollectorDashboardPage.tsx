// src/pages/dashboard/collector/CollectorDashboardPage.tsx

import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { useRecentlyViewed } from '../../../hooks/useRecentlyViewed';

// A simple component for the status badge
const StatusBadge = ({ status }: { status: string }) => {
    const style = {
        padding: '0.2rem 0.5rem',
        borderRadius: 'var(--radius)',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        position: 'absolute',
        top: '0.5rem',
        left: '0.5rem',
        background: status === 'Available' ? 'rgba(0, 150, 0, 0.7)' : 'rgba(150, 0, 0, 0.7)',
        color: 'white',
    };
    return <div style={style}>{status}</div>;
};

const CollectorDashboardPage = () => {
    const { profile, user } = useAuth();
    const { viewedArtworks: recentlyViewedArtworks } = useRecentlyViewed();

    const { data: artworkRecommendations, isLoading: artworkLoading } = useQuery({
        queryKey: ['artworkRecommendations', user?.id],
        queryFn: async () => {
            if (!user) return [];
            // This RPC now correctly returns the 'status' and filters by 'Available'
            const { data, error } = await supabase.rpc('get_artwork_recommendations', { p_viewer_id: user.id, p_limit: 10 });
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    // ... (artistRecommendations query remains the same) ...

    return (
        <div>
            <h1>Collector Dashboard</h1>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>Welcome, {profile?.full_name}!</p>

            <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem'}}>
                <h3>Artworks You Might Like</h3>
                {artworkLoading ? <p>Loading recommendations...</p> : (
                    <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                        {artworkRecommendations?.map((rec: any) => (
                            <Link to={`/artwork/${rec.artist_slug}/${rec.slug}`} key={rec.id} style={{ position: 'relative', flex: '0 0 160px', textDecoration: 'none', color: 'inherit' }}>
                                <img src={rec.image_url} alt={rec.title} style={{ width: '160px', height: '160px', borderRadius: 'var(--radius)', objectFit: 'cover', marginBottom: '0.5rem' }} />
                                {/* Since we only fetch 'Available' art, we can show a badge */}
                                <StatusBadge status={rec.status} />
                                <p style={{ margin: 0, fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.title}</p>
                            </Link>
                        ))}
                         {artworkRecommendations?.length === 0 && <p style={{color: 'var(--muted-foreground)'}}>No recommendations for you yet. Start browsing to get started!</p>}
                    </div>
                )}
            </div>

            {/* ... (rest of the component remains the same) ... */}
        </div>
    );
};
export default CollectorDashboardPage;