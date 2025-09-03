// src/pages/dashboard/collector/CollectorDashboardPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { useRecentlyViewed, StoredArtwork } from '@/hooks/useRecentlyViewed';
import ArtworkReactionButtons from '@/components/ui/ArtworkReactionButtons';
import { Map, Sparkles, TrendingUp } from 'lucide-react';
import '@/styles/app.css';

// Type definition for the output of RPC calls
type IntelligentRecommendation = {
  id: string; // Changed from artwork_id for consistency with RPC
  artist_id: string;
  title: string;
  slug: string;
  artist: { slug: string; }; // artist_slug is nested in the new RPC
  artwork_images: { image_url: string }[]; // image_url is nested in the new RPC
  price: number;
  status: string;
  reaction: 'like' | 'dislike' | null;
  recommendation_reason: string;
};

type ArtistRecommendation = {
    artist_id: string;
    artist_slug: string;
    full_name: string;
    avatar_url: string | null;
    engagement_score: number;
};

const StatusBadge = ({ status }: { status?: string }) => (
  <div className="artwork-card-status-badge">{status || 'Unknown'}</div>
);

const CollectorDashboardPage = () => {
  const { profile, user } = useAuth();
  const { viewedArtworks: recentlyViewedArtworks } = useRecentlyViewed();

  // --- Fetch Roadmap-driven AND Behavioral recommendations in one call ---
  const { data: personalizedRecommendations, isLoading: loadingPersonalizedRecs } = useQuery<IntelligentRecommendation[]>({
    queryKey: ['personalizedRecommendations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_personalized_artworks', {
          p_collector_id: user.id,
          p_limit: 20, // Fetch a larger pool to split between sections
          p_offset: 0
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // --- Rising Talent ---
  const { data: risingArtists, isLoading: risingLoading } = useQuery<ArtistRecommendation[]>({
    queryKey: ['risingArtists'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_rising_artists', { limit_count: 10 });
      if (error) throw error;
      return data || [];
    },
  });

  const isLoadingCombined = loadingPersonalizedRecs || risingLoading;

  // Split the personalized recommendations into Roadmap and Behavioral
  const roadmapRecommendations = personalizedRecommendations?.filter(rec => rec.recommendation_reason === 'Matches your collection roadmap') || [];
  const behavioralRecommendations = personalizedRecommendations?.filter(rec => rec.recommendation_reason !== 'Matches your collection roadmap') || [];

  const fallbackMessage = "We're still learning your preferences. Create a Collection Roadmap or interact with art to get personalized recommendations!";

  return (
    <div className="page-container">
      <h1>Collector Dashboard</h1>
      <p className="page-subtitle">Welcome, {profile?.full_name || 'Collector'}!</p>

      {/* --- Roadmap Recommendations Section --- */}
      {roadmapRecommendations.length > 0 && (
          <div className="widget">
            <div className="flex justify-between items-center">
                <h3 className="flex items-center gap-2"><Map size={20}/> For Your Roadmap</h3>
                <Link to="/u/roadmap" className="button button-secondary button-sm">Edit Roadmap</Link>
            </div>
            <div className="horizontal-scroll-row mt-4">
              {roadmapRecommendations.map(a => (
                <div key={a.id} className="scroll-card">
                  <StatusBadge status={a.status} />
                  <Link to={`/${a.artist.slug}/artwork/${a.slug}`}>
                    <img src={a.artwork_images?.[0]?.image_url || '/placeholder.png'} alt={a.title || 'Untitled'} />
                    <p>{a.title}</p>
                  </Link>
                  <ArtworkReactionButtons artworkId={a.id} initialReaction={a.reaction} />
                </div>
              ))}
            </div>
          </div>
      )}

      {/* Behavioral "You Might Also Like" carousel */}
      <div className="widget">
        <h3 className="flex items-center gap-2"><Sparkles size={20} /> You Might Also Like</h3>
        {isLoadingCombined ? <p className="loading-message">Loading recommendations...</p> : (
          behavioralRecommendations.length > 0 ? (
            <div className="horizontal-scroll-row mt-4">
              {behavioralRecommendations.map(a => (
                <div key={a.id} className="scroll-card">
                  <StatusBadge status={a.status} />
                   <Link to={`/${a.artist.slug}/artwork/${a.slug}`}>
                    <img src={a.artwork_images?.[0]?.image_url || '/placeholder.png'} alt={a.title || 'Untitled'} />
                    <p>{a.title}</p>
                  </Link>
                  <ArtworkReactionButtons artworkId={a.id} initialReaction={a.reaction} />
                </div>
              ))}
            </div>
          ) : <p className="text-muted-foreground mt-4">{fallbackMessage}</p>
        )}
      </div>

      {/* Recently Viewed */}
      <div className="widget">
        <h3>Recently Viewed Artworks</h3>
        {recentlyViewedArtworks.length > 0 ? (
          <div className="horizontal-scroll-row mt-4">
            {recentlyViewedArtworks.map((art: StoredArtwork) => (
              <Link key={art.id} to={`/${art.artist_slug}/artwork/${art.slug}`} className="scroll-card">
                <img src={art.image_url || '/placeholder.png'} alt={art.title || "Untitled"} />
                <p>{art.title}</p>
              </Link>
            ))}
          </div>
        ) : <p className="text-muted-foreground mt-4">No recently viewed artworks.</p>}
      </div>

      {/* Rising Talent */}
      <div className="widget">
        <h3 className="flex items-center gap-2"><TrendingUp size={20} /> Rising Talent</h3>
        {risingLoading ? <p className="loading-message">Discovering new artists...</p> : (
          risingArtists && risingArtists.length > 0 ? (
            <div className="horizontal-scroll-row mt-4">
              {risingArtists.map(artist => (
                <Link key={artist.artist_id} to={`/${artist.artist_slug}`} className="scroll-card-artist">
                  <img src={artist.avatar_url || '/placeholder.png'} alt={artist.full_name || 'Artist'} />
                  <p>{artist.full_name}</p>
                </Link>
              ))}
            </div>
          ) : <p className="text-muted-foreground mt-4">No rising talent to display yet.</p>
        )}
      </div>
    </div>
  );
};

export default CollectorDashboardPage;