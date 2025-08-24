// src/pages/dashboard/collector/CollectorDashboardPage.tsx

import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { useRecentlyViewed, StoredArtwork } from '@/hooks/useRecentlyViewed';
import { Database } from '@/types/database.types';

type ArtworkRecommendation = (Database['public']['Functions']['get_artwork_recommendations']['Returns'] & {})[number];
type ArtistRecommendation = Database['public']['Tables']['profiles']['Row'];

const StatusBadge = ({ status }: { status?: string }) => {
    const style: React.CSSProperties = {
        padding: '0.2rem 0.5rem',
        borderRadius: 'var(--radius)',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        position: 'absolute',
        top: '0.5rem',
        left: '0.5rem',
        background: status === 'Available' ? 'rgba(40, 167, 69, 0.8)' : 'rgba(108, 117, 125, 0.8)',
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

    const { data: artistRecommendations, isLoading: artistLoading } = useQuery({
        queryKey: ['artistRecommendations', user?.id],
        queryFn: async (): Promise<ArtistRecommendation[]> => {
            if (!user) return [];
            const { data, error } = await supabase.from('profiles').select('*').in('role', ['artist', 'both']).limit(10);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    return (
        <div>
            <h1>Collector Dashboard</h1>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>Welcome, {profile?.full_name}!</p>

            <div className="widget">
                <h3>Artworks You Might Like</h3>
                {artworkLoading ? <p>Loading...</p> : (
                    <div className="horizontal-scroll-row">
                        {artworkRecommendations?.map((rec) => (
                            <Link to={`/${rec.artist_slug}/artwork/${rec.slug}`} key={rec.id} className="scroll-card">
                                <StatusBadge status={rec.status} />
                                <img src={rec.image_url || '/placeholder.png'} alt={rec.title || 'Untitled'} />
                                <p>{rec.title}</p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <div className="widget">
                <h3>Artists to Discover</h3>
                {artistLoading ? <p>Loading...</p> : (
                    <div className="horizontal-scroll-row">
                        {artistRecommendations?.map((artist) => (
                            <Link to={`/${artist.slug}`} key={artist.id} className="scroll-card-artist">
                                <img src={artist.avatar_url || '/placeholder.png'} alt={artist.full_name || 'Artist'} />
                                <p>{artist.full_name}</p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <div className="widget">
                <h3>Artworks You Recently Viewed</h3>
                 {recentlyViewedArtworks.length > 0 ? (
                    <ul className="vertical-list">
                        {/* FIX: The 'art' parameter is now correctly typed from the hook */}
                        {recentlyViewedArtworks.map((art: StoredArtwork) => (
                            <li key={art.id}>
                                <Link to={`/${art.artist_slug}/artwork/${art.slug}`} className="list-item-link">
                                    <img src={art.image_url || '/placeholder.png'} alt={art.title || "Untitled"} />
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