// src/pages/dashboard/collector/CollectorDashboardPage.tsx

import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Database } from '@/types/database.types';

// Define a type for the RPC function's return value for better safety
type ArtworkRecommendation = (Database['public']['Functions']['get_artwork_recommendations']['Returns'] & {})[number];

// FIX: Explicitly type the style object with React.CSSProperties
const StatusBadge = ({ status }: { status: string }) => {
    const style: React.CSSProperties = {
        padding: '0.2rem 0.5rem',
        borderRadius: 'var(--radius)',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        position: 'absolute', // This now correctly matches the 'Position' type
        top: '0.5rem',
        left: '0.5rem',
        background: status === 'Available' ? 'rgba(0, 150, 0, 0.7)' : 'rgba(150, 0, 0, 0.7)',
        color: 'white',
        zIndex: 1,
    };
    return <div style={style}>{status}</div>;
};

const CollectorDashboardPage = () => {
    const { profile, user } = useAuth();
    const { viewedArtworks: recentlyViewedArtworks } = useRecentlyViewed();

    const { data: artworkRecommendations, isLoading: artworkLoading } = useQuery({
        queryKey: ['artworkRecommendations', user?.id],
        queryFn: async (): Promise<ArtworkRecommendation[]> => {
            if (!user) return [];
            const { data, error } = await supabase.rpc('get_artwork_recommendations', { p_viewer_id: user.id, p_limit: 10 });
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });
    
    // You would also have your artistRecommendations query here...
    
    return (
        <div>
            <h1>Collector Dashboard</h1>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>Welcome, {profile?.full_name}!</p>

            <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem'}}>
                <h3>Artworks You Might Like</h3>
                {artworkLoading ? <p>Loading recommendations...</p> : (
                    <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                        {artworkRecommendations && artworkRecommendations.map((rec: ArtworkRecommendation) => (
                            <Link to={`/artwork/${rec.artist_slug}/${rec.slug}`} key={rec.id} style={{ position: 'relative', flex: '0 0 160px', textDecoration: 'none', color: 'inherit' }}>
                                <StatusBadge status={rec.status} />
                                <img src={rec.image_url || '/placeholder.png'} alt={rec.title || 'Untitled'} style={{ width: '160px', height: '160px', borderRadius: 'var(--radius)', objectFit: 'cover', marginBottom: '0.5rem' }} />
                                <p style={{ margin: 0, fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.title}</p>
                            </Link>
                        ))}
                         {(!artworkRecommendations || artworkRecommendations.length === 0) && <p style={{color: 'var(--muted-foreground)'}}>No recommendations for you yet. Start browsing to get started!</p>}
                    </div>
                )}
            </div>
            
            {/* The rest of your dashboard page JSX, such as artist recommendations and recently viewed, would go here. */}
        </div>
    );
};

export default CollectorDashboardPage;