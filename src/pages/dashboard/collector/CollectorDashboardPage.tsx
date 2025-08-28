// src/pages/dashboard/collector/CollectorDashboardPage.tsx

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { useRecentlyViewed, StoredArtwork } from '@/hooks/useRecentlyViewed';
import { Database } from '@/types/database.types';

type ArtworkRecommendation = {
  artwork_id: string;
  artist_id: string;
  title: string;
  slug: string;
  artist_slug: string;
  image_url: string;
  price: number;
  status: string;
  purchase_intent_score: number;
  reaction: 'like' | 'dislike' | null;
};

type ArtistRecommendation = Database['public']['Tables']['profiles']['Row'];

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
  const { viewedArtworks: recentlyViewedArtworks } = useRecentlyViewed();

  // Recommended / New Works
  const { data: recommendedArtworks, isLoading: recommendedLoading } = useQuery({
    queryKey: ['recommendedArtworks', user?.id],
    queryFn: async (): Promise<ArtworkRecommendation[]> => {
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_similar_artworks', { p_viewer_id: user.id, p_limit: 10 });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Rising talent
  const { data: risingArtists, isLoading: risingLoading } = useQuery({
    queryKey: ['risingArtists', user?.id],
    queryFn: async (): Promise<ArtistRecommendation[]> => {
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_rising_artists', { limit_count: 10 });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // "You seem interested in..." carousel
  const { data: interestedArtworks, isLoading: interestedLoading } = useQuery({
    queryKey: ['interestedArtworks', user?.id],
    queryFn: async (): Promise<ArtworkRecommendation[]> => {
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_collector_recommendations', { p_collector_id: user.id, p_limit: 10 });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Like / Dislike mutation
  const reactionMutation = useMutation({
    mutationFn: async ({ artwork_id, reaction_type }: { artwork_id: string; reaction_type: 'like' | 'dislike' }) => {
      if (!user) throw new Error('User not found');
      const { data, error } = await supabase
        .from('artwork_reactions')
        .upsert({
          collector_id: user.id,
          artwork_id,
          reaction_type,
          created_at: new Date().toISOString()
        }, { onConflict: ['collector_id', 'artwork_id'] })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries(['interestedArtworks', user?.id])
  });

  const handleReaction = (artwork_id: string, type: 'like' | 'dislike') => {
    reactionMutation.mutate({ artwork_id, reaction_type: type });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Collector Dashboard</h1>
      <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>
        Welcome, {profile?.full_name}!
      </p>

      {/* New Works for You */}
      <div className="widget">
        <h3>New Works for You</h3>
        {recommendedLoading ? <p>Loading...</p> : (
          <div className="horizontal-scroll-row">
            {recommendedArtworks.map(a => (
              <Link key={a.artwork_id} to={`/${a.artist_slug}/artwork/${a.slug}`} className="scroll-card">
                <StatusBadge status={a.status} />
                <img src={a.image_url || '/placeholder.png'} alt={a.title || 'Untitled'} />
                <p>{a.title}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* "You seem interested in..." */}
      <div className="widget">
        <h3>You seem interested in</h3>
        {interestedLoading ? <p>Loading...</p> : (
          <div className="horizontal-scroll-row">
            {interestedArtworks.map(a => (
              <div key={a.artwork_id} className="scroll-card">
                <StatusBadge status={a.status} />
                <Link to={`/${a.artist_slug}/artwork/${a.slug}`}>
                  <img src={a.image_url || '/placeholder.png'} alt={a.title || 'Untitled'} />
                  <p>{a.title}</p>
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '0.5rem' }}>
                  <button
                    className={`button button-like ${a.reaction === 'like' ? 'active' : ''}`}
                    onClick={() => handleReaction(a.artwork_id, 'like')}
                  >
                    👍
                  </button>
                  <button
                    className={`button button-dislike ${a.reaction === 'dislike' ? 'active' : ''}`}
                    onClick={() => handleReaction(a.artwork_id, 'dislike')}
                  >
                    👎
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently Viewed */}
      <div className="widget">
        <h3>Recently Viewed Artworks</h3>
        {recentlyViewedArtworks.length > 0 ? (
          <ul className="vertical-list">
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

      {/* Rising Talent */}
      <div className="widget">
        <h3>Rising Talent</h3>
        {risingLoading ? <p>Loading...</p> : (
          <div className="horizontal-scroll-row">
            {risingArtists.map(artist => (
              <Link key={artist.artist_id} to={`/${artist.artist_slug}`} className="scroll-card-artist">
                <img src={artist.avatar_url || '/placeholder.png'} alt={artist.full_name || 'Artist'} />
                <p>{artist.full_name}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectorDashboardPage;
