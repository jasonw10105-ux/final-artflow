// src/pages/dashboard/collector/CollectorDashboardPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface Artwork {
  id: string;
  title: string;
  slug: string;
  image_url: string;
  artist_id: string;
  artist_slug: string;
  status: string;
}

interface Artist {
  artist_id: string;
  full_name: string;
  artist_slug: string;
  avatar_url: string;
}

interface CollectorInsights {
  total_likes: number;
  total_dislikes: number;
  top_artist: string | null;
  top_artist_likes: number | null;
  top_medium: string | null;
  top_medium_likes: number | null;
  favorite_price_bracket: string | null;
  favorite_price_count: number | null;
  recently_viewed: { artwork_id: string; viewed_at: string }[];
  followed_artists: { artist_id: string; followed_at: string }[];
  saved_artworks: { artwork_id: string; liked_at: string }[];
  inquiry_count: number;
}

const StatusBadge = ({ status }: { status?: string }) => (
    <div style={{
        padding: '0.2rem 0.5rem',
        borderRadius: 'var(--radius)',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        position: 'absolute',
        top: '0.5rem',
        left: '0.5rem',
        background: status === 'Available' ? 'rgba(40,167,69,0.8)' : 'rgba(108,117,125,0.8)',
        color: 'white',
        zIndex: 1
    }}>
        {status}
    </div>
);

const CollectorDashboardPage = () => {
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const [likedArtworkIds, setLikedArtworkIds] = useState<string[]>([]);
    const [dislikedArtworkIds, setDislikedArtworkIds] = useState<string[]>([]);

    // Fetch all insights and learned patterns in one call
    const { data: insights, isLoading } = useQuery<CollectorInsights>({
        queryKey: ['collectorInsights', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .rpc('get_collector_full_insights', { p_collector_id: user.id })
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!user
    });

    // Mutation for like/dislike
    const mutation = useMutation({
        mutationFn: async (payload: { artwork_id: string; reaction_type: 'like' | 'dislike' }) => {
            if (!user) throw new Error("User not found");
            const { data, error } = await supabase
                .from('artwork_reactions')
                .upsert({
                    collector_id: user.id,
                    artwork_id: payload.artwork_id,
                    reaction_type: payload.reaction_type,
                    created_at: new Date().toISOString()
                }, { onConflict: ['collector_id', 'artwork_id'] })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collectorInsights', user?.id] });
        }
    });

    const handleReaction = (artwork_id: string, type: 'like' | 'dislike') => {
        mutation.mutate({ artwork_id, reaction_type: type });
        if (type === 'like') {
            setLikedArtworkIds(prev => [...prev, artwork_id]);
            setDislikedArtworkIds(prev => prev.filter(id => id !== artwork_id));
        } else {
            setDislikedArtworkIds(prev => [...prev, artwork_id]);
            setLikedArtworkIds(prev => prev.filter(id => id !== artwork_id));
        }
    };

    if (isLoading || !insights) return <p>Loading dashboard...</p>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <h1>Collector Dashboard</h1>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>
                Welcome, {profile?.full_name}!
            </p>

            {/* Favorite Artist & Medium */}
            <div className="widget">
                <h3>Acquisition Patterns</h3>
                <p>Top Artist Liked: {insights.top_artist || 'N/A'} ({insights.top_artist_likes || 0} likes)</p>
                <p>Top Medium Liked: {insights.top_medium || 'N/A'} ({insights.top_medium_likes || 0} likes)</p>
                <p>Favorite Price Bracket: {insights.favorite_price_bracket || 'N/A'} ({insights.favorite_price_count || 0} artworks)</p>
            </div>

            {/* Recently Viewed */}
            <div className="widget">
                <h3>Recently Viewed Artworks</h3>
                {insights.recently_viewed.length > 0 ? (
                    <div className="horizontal-scroll-row">
                        {insights.recently_viewed.map(rv => (
                            <Link key={rv.artwork_id} to={`/artwork/${rv.artwork_id}`} className="scroll-card">
                                <p>{rv.artwork_id}</p>
                                <small>{formatDistanceToNow(new Date(rv.viewed_at), { addSuffix: true })}</small>
                            </Link>
                        ))}
                    </div>
                ) : <p>No recently viewed artworks.</p>}
            </div>

            {/* Followed Artists */}
            <div className="widget">
                <h3>Followed Artists</h3>
                {insights.followed_artists.length > 0 ? (
                    <div className="horizontal-scroll-row">
                        {insights.followed_artists.map(fa => (
                            <Link key={fa.artist_id} to={`/artist/${fa.artist_id}`} className="scroll-card-artist">
                                <p>{fa.artist_id}</p>
                            </Link>
                        ))}
                    </div>
                ) : <p>You haven’t followed any artists yet.</p>}
            </div>

            {/* Liked Artworks */}
            <div className="widget">
                <h3>Artworks You’ve Saved / Liked</h3>
                {insights.saved_artworks.length > 0 ? (
                    <div className="horizontal-scroll-row">
                        {insights.saved_artworks.map(sa => (
                            <div key={sa.artwork_id} className="scroll-card">
                                <p>{sa.artwork_id}</p>
                                <button onClick={() => handleReaction(sa.artwork_id, 'dislike')}>
                                    Dislike
                                </button>
                            </div>
                        ))}
                    </div>
                ) : <p>No saved artworks yet.</p>}
            </div>

            {/* Example Recommendations (based on learned insights) */}
            <div className="widget">
                <h3>Recommended for You</h3>
                {/* Here you could fetch recommended artworks based on top_artist, top_medium, price_bracket */}
                <p>Coming soon: AI-powered recommendations based on your behavior.</p>
            </div>
        </div>
    );
};

export default CollectorDashboardPage;
