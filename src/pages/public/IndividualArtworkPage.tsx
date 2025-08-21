// src/pages/public/IndividualArtworkPage.tsx

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import InquiryModal from '../../components/public/InquiryModal';
import { useQuery } from '@tanstack/react-query';

// --- TYPE DEFINITIONS ---
interface ArtworkDetails {
  id: string; user_id: string; title: string; description: string | null; image_url: string;
  price: number | null; status: string; is_price_negotiable: boolean;
  medium: string | null;
  dimensions: { height?: string; width?: string; depth?: string; unit?: string; } | null;
  date_info: { year?: string; } | null;
  signature_info: { is_signed?: boolean; } | null;
  is_framed: boolean;
  edition_info: { is_edition?: boolean; number?: number; size?: number } | null;
  provenance: string | null;
  profile_full_name: string;
  profile_slug: string;
  profile_bio: string | null;
}
interface RelatedArtwork {
    id: string; title: string; image_url: string; slug: string; profile_slug: string;
}

// --- API FUNCTIONS ---
const fetchArtworkDetails = async (artworkSlug: string) => {
    const { data, error } = await supabase.rpc('get_artwork_details', { p_artwork_slug: artworkSlug }).single();
    if (error) throw new Error("Artwork not found.");
    return data as ArtworkDetails;
};

const fetchRelatedArtworks = async (artworkId: string, artistId: string) => {
    const { data, error } = await supabase.rpc('get_related_artworks', { p_current_artwork_id: artworkId, p_artist_id: artistId, p_limit: 5 });
    if (error) { console.warn("Could not fetch related artworks:", error); return []; }
    return data as RelatedArtwork[];
};

// --- HELPER COMPONENTS & FUNCTIONS ---
const postToPayfast = (formData: Record<string, any>) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://www.payfast.co.za/eng/process';
  for (const key in formData) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = formData[key];
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

const formatValue = (value: any, fallback = 'Not specified') => value || fallback;

const RelatedArtworksSection = ({ artworkId, artistId }: { artworkId: string; artistId: string }) => {
    const { data: relatedArtworks, isLoading } = useQuery({
        queryKey: ['relatedArtworks', artworkId],
        queryFn: () => fetchRelatedArtworks(artworkId, artistId),
    });
    if (isLoading || !relatedArtworks || relatedArtworks.length === 0) return null;

    return (
        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <h2>More from this Artist</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                {relatedArtworks.map(art => (
                    <Link to={`/artwork/${art.profile_slug}/${art.slug}`} key={art.id} style={{textDecoration: 'none', color: 'inherit'}}>
                        <img src={art.image_url} alt={art.title} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 'var(--radius)' }} />
                        <h4 style={{marginTop: '0.5rem'}}>{art.title}</h4>
                    </Link>
                ))}
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const IndividualArtworkPage = () => {
  const { artworkSlug } = useParams<{ artworkSlug: string }>(); 
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  const { data: artwork, isLoading, isError, error } = useQuery({
      queryKey: ['artwork', artworkSlug],
      queryFn: () => fetchArtworkDetails(artworkSlug!),
      enabled: !!artworkSlug,
      retry: false,
  });

  const handleBuyNow = async () => {
      if (!artwork) return;
      setIsBuying(true);
      try {
          const { data, error: invokeError } = await supabase.functions.invoke('generate-payfast-form', {
              body: { artworkId: artwork.id },
          });
          if (invokeError) throw new Error(invokeError.message);
          postToPayfast(data);
      } catch (err: any) {
          alert(`Error preparing for payment: ${err.message}`);
          setIsBuying(false);
      }
  };

  if (isLoading) return <div style={{padding: '4rem', textAlign: 'center'}}>Loading artwork...</div>;
  if (isError) return <div style={{padding: '4rem', textAlign: 'center'}}>Error: {error instanceof Error ? error.message : 'An unknown error occurred.'}</div>;
  if (!artwork) return <div style={{padding: '4rem', textAlign: 'center'}}>Artwork not found.</div>;
  
  const isOwner = user?.id === artwork.user_id;
  const canBePurchased = artwork.status === 'Active' && artwork.price && !artwork.is_price_negotiable;

  return (
    <>
      {isModalOpen && <InquiryModal artworkId={artwork.id} onClose={() => setIsModalOpen(false)} />}
      
      <div className="container" style={{ maxWidth: '1200px', margin: '4rem auto', padding: '0 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4rem', alignItems: 'start' }}>
          
          <div style={{ gridColumn: '1 / 4' }}>
            <img src={artwork.image_url} alt={artwork.title} style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
          </div>

          <aside style={{ gridColumn: '4 / 6', position: 'sticky', top: '4rem' }}>
            <h1>{artwork.title}</h1>
            <Link to={`/${artwork.profile_slug}`} style={{fontSize: '1.2rem', color: 'var(--muted-foreground)', textDecoration: 'none'}}>
              {artwork.profile_full_name}
            </Link>

            <div style={{ margin: '2rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                <p><strong>Year:</strong> {formatValue(artwork.date_info?.year)}</p>
                <p><strong>Medium:</strong> {formatValue(artwork.medium)}</p>
                <p><strong>Dimensions:</strong> {artwork.dimensions ? `${artwork.dimensions.height || '?'}h x ${artwork.dimensions.width || '?'}w ${artwork.dimensions.depth ? `x ${artwork.dimensions.depth}d` : ''} ${artwork.dimensions.unit || ''}` : 'Not specified'}</p>
                <p><strong>Framing:</strong> {artwork.is_framed ? 'Included' : 'Not Included'}</p>
                <p><strong>Signature:</strong> {artwork.signature_info?.is_signed ? 'Signed by artist' : 'Not signed'}</p>
                <p><strong>Edition:</strong> {artwork.edition_info?.is_edition ? `Yes, ${artwork.edition_info.number || ''} of ${artwork.edition_info.size || ''}` : 'Unique work'}</p>
                {artwork.provenance && <p><strong>Provenance:</strong> {artwork.provenance}</p>}
            </div>

            <h3 style={{fontSize: '1.5rem', fontWeight: 600}}>{artwork.price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(artwork.price) : 'Contact for price'}</h3>
            
            {!isOwner && (
              <div style={{ width: '100%', marginTop: '2rem' }}>
                {canBePurchased ? (
                  <button onClick={handleBuyNow} className="button button-primary" style={{ width: '100%', padding: '1rem' }} disabled={isBuying}>
                    {isBuying ? 'Redirecting to Payment...' : 'Buy Now'}
                  </button>
                ) : (
                  <button onClick={() => setIsModalOpen(true)} className="button button-primary" style={{ width: '100%', padding: '1rem' }}>
                    Enquire About This Artwork
                  </button>
                )}
              </div>
            )}
          </aside>

          <div style={{ gridColumn: '1 / 4', marginTop: '2rem' }}>
            {artwork.description && (
                <div style={{marginBottom: '3rem'}}>
                    <h2>About the work</h2>
                    <p style={{whiteSpace: 'pre-wrap', lineHeight: 1.6}}>{artwork.description}</p>
                </div>
            )}
            {artwork.profile_bio && (
                 <div>
                    <h2>About the artist</h2>
                    <p style={{whiteSpace: 'pre-wrap', lineHeight: 1.6}}>{artwork.profile_bio}</p>
                    <Link to={`/${artwork.profile_slug}`} className="button-secondary button" style={{marginTop: '1rem'}}>View Artist Profile</Link>
                </div>
            )}
            
            <RelatedArtworksSection artworkId={artwork.id} artistId={artwork.user_id} />
          </div>
        </div>
      </div>
    </>
  );
};

export default IndividualArtworkPage;