// src/pages/dashboard/collector/CollectorFavoritesPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';

interface Artist {
  id: string;
  full_name: string;
  artist_slug: string;
  avatar_url?: string | null;
}

interface Artwork {
  id: string;
  title: string;
  slug: string;
  artist_slug: string;
  image_url?: string | null;
  status?: string;
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

const CollectorFavoritesPage = () => {
  const { user } = useAuth();

  // Followed artists
  const { data: followedArtists, isLoading: loadingArtists } = useQuery({
    queryKey: ['followedArtists', user?.id],
    queryFn: async (): Promise<Artist[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from('artist_follows')
        .select('artist:artist_id(id, full_name, artist_slug, avatar_url)')
        .eq('follower_id', user.id);
      return data?.map(d => d.artist) || [];
    },
    enabled: !!user
  });

  // Liked artworks
  const { data: likedArtworks, isLoading: loadingArtworks } = useQuery({
    queryKey: ['likedArtworks', user?.id],
    queryFn: async (): Promise<Artwork[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from('artwork_likes')
        .select('artwork:artwork_id(id, title, slug, artist_slug, image_url, status)')
        .eq('collector_id', user.id);
      return data?.map(d => d.artwork) || [];
    },
    enabled: !!user
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Your Favorites</h1>
      <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>
        Track the artists you follow and artworks you've saved.
      </p>

      {/* Followed Artists */}
      <div className="widget">
        <h3>Artists You Follow</h3>
        {loadingArtists ? <p>Loading...</p> : (
          followedArtists.length > 0 ? (
            <div className="horizontal-scroll-row">
              {followedArtists.map(artist => (
                <Link key={artist.id} to={`/${artist.artist_slug}`} className="scroll-card-artist">
                  <img src={artist.avatar_url || '/placeholder.png'} alt={artist.full_name} />
                  <p>{artist.full_name}</p>
                </Link>
              ))}
            </div>
          ) : <p style={{ color: 'var(--muted-foreground)' }}>You're not following any artists yet.</p>
        )}
      </div>

      {/* Liked Artworks */}
      <div className="widget">
        <h3>Artworks You've Liked</h3>
        {loadingArtworks ? <p>Loading...</p> : (
          likedArtworks.length > 0 ? (
            <div className="horizontal-scroll-row">
              {likedArtworks.map(art => (
                <Link key={art.id} to={`/${art.artist_slug}/artwork/${art.slug}`} className="scroll-card">
                  <StatusBadge status={art.status} />
                  <img src={art.image_url || '/placeholder.png'} alt={art.title || 'Untitled'} />
                  <p>{art.title}</p>
                </Link>
              ))}
            </div>
          ) : <p style={{ color: 'var(--muted-foreground)' }}>You haven't liked or saved any artworks yet.</p>
        )}
      </div>
    </div>
  );
};

export default CollectorFavoritesPage;
