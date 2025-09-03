// src/pages/public/IndividualArtworkPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { supabase } from '@/lib/supabaseClient';
import InquiryModal from '@/components/public/InquiryModal';
import ShareModal from '@/components/public/ShareModal';
import VisualizationModal from '@/components/public/VisualizationModal';

// Import directly exported Row types and JSONB types from database.types.ts
import { ArtworkRow, ArtworkImageRow, ProfileRow, DimensionsJson, FramingInfoJson, SignatureInfoJson, DateInfoJson, HistoricalEntryJson, LocationJson } from '@/types/database.types';
import { v4 as uuidv4 } from 'uuid'; // For similar artworks mapping

import { Share2, Eye, Heart, ShoppingBag, Camera } from 'lucide-react';
import '@/styles/app.css';

// --- APPLICATION-SPECIFIC TYPES (Defined here as app.types.ts is absent) ---
// These are interfaces for the data structure after Supabase joins are applied.

// Profile type, potentially with additional app-specific fields or relations
export interface AppProfile extends ProfileRow {
  // Add any specific relations or computed fields you might fetch with profiles
}

// AppArtwork: Extends the raw ArtworkRow with common joined relations
export interface AppArtwork extends ArtworkRow {
  artist?: AppProfile | null; // Joined artist profile data
  artwork_images?: AppArtworkImage[]; // Joined artwork images
  // Add any other specific joined relations (e.g., 'catalogues', 'tags' etc.)
}

// AppArtworkImage: Extends the raw ArtworkImageRow
export interface AppArtworkImage extends ArtworkImageRow {
  // If artwork_images ever has further joined data, add it here.
}


// --- TYPE DEFINITIONS for RPCs ---
interface ArtworkInsights {
  view_count_wow: number; // wow = week-over-week
  list_add_count: number;
}


// --- DATA FETCHING ---
const fetchArtworkBySlug = async (slug: string): Promise<AppArtwork> => {
    const { data, error } = await supabase
        .from('artworks')
        .select(`
            *,
            artist:profiles!user_id ( id, full_name, slug ),
            artwork_images ( id, image_url, watermarked_image_url, visualization_image_url, is_primary )
        `)
        .eq('slug', slug)
        .single();

    if (error) throw new Error(error.message);

    // Filter and ensure primary image is first for consistency
    if (data?.artwork_images) {
        data.artwork_images = data.artwork_images.sort((a, b) => {
            if (a.is_primary && !b.is_primary) return -1;
            if (!a.is_primary && b.is_primary) return 1;
            return 0;
        });
    }

    // Explicitly cast to AppArtwork, ensuring all base ArtworkRow fields are present or null/undefined
    const baseArtwork: ArtworkRow = {
      id: data?.id || uuidv4(), // Fallback if data?.id is somehow missing
      user_id: data?.user_id || '', // Must be present
      created_at: data?.created_at || null,
      updated_at: data?.updated_at || null,
      slug: data?.slug || null,
      title: data?.title || null,
      description: data?.description || null,
      price: data?.price || null,
      status: data?.status || 'available', // Provide a default if possible
      is_price_negotiable: data?.is_price_negotiable || null,
      min_price: data?.min_price || null,
      max_price: data?.max_price || null,
      dimensions: data?.dimensions || null,
      location: data?.location || null,
      medium: data?.medium || null,
      date_info: data?.date_info || null,
      signature_info: data?.signature_info || null,
      framing_info: data?.framing_info || null,
      provenance: data?.provenance || null,
      currency: data?.currency || null,
      edition_info: data?.edition_info || null,
      genre: data?.genre || null,
      dominant_colors: data?.dominant_colors || null,
      keywords: data?.keywords || null,
      subject: data?.subject || null,
      orientation: data?.orientation || null,
      inventory_number: data?.inventory_number || null,
      private_note: data?.private_note || null,
      provenance_notes: data?.provenance_notes || null,
      exhibitions: data?.exhibitions || null,
      literature: data?.literature || null,
      has_certificate_of_authenticity: data?.has_certificate_of_authenticity || null,
      certificate_of_authenticity_details: data?.certificate_of_authenticity_details || null,
      condition: data?.condition || null,
      rarity: data?.rarity || null,
      framing_status: data?.framing_status || null,
      primary_image_url: data?.primary_image_url || null,
      embedding: data?.embedding || null,
      // Any other fields that are part of ArtworkRow must be explicitly mapped or defaulted
      // e.g. condition_notes
      condition_notes: data?.condition_notes || null,
    };
    
    // Construct the AppArtwork object with relations
    const appArtwork: AppArtwork = {
        ...baseArtwork,
        artist: data?.artist as AppProfile | null,
        artwork_images: data?.artwork_images as AppArtworkImage[] | undefined,
    };

    return appArtwork;
};


const fetchArtworkInsights = async (artworkId: string): Promise<ArtworkInsights> => {
    const { data, error } = await supabase.rpc('get_artwork_insights', { p_artwork_id: artworkId });
    if (error) { console.error("Error fetching insights:", error); return { view_count_wow: 0, list_add_count: 0 }; }
    return data;
};

const fetchSimilarArtworks = async (artworkId: string): Promise<AppArtwork[]> => {
    const { data, error } = await supabase.rpc('get_vector_similar_artworks', {
        p_artwork_id: artworkId,
        p_match_count: 4
    });
    if (error) { console.error("Error fetching similar artworks:", error); return []; }
    // The RPC returns { id, title, image_url, slug, artist_id, artist_full_name, artist_slug }
    // We need to map it to AppArtwork structure, providing defaults for ArtworkRow fields
    return (data || []).map(art => ({
        id: art.id,
        user_id: art.artist_id, // Assuming artist_id from RPC maps to user_id
        created_at: null, updated_at: null, price: null, currency: null,
        medium: null, description: null, status: 'available', // Default status
        is_price_negotiable: null, min_price: null, max_price: null,
        dimensions: null, location: null, date_info: null, signature_info: null,
        framing_info: null, provenance: null, edition_info: null, genre: null,
        dominant_colors: null, keywords: null, subject: null, orientation: null,
        inventory_number: null, private_note: null, provenance_notes: null,
        exhibitions: null, literature: null, has_certificate_of_authenticity: null,
        certificate_of_authenticity_details: null, condition: null, rarity: null,
        framing_status: null, primary_image_url: art.image_url, embedding: null,
        condition_notes: null, // Add missing field

        slug: art.slug,
        title: art.title,
        artwork_images: [{
          id: uuidv4(),
          artwork_id: art.id,
          image_url: art.image_url,
          watermarked_image_url: null, visualization_image_url: null,
          position: 0, is_primary: true, created_at: null, updated_at: null
        }],
        artist: { id: art.artist_id, full_name: art.artist_full_name, slug: art.artist_slug }
    })) as AppArtwork[];
};

// --- MAIN COMPONENT ---
const IndividualArtworkPage = () => {
  const { artworkSlug } = useParams<{ artworkSlug: string }>();
  const { addArtwork } = useRecentlyViewed();
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVisualizationModal, setShowVisualizationModal] = useState(false);
  
  const { data: artwork, isLoading, isError, error } = useQuery<AppArtwork, Error>({
    queryKey: ['artwork', artworkSlug],
    queryFn: () => fetchArtworkBySlug(artworkSlug!),
    enabled: !!artworkSlug,
  });

  const { data: insights } = useQuery<ArtworkInsights, Error>({
    queryKey: ['artworkInsights', artwork?.id],
    queryFn: () => fetchArtworkInsights(artwork!.id),
    enabled: !!artwork,
  });
  const { data: similarArtworks } = useQuery<AppArtwork[], Error>({
    queryKey: ['similarArtworks', artwork?.id],
    queryFn: () => fetchSimilarArtworks(artwork!.id),
    enabled: !!artwork,
  });

  useEffect(() => {
    if (artwork) addArtwork(artwork);
  }, [artwork, addArtwork]);

  useEffect(() => {
    const isModalOpen = showInquiryModal || showShareModal || showVisualizationModal;
    document.body.style.overflow = isModalOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [showInquiryModal, showShareModal, showVisualizationModal]);

  if (isLoading) return <div className="page-container"><p className="loading-message">Loading Artwork...</p></div>;
  if (isError || !artwork) return <div className="page-container text-center py-8"><h1 className="page-title text-red-500">Artwork Not Found</h1></div>;

  const firstImage = artwork.artwork_images?.[0];
  const imageUrlForDisplay = firstImage?.watermarked_image_url || firstImage?.image_url || 'https://placehold.co/800x800?text=No+Image';
  const visualizationImageUrl = firstImage?.visualization_image_url;
  const artist = artwork.artist;

  // Formatting location (artwork.location is TEXT, assuming it stores JSON string)
  let formattedLocation = 'Not specified';
  try {
    if (artwork.location) {
      const locationData = JSON.parse(artwork.location) as LocationJson;
      formattedLocation = [locationData.city, locationData.country].filter(Boolean).join(', ');
    }
  } catch (e) {
    console.error("Error parsing artwork location JSON:", e);
  }

  // Formatting dimensions
  const dimensions = artwork.dimensions;
  const formattedDimensions = dimensions ? (
    `${dimensions.height || '?'} x ${dimensions.width || '?'} ${dimensions.depth ? `x ${dimensions.depth}` : ''} ${dimensions.unit || 'cm'}`
  ) : 'Dimensions not available';

  // Formatting framing info
  const framingInfo = artwork.framing_info;
  const framingStatusText = artwork.framing_status ? artwork.framing_status.replace(/_/g, ' ') : 'Not specified';
  const framingDetailsText = artwork.framing_status === 'framed' && framingInfo?.details ? `: ${framingInfo.details}` : '';

  // Formatting signature info
  const signatureInfo = artwork.signature_info;
  const signatureText = signatureInfo?.is_signed ? `Signed (${signatureInfo.location || 'location not specified'})` : 'Not signed';

  return (
    <>
      <div className="page-container">
        <div className="artwork-layout-grid">
          <div className="artwork-image-column">
            <img src={imageUrlForDisplay} alt={artwork.title || ''} className="main-artwork-image" />
            {visualizationImageUrl ? (
              <button onClick={() => setShowVisualizationModal(true)} className="button button-secondary view-in-room-button">
                <Camera size={16} /> View in a Room
              </button>
            ) : (
              <button disabled className="button button-secondary view-in-room-button opacity-50 cursor-not-allowed">
                <Camera size={16} /> View in a Room (Generating...)
              </button>
            )}
          </div>
          <div className="artwork-main-info">
            {artist && <h1 className="artist-name"><Link to={`/u/${artist.slug}`} className="artist-link">{artist.full_name}</Link></h1>}
            <h2 className="artwork-title-italic">{artwork.title}</h2>
            {insights && (insights.view_count_wow > 5 || insights.list_add_count > 0) && (
              <div className="collector-insights-banner">
                {insights.view_count_wow > 5 && <span><Eye size={16}/> 🔥 Viewed by <b>{insights.view_count_wow} people</b> this week</span>}
                {insights.list_add_count > 0 && <span><Heart size={16}/> ❤️ Added to <b>{insights.list_add_count} collector lists</b></span>}
              </div>
            )}
            <div className="price-container">
              <p className="artwork-price">{artwork.price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: artwork.currency || 'USD' }).format(artwork.price) : 'Price on Request'}</p>
            </div>
            <div className="artwork-actions">
              <button onClick={() => setShowInquiryModal(true)} className="button button-primary"><ShoppingBag size={16}/> Inquire</button>
              <button onClick={() => setShowShareModal(true)} className="button button-secondary"><Share2 size={16} /> Share</button>
            </div>

            <div className="details-section">
              <h3>Details</h3>
              <p><strong>Medium:</strong> {artwork.medium || 'Not specified'}</p>
              <p><strong>Dimensions:</strong> {formattedDimensions}</p>
              <p><strong>Date:</strong> {artwork.date_info?.date_value || (artwork.date_info?.start_date && artwork.date_info?.end_date) ? `${artwork.date_info.start_date}-${artwork.date_info.end_date}` : 'Not specified'}</p>
              <p><strong>Rarity:</strong> {artwork.rarity ? artwork.rarity.replace(/_/g, ' ') : 'Not specified'}</p>
              <p><strong>Framing:</strong> {framingStatusText}{framingDetailsText}</p>
              <p><strong>Signature:</strong> {signatureText}</p>
              {artwork.condition && <p><strong>Condition:</strong> {artwork.condition}</p>}
              {artwork.has_certificate_of_authenticity && <p><strong>CoA:</strong> Yes{artwork.certificate_of_authenticity_details && `: ${artwork.certificate_of_authenticity_details}`}</p>}
              {artwork.location && <p><strong>Location:</strong> {formattedLocation}</p>}
              {artwork.genre && <p><strong>Genre:</strong> {artwork.genre}</p>}
              {artwork.subject && <p><strong>Subject:</strong> {artwork.subject}</p>}
              {artwork.orientation && <p><strong>Orientation:</strong> {artwork.orientation}</p>}
              {artwork.dominant_colors && artwork.dominant_colors.length > 0 && (
                <p className="flex items-center gap-2">
                  <strong>Dominant Colors:</strong>
                  {artwork.dominant_colors.map((color, index) => (
                    <span key={index} className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: color }}></span>
                  ))}
                </p>
              )}
              {artwork.keywords && artwork.keywords.length > 0 && (
                <p>
                  <strong>Keywords:</strong> {artwork.keywords.join(', ')}
                </p>
              )}
            </div>

            <div className="provenance-section">
              <h3>Provenance</h3>
              <p>{artwork.provenance || 'Provenance not available.'}</p>
              {artwork.provenance_notes && <p className="text-sm text-gray-600">{artwork.provenance_notes}</p>}
            </div>

            {artwork.exhibitions && artwork.exhibitions.length > 0 && (
              <div className="exhibitions-section">
                <h3>Exhibitions</h3>
                <ul>
                  {artwork.exhibitions.map((entry, index) => (
                    <li key={index}>{entry.year}: {entry.description}</li>
                  ))}
                </ul>
              </div>
            )}

            {artwork.literature && artwork.literature.length > 0 && (
              <div className="literature-section">
                <h3>Literature</h3>
                <ul>
                  {artwork.literature.map((entry, index) => (
                    <li key={index}>{entry.year}: {entry.description}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        {similarArtworks && similarArtworks.length > 0 && (
          <div className="related-artworks-section">
            <h3>You Might Also Like</h3>
            <p className="section-description">Discover visually and conceptually similar works from other artists.</p>
            <div className="related-artworks-list">
              {similarArtworks.map((art) => {
                const imageUrl = art.artwork_images?.[0]?.image_url || 'https://placehold.co/400x400?text=No+Image';
                if (!art.slug || !art.artist?.slug) return null;
                return (
                  <Link to={`/u/${art.artist.slug}/artwork/${art.slug}`} key={art.id} className="artwork-card-link">
                    <div className="artwork-card">
                      <img src={imageUrl} alt={art.title || ''} className="artwork-card-image" />
                      <div className="artwork-card-info">
                        <h4 className="artwork-card-title-italic">{art.title}</h4>
                        <p className="artwork-card-artist text-sm">{art.artist.full_name}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {artwork && (
        <>
          <InquiryModal
            isOpen={showInquiryModal}
            onClose={() => setShowInquiryModal(false)}
            artwork={artwork}
          />
          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            artwork={artwork}
            shareUrl={window.location.href}
          />
          {visualizationImageUrl && (
            <VisualizationModal
              isOpen={showVisualizationModal}
              onClose={() => setShowVisualizationModal(false)}
              imageUrl={visualizationImageUrl}
              artworkTitle={artwork.title || 'Untitled'}
            />
          )}
        </>
      )}
    </>
  );
};

export default IndividualArtworkPage;