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
type ArtistRecommendation = Database['public']['Tables']['profiles']['Row'];
type ViewedArtwork = Database['public']['Tables']['artworks']['Row'];

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
        background: status === 'Available' ? 'rgba(40, 167, 69, 0.8)' : 'rgba(108, 117, 125, 0.8)',
        color: 'white',
        zIndex: 1,
        backdropFilter: 'blur(4px)',
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
            const { data, error } = await supabase.from('profiles').select('*').eq('role', 'artist').limit(10);
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
                    <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', padding: '0.5rem' }}>
                        {artworkRecommendations && artworkRecommendations.length > 0 ? artworkRecommendations.map((rec: ArtworkRecommendation) => (
                            <Link to={`/${rec.artist_slug}/artwork/${rec.slug}`} key={rec.id} style={{ position: 'relative', flex: '0 0 160px', textDecoration: 'none', color: 'inherit' }}>
                                <StatusBadge status={rec.status} />
                                <img src={rec.image_url || '/placeholder.png'} alt={rec.title || 'Untitled'} style={{ width: '160px', height: '160px', borderRadius: 'var(--radius)', objectFit: 'cover', marginBottom: '0.5rem' }} />
                                <p style={{ margin: 0, fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.title}</p>
                            </Link>
                        )) : <p style={{color: 'var(--muted-foreground)'}}>No recommendations for you yet. Start browsing to get started!</p>}
                    </div>
                )}
            </div>

             <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem'}}>
                <h3>Artists to Discover</h3>
                {artistLoading ? <p>Loading artists...</p> : (
                    <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', padding: '0.5rem' }}>
                        {artistRecommendations && artistRecommendations.length > 0 ? artistRecommendations.map((artist: ArtistRecommendation) => (
                            <Link to={`/${artist.slug}`} key={artist.id} style={{ flex: '0 0 150px', textAlign: 'center', textDecoration: 'none', color: 'inherit' }}>
                                <img src={artist.avatar_url || '/placeholder.png'} alt={artist.full_name || 'Artist'} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 0.75rem auto' }} />
                                <p style={{ margin: 0, fontWeight: '500' }}>{artist.full_name}</p>
                            </Link>
                        )) : <p style={{color: 'var(--muted-foreground)'}}>Could not load artists at this time.</p>}
                    </div>
                )}
            </div>

            <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)'}}>
                <h3>Artworks You Recently Viewed</h3>
                 {recentlyViewedArtworks.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {recentlyViewedArtworks.map((art: ViewedArtwork) => (
                            <li key={art.id}>
                                <Link to={`/artwork/${(art as any).artist_slug}/${art.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
                                    <img src={art.image_url || '/placeholder.png'} alt={art.title || "Untitled"} style={{ width: '40px', height: '40px', borderRadius: 'var(--radius)', objectFit: 'cover' }} />
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