// src/pages/dashboard/collector/CollectorDashboardPage.tsx
import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { useRecentlyViewed, StoredArtwork } from '@/hooks/useRecentlyViewed';

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
  }}>{status}</div>
);

const CollectorDashboardPage = () => {
  const { profile, user } = useAuth();
  const { viewedArtworks: recentlyViewedArtworks } = useRecentlyViewed();

  const { data: learnedData, isLoading: learnedLoading } = useQuery({
    queryKey: ['collectorLearnedBehavior', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_collector_learned_behavior', { p_collector_id: user.id });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Example: artworks with high score for "You seem interested in"
  const recommendedArtworks = learnedData?.filter(a => a.total_score >= 5);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Collector Dashboard</h1>
      <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>
        Welcome, {profile?.full_name}!
      </p>

      {/* Recommended / Interest */}
      <div className="widget">
        <h3>You Seem Interested In</h3>
        {learnedLoading ? <p>Loading...</p> : (
          recommendedArtworks?.length ? (
            <div className="horizontal-scroll-row">
              {recommendedArtworks.map(art => (
                <Link key={art.artwork_id} to={`/${art.artist_id}/artwork/${art.artwork_id}`} className="scroll-card">
                  <StatusBadge status={art.status} />
                  <img src={art.image_url || '/placeholder.png'} alt="Artwork" />
                  <p>{art.title}</p>
                </Link>
              ))}
            </div>
          ) : <p style={{ color: 'var(--muted-foreground)' }}>We're still gathering data. Check back soon.</p>
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
        ) : <p style={{ color: 'var(--muted-foreground)' }}>No recently viewed artworks.</p>}
      </div>
    </div>
  );
};

export default CollectorDashboardPage;
