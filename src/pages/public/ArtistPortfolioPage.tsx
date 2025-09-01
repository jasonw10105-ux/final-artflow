// src/pages/public/ArtistPortfolioPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft, MapPin, BadgeCheck } from 'lucide-react';
import InquiryModal from '../../components/public/InquiryModal';
import { useAuth } from '../../contexts/AuthProvider';

const fetchArtistPortfolio = async (slug: string) => {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, bio, short_bio, location, slug, avatar_url')
    .eq('slug', slug)
    .single();

  if (profileError || !profile) throw new Error('Artist not found');

  const { data: artworks, error: artworksError } = await supabase
    .from('artworks')
    .select('id, title, image_url, slug, price, currency, created_at, status')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  if (artworksError) throw new Error('Could not fetch artworks');

  supabase.rpc('log_profile_view', { p_artist_id: profile.id }).then();

  return { profile, artworks: artworks || [] };
};

type ArtworkForModal = {
  id: string;
  title: string | null;
  image_url: string | null;
};

const ArtistPortfolioPage = () => {
  const { profileSlug } = useParams<{ profileSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile: currentUserProfile } = useAuth();
  const [inquiryArtwork, setInquiryArtwork] = useState<ArtworkForModal | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['artistPortfolio', profileSlug],
    queryFn: () => fetchArtistPortfolio(profileSlug!),
    enabled: !!profileSlug,
  });

  const [filter, setFilter] = useState<'All' | 'Available' | 'Sold'>('All');

  const showBackButton = location.state?.from === '/artists';
  const isOwner = currentUserProfile?.id === data?.profile?.id;

  if (isLoading) {
    return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading Artist Portfolio...</p>;
  }
  if (isError || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <h1>404 - Artist Not Found</h1>
        <p>The artist you are looking for does not exist or has moved.</p>
        <Link to="/artists" className="button button-primary">
          Browse Artists
        </Link>
      </div>
    );
  }

  const { profile, artworks } = data;

  const filteredArtworks = artworks.filter((art) => {
    if (filter === 'All') return true;
    return art.status === filter;
  });

  const formatLocation = (loc: any) => {
    if (!loc) return null;
    if (typeof loc === 'string') return loc;
    const parts = [loc.city, loc.country].filter(Boolean);
    return parts.join(', ');
  };
  const locationString = formatLocation(profile.location);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {showBackButton && (
        <button
          onClick={() => navigate('/artists')}
          className="button button-secondary"
          style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={16} /> All Artists
        </button>
      )}

      {/* Artist Header */}
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <img
          src={profile.avatar_url || 'https://placehold.co/128x128'}
          alt={profile.full_name || ''}
          style={{
            width: '128px',
            height: '128px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid var(--border)',
            margin: '0 auto',
          }}
        />
        <h1 style={{ fontSize: '2.5rem', marginTop: '1.5rem' }}>{profile.full_name}</h1>

        {locationString && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--muted-foreground)',
              marginTop: '0.5rem',
            }}
          >
            <MapPin size={16} />
            <span>{locationString}</span>
          </div>
        )}

        <p
          style={{
            fontSize: '1.1rem',
            color: 'var(--muted-foreground)',
            marginTop: '1rem',
            maxWidth: '800px',
            margin: '1rem auto',
          }}
        >
          {profile.short_bio || profile.bio}
        </p>
      </header>

      {profile.bio && (
        <div className="artwork-details-section">
          <h3>About the Artist</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{profile.bio}</p>
        </div>
      )}

      {/* Filter Controls */}
      <div style={{ textAlign: 'center', margin: '2rem 0' }}>
        <div style={{ display: 'inline-flex', gap: '1rem' }}>
          {['All', 'Available', 'Sold'].map((f) => (
            <button
              key={f}
              className={`button ${filter === f ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setFilter(f as typeof filter)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Artwork Grid */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '2rem',
          marginTop: '2rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '2rem',
          }}
        >
          {filteredArtworks.map((art) => (
            <div
              key={art.id}
              style={{
                background: 'var(--card)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border)',
                position: 'relative',
              }}
            >
              <Link to={`/${profile.slug}/artwork/${art.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <img
                  src={art.image_url || 'https://placehold.co/600x400'}
                  alt={art.title || ''}
                  style={{ width: '100%', height: '250px', objectFit: 'cover' }}
                />
                {art.status === 'Sold' && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      background: 'rgba(255,0,0,0.8)',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                    }}
                  >
                    Sold
                  </span>
                )}
                <div style={{ padding: '1rem' }}>
                  <h4 style={{ fontWeight: 600, fontStyle: 'italic' }}>{art.title || 'Untitled'}</h4>
                  <p style={{ fontWeight: 'bold', marginTop: '0.5rem' }}>
                    {art.price
                      ? new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: art.currency || 'USD',
                        }).format(art.price)
                      : 'Price on request'}
                  </p>
                </div>
              </Link>
              {!isOwner && art.status === 'Available' && (
                <div style={{ padding: '0 1rem 1rem', marginTop: 'auto' }}>
                  <button
                    className="button button-secondary"
                    style={{ width: '100%' }}
                    onClick={() => setInquiryArtwork(art as ArtworkForModal)}
                  >
                    Inquire
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {filteredArtworks.length === 0 && (
        <p
          style={{
            textAlign: 'center',
            color: 'var(--muted-foreground)',
            padding: '3rem',
            background: 'var(--card)',
            borderRadius: 'var(--radius)',
            marginTop: '2rem',
          }}
        >
          No artworks match this filter.
        </p>
      )}

      {inquiryArtwork && (
        <InquiryModal
          artworkId={inquiryArtwork.id}
          onClose={() => setInquiryArtwork(null)}
          previewImageUrl={inquiryArtwork.image_url || undefined}
          previewTitle={inquiryArtwork.title || undefined}
        />
      )}
    </div>
  );
};

export default ArtistPortfolioPage;
