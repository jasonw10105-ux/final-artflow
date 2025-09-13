import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthProvider';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { supabase } from '@/lib/supabaseClient';
import InquiryModal from '@/components/public/InquiryModal';
import ShareModal from '@/components/public/ShareModal';
import VisualizationModal from '@/components/public/VisualizationModal';

// Import all necessary types from app.types and database.types
import { AppArtwork, AppArtworkImage, AppProfile } from '@/types/app.types';
import { apiGet } from '@/lib/api';
import { DimensionsJson, FramingInfoJson, SignatureInfoJson, DateInfoJson, HistoricalEntryJson, LocationJson } from '@/types/database.types';

import { Share2, Eye, Heart, ShoppingBag, Camera, Edit3, ArrowLeft, UserPlus } from 'lucide-react';
import '@/styles/app.css';
import SeoHelmet from '../../components/SeoHelmet'; // Import SeoHelmet
import { v4 as uuidv4 } from 'uuid'; // For generating IDs for RPC images

// --- TYPE DEFINITIONS for RPCs ---
interface ArtworkInsights {
  view_count_wow: number; // wow = week-over-week
  list_add_count: number;
}

// NOTE: The previous `OtherArtworkResult` was not used. `AppArtwork` is used for similar artworks.

// --- DATA FETCHING ---
const fetchArtworkBySlug = async (slug: string): Promise<AppArtwork> => {
    const { data, error } = await supabase
        .from('artworks')
        .select(`
            id, user_id, created_at, updated_at, slug, title, description,
            price, status, is_price_negotiable, min_price, max_price, dimensions,
            location, medium, date_info, signature_info, framing_info, provenance,
            currency, edition_info, genre, dominant_colors, keywords, subject,
            orientation, inventory_number, private_note, provenance_notes,
            exhibitions, literature, has_certificate_of_authenticity,
            certificate_of_authenticity_details, condition, condition_notes, rarity,
            framing_status, primary_image_url,
            artist:profiles!user_id ( id, full_name, slug, bio, short_bio, avatar_url ),
            artwork_images ( id, image_url, watermarked_image_url, visualization_image_url, is_primary, position )
        `)
        .eq('slug', slug)
        .single();

    if (error) {
        console.error("Error fetching artwork:", error);
        throw new Error(`Artwork not found or an error occurred: ${error.message}`);
    }

    if (!data) { // Explicitly handle case where data might be null despite single()
      throw new Error('Artwork not found.');
    }

    if (data.artwork_images) {
        data.artwork_images = data.artwork_images.sort((a, b) => {
            if (a.is_primary && !b.is_primary) return -1;
            if (!a.is_primary && b.is_primary) return 1;
            return (a.position ?? 0) - (b.position ?? 0);
        });
    }
    
    // Explicitly cast to AppArtwork to ensure type consistency
    const appArtwork: AppArtwork = {
        ...data,
        artist: data.artist as AppProfile | null,
        artwork_images: data.artwork_images as AppArtworkImage[] | undefined,
    } as AppArtwork;

    return appArtwork;
};


const fetchArtworkInsights = async (artworkId: string): Promise<ArtworkInsights> => {
    // Placeholder data as RPC is not yet implemented/active
    console.warn("Artwork insights RPC is placeholder. Using mock data.");
    return { view_count_wow: Math.floor(Math.random() * 50) + 1, list_add_count: Math.floor(Math.random() * 10) };
};

const fetchSimilarArtworks = async (artworkId: string, artistId: string): Promise<AppArtwork[]> => {
    // THIS RPC REQUIRES FIXING IN SUPABASE. The SQL provided earlier should resolve "id is ambiguous".
    // Make sure to run the DROP FUNCTION and CREATE FUNCTION for get_vector_similar_artworks in Supabase.

    const { data, error } = await supabase.rpc('get_vector_similar_artworks', {
        p_artwork_id: artworkId,
        p_match_count: 6 // Limit to 6 for "other works" section
    });
    if (error) {
        console.error("Error fetching similar artworks:", error);
        throw new Error(`Failed to fetch similar artworks: ${error.message}. Please check your 'get_vector_similar_artworks' Supabase RPC function for SQL errors, especially around ambiguous 'id' columns.`);
    }

    // Map RPC result (which returns a simplified object) to AppArtwork structure.
    return (data || []).map((rpcArt: any) => ({
        id: rpcArt.id,
        user_id: rpcArt.artist_id,
        title: rpcArt.title,
        slug: rpcArt.slug,
        primary_image_url: rpcArt.image_url,
        artwork_images: [{ id: uuidv4(), artwork_id: rpcArt.id, image_url: rpcArt.image_url, position: 0, is_primary: true, created_at: null, updated_at: null, watermarked_image_url: null, visualization_image_url: null }] as AppArtworkImage[],
        artist: { id: rpcArt.artist_id, full_name: rpcArt.artist_full_name, slug: rpcArt.artist_slug } as AppProfile,
        // Default other AppArtwork properties to null or appropriate values
        created_at: null, updated_at: null, description: null, price: null, status: 'available',
        is_price_negotiable: null, min_price: null, max_price: null, dimensions: null, location: null,
        medium: null, date_info: null, signature_info: null, framing_info: null, provenance: null,
        currency: null, edition_info: null, genre: null, dominant_colors: null, keywords: null,
        subject: null, orientation: null, inventory_number: null, private_note: null,
        provenance_notes: null, exhibitions: null, literature: null, has_certificate_of_authenticity: null,
        certificate_of_authenticity_details: null, condition: null, rarity: null,
        framing_status: null, embedding: null, condition_notes: null,
    })) as AppArtwork[];
};

const fetchPaletteSimilar = async (artworkId: string) => {
    const resp = await apiGet<{ items: any[] }>(`/api/recs/similar/${artworkId}`)
    return resp.items || []
}

// --- MAIN COMPONENT ---
const IndividualArtworkPage = () => {
  const { artworkSlug } = useParams<{ artworkSlug: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile } = useAuth(); // Use `profile` from AuthProvider to check ownership
  const { addArtwork } = useRecentlyViewed(); 

  // Modal visibility states, initialized to false
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVisualizationModal, setShowVisualizationModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'provenance' | 'condition'>('about');

  const { data: artwork, isLoading, isError, error } = useQuery<AppArtwork, Error>({
    queryKey: ['artwork', artworkSlug],
    queryFn: () => fetchArtworkBySlug(artworkSlug!),
    enabled: !!artworkSlug,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // Cache artwork details for 5 minutes
    cacheTime: 1000 * 60 * 60, // Keep cached data for 1 hour
  });

  const { data: insights } = useQuery<ArtworkInsights, Error>({
    queryKey: ['artworkInsights', artwork?.id],
    queryFn: () => fetchArtworkInsights(artwork!.id),
    enabled: !!artwork?.id,
    staleTime: 1000 * 60 * 10, // Insights can be staler
  });

  const {
    data: similarArtworks,
    isLoading: isLoadingSimilar,
    isError: isErrorSimilar,
    error: errorSimilar
  } = useQuery<AppArtwork[], Error>({
    queryKey: ['similarArtworks', artwork?.id, artwork?.artist?.id], // Add artist ID for unique query key
    queryFn: () => fetchSimilarArtworks(artwork!.id, artwork!.artist!.id), // Pass artistId
    enabled: !!artwork?.id && !!artwork?.artist?.id, // Only enable if both are available
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 15, // Similar artworks can be staler
  });

  // Palette & metadata similar
  const { data: paletteSimilar } = useQuery<any[]>({
    queryKey: ['paletteSimilar', artwork?.id],
    queryFn: () => fetchPaletteSimilar(artwork!.id),
    enabled: !!artwork?.id,
    staleTime: 1000 * 60 * 15,
  })

  // Memoize the data for addArtwork to ensure its object identity is stable
  const storedArtworkData = useMemo(() => {
    if (!artwork) return null;
    return {
      id: artwork.id,
      title: artwork.title,
      slug: artwork.slug,
      image_url: artwork.artwork_images?.[0]?.image_url,
      artist_slug: artwork.artist?.slug,
    };
  }, [artwork]); // Only recompute when 'artwork' object changes (i.e., new data fetched)

  // Call addArtwork only when stable storedArtworkData is available and addArtwork is stable
  useEffect(() => {
    if (storedArtworkData) {
      addArtwork(storedArtworkData);
    }
  }, [storedArtworkData, addArtwork]); // Dependencies: stable data and stable addArtwork function

  // Effect for body overflow when modals are open
  useEffect(() => {
    const isModalOpen = showInquiryModal || showShareModal || showVisualizationModal;
    document.body.style.overflow = isModalOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [showInquiryModal, showShareModal, showVisualizationModal]);

  if (isLoading) return <div className="page-container"><p className="loading-message">Loading Artwork...</p></div>;
  if (isError || !artwork) return (
    <>
      <SeoHelmet
        title="Artwork Not Found | ArtFlow App"
        description="The artwork you are looking for does not exist or has moved on ArtFlow App."
        canonicalUrl={`${window.location.origin}/artwork/${artworkSlug}`}
      />
      <div className="page-container text-center py-8"><h1 className="page-title text-red-500">Artwork Not Found</h1></div>
    </>
  );

  const firstImage = artwork.artwork_images?.[0];
  const imageUrlForDisplay = firstImage?.watermarked_image_url || firstImage?.image_url || 'https://placehold.co/800x800?text=No+Image';
  const visualizationImageUrl = firstImage?.visualization_image_url;
  const artist = artwork.artist;

  const isArtistOwner = currentUserProfile?.id === artwork.user_id;

  // Formatting year
  const artworkYear = artwork.date_info?.date_value ? new Date(artwork.date_info.date_value).getFullYear() : 
                      (artwork.date_info?.start_date ? new Date(artwork.date_info.start_date).getFullYear() : null);

  // Formatting dimensions
  const dimensions = artwork.dimensions as DimensionsJson; // Cast to specific JSON type
  const formattedDimensions = dimensions && (dimensions.height || dimensions.width || dimensions.depth) ? (
    `${dimensions.height || '?'}h x ${dimensions.width || '?'}w${dimensions.depth ? ` x ${dimensions.depth}d` : ''} ${dimensions.unit || ''}`.trim()
  ) : null;
  const framedDimensions = artwork.framed_dimensions as DimensionsJson; // Cast
  const formattedFramedDimensions = framedDimensions && (framedDimensions.height || framedDimensions.width || framedDimensions.depth) ? (
    `${framedDimensions.height || '?'}h x ${framedDimensions.width || '?'}w${framedDimensions.depth ? ` x ${framedDimensions.depth}d` : ''} ${framedDimensions.unit || ''}`.trim()
  ) : null;


  // Formatting framing info
  const framingInfo = artwork.framing_info as FramingInfoJson; // Cast
  const framingStatusText = artwork.framing_status ? String(artwork.framing_status).replace(/_/g, ' ') : null;
  const framingDetailsText = artwork.framing_status === 'framed' && framingInfo?.details ? `: ${framingInfo.details}` : '';

  // Formatting signature info
  const signatureInfo = artwork.signature_info as SignatureInfoJson; // Cast
  const signatureText = signatureInfo?.is_signed ? `Signed (${signatureInfo.location || 'location not specified'})` : null;

  // Formatting rarity/edition
  const rarityText = artwork.rarity ? String(artwork.rarity).replace(/_/g, ' ') : null;
  const editionInfo = artwork.edition_info;
  const editionText = editionInfo?.is_edition ? `Edition of ${editionInfo.number || '?'}/${editionInfo.total || '?'}` : null;
  const rarityEditionDisplay = (rarityText && editionText) ? `${rarityText}, ${editionText}` : (rarityText || editionText || null);


  // Formatting CoA
  const coaText = artwork.has_certificate_of_authenticity ? `Yes${artwork.certificate_of_authenticity_details ? `: ${artwork.certificate_of_authenticity_details}` : ''}` : null;

  // Function to render price (matching Artsy structure)
  const renderPrice = () => {
    if (artwork.status?.toLowerCase() === 'sold') {
        return <p className="text-xl font-bold text-red-500">Sold</p>;
    }
    if (artwork.is_price_negotiable && artwork.price) {
        return <p className="text-xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: artwork.currency || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(artwork.price)} <span className="text-sm text-muted-foreground">(Negotiable)</span></p>;
    }
    if (artwork.price) {
        return <p className="text-xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: artwork.currency || 'USD' }).format(artwork.price)}</p>;
    }
    return <p className="text-xl font-bold text-muted-foreground">Price on request</p>;
  };

  // Determine if 'About This Artwork' tab content exists
  const hasAboutTabContent = artwork.description || artwork.medium || formattedDimensions || signatureText || framingStatusText || artworkYear || artwork.genre || artwork.subject || artwork.orientation || artwork.dominant_colors || (artwork.keywords && artwork.keywords.length > 0) || artwork.location;
  const hasProvenanceTabContent = artwork.provenance || artwork.provenance_notes || (artwork.exhibitions && artwork.exhibitions.length > 0) || (artwork.literature && artwork.literature.length > 0);
  const hasConditionTabContent = artwork.condition || artwork.condition_notes;
  
  const showTabsSection = hasAboutTabContent || hasProvenanceTabContent || hasConditionTabContent;

  const otherWorksFilterLink = artwork.artist?.slug ? `/artworks?artistSlug=${artwork.artist.slug}` : '/artworks';

  // Format location from JSON if available
  let formattedLocation: string | null = null;
  if (artwork.location) {
    try {
      const parsedLocation = typeof artwork.location === 'string' ? JSON.parse(artwork.location) : artwork.location;
      formattedLocation = [parsedLocation.city, parsedLocation.country].filter(Boolean).join(', ');
    } catch (e) {
      console.error("Error parsing artwork location JSON:", e);
      formattedLocation = String(artwork.location);
    }
  }


  // --- SEO & JSON-LD Construction ---
  const pageTitle = `${artwork.title} by ${artist?.full_name || 'Unknown Artist'} | ArtFlow App`;
  const pageDescription = artwork.description || `${artwork.title} is an artwork by ${artist?.full_name || 'an unknown artist'}${artwork.medium ? `, created with ${artwork.medium}` : ''}${artworkYear ? ` in ${artworkYear}` : ''}.`;
  const canonicalUrl = `${window.location.origin}/artwork/${artwork.slug}`;
  const ogImage = imageUrlForDisplay; // Use the main image for social sharing

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product", // Or "VisualArtwork" for fine art
    "name": artwork.title,
    "image": ogImage,
    "description": artwork.description || pageDescription,
    "url": canonicalUrl,
    ...(artwork.price && artwork.currency && {
        "offers": {
            "@type": "Offer",
            "priceCurrency": artwork.currency,
            "price": artwork.price,
            "availability": artwork.status?.toLowerCase() === 'available' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "itemCondition": artwork.condition ? `https://schema.org/${artwork.condition.replace(/\s/g, '')}Condition` : "https://schema.org/GoodCondition",
        }
    }),
    ...(artwork.medium && { "material": artwork.medium }),
    ...(artworkYear && { "dateCreated": artworkYear }),
    ...(formattedDimensions && dimensions && dimensions.unit && {
      "depth": dimensions.depth,
      "height": dimensions.height,
      "width": dimensions.width,
      "dimensions": `${dimensions.height} ${dimensions.unit} x ${dimensions.width} ${dimensions.unit}${dimensions.depth ? ` x ${dimensions.depth} ${dimensions.unit}` : ''}`
    }),
    ...(artist && {
        "creator": {
            "@type": "Person",
            "name": artist.full_name,
            "url": `${window.location.origin}/u/${artist.slug}`,
            "image": artist.avatar_url || undefined,
        }
    }),
    ...(artwork.genre && { "genre": artwork.genre }),
    // Add more VisualArtwork specific properties if applicable
    "@id": `urn:artwork:${artwork.id}`, // Unique identifier
  };

  return (
    <>
      <SeoHelmet
        title={pageTitle}
        description={pageDescription}
        canonicalUrl={canonicalUrl}
        ogType="article" // Or "product"
        ogImage={ogImage}
        ogUrl={canonicalUrl}
        jsonLd={jsonLd}
      />
      <div className="page-container">
        {/* Artist Owner Banner */}
        {isArtistOwner && (
            <div className="artist-owner-banner">
                <span>You are viewing your own artwork.</span>
                <Link to={`/u/artworks/edit/${artwork.id}`} className="button button-secondary button-sm button-with-icon">
                    <Edit3 size={14} /> Edit This Page
                </Link>
            </div>
        )}

        <button onClick={() => navigate(-1)} className="button button-secondary back-button button-with-icon">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="artwork-layout-grid">
          <div className="artwork-image-column">
            <img
              src={imageUrlForDisplay}
              alt={artwork.title || ''}
              className="main-artwork-image"
              // Page Speed: Consider srcset for main image for responsiveness
              // srcSet={`${firstImage?.image_url_small} 800w, ${firstImage?.image_url_medium} 1200w`}
              // sizes="(max-width: 768px) 800px, 1200px"
            />
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
            <h2 className="artwork-title-primary">{artwork.title}{artworkYear && <span className="artwork-year">, {artworkYear}</span>}</h2>
            
            {/* Display data points */}
            {artwork.medium && <p className="artwork-meta-item">{artwork.medium}</p>}
            {formattedDimensions && <p className="artwork-meta-item">{formattedDimensions}</p>}
            {signatureText && <p className="artwork-meta-item">{signatureText}</p>}
            {framingStatusText && <p className="artwork-meta-item">{framingStatusText}{framingDetailsText}</p>}
            {rarityEditionDisplay && <p className="artwork-meta-item">{rarityEditionDisplay}</p>}
            {coaText && <p className="artwork-meta-item">CoA included: {coaText}</p>}

            <div className="price-container">
              {renderPrice()}
            </div>
            <div className="artwork-actions">
              {!isArtistOwner && ( // Inquire button only for non-owners
                <button onClick={() => setShowInquiryModal(true)} className="button button-primary" disabled={artwork.status?.toLowerCase() === 'sold'}><ShoppingBag size={16}/> Inquire</button>
              )}
              <button onClick={() => setShowShareModal(true)} className="button button-secondary"><Share2 size={16} /> Share</button>
            </div>

            {/* Collector Insights Banner */}
            {insights && (insights.view_count_wow > 5 || insights.list_add_count > 0) && (
              <div className="collector-insights-banner">
                {insights.view_count_wow > 5 && <span><Eye size={16}/> 🔥 Viewed by <b>{insights.view_count_wow} people</b> this week</span>}
                {insights.list_add_count > 0 && <span><Heart size={16}/> ❤️ Added to <b>{insights.list_add_count} collector lists</b></span>}
              </div>
            )}
            
          </div>
        </div>
        
        {/* Tabs Section */}
        {showTabsSection && (
          <div className="artwork-tabs-section">
            <div className="tab-header">
              {hasAboutTabContent && (
                <button className={`tab-button ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>
                  About This Artwork
                </button>
              )}
              {hasProvenanceTabContent && (
                <button className={`tab-button ${activeTab === 'provenance' ? 'active' : ''}`} onClick={() => setActiveTab('provenance')}>
                  Provenance
                </button>
              )}
              {hasConditionTabContent && (
                <button className={`tab-button ${activeTab === 'condition' ? 'active' : ''}`} onClick={() => setActiveTab('condition')}>
                  Condition
                </button>
              )}
            </div>

            <div className="tab-content">
              {activeTab === 'about' && hasAboutTabContent && (
                <div className="about-artwork-content">
                  {/* Security: If description contains rich text from user, sanitize on backend and/or client side using DOMPurify */}
                  {artwork.description && <p className="mb-4">{artwork.description}</p>}
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
                  {formattedLocation && <p><strong>Location:</strong> {formattedLocation}</p>}
                </div>
              )}

              {activeTab === 'provenance' && hasProvenanceTabContent && (
                <div className="provenance-content">
                  {/* Security: If provenance contains rich text from user, sanitize on backend and/or client side using DOMPurify */}
                  {artwork.provenance && <p className="mb-4">{artwork.provenance}</p>}
                  {/* Security: If provenance_notes contains rich text from user, sanitize on backend and/or client side using DOMPurify */}
                  {artwork.provenance_notes && <p className="text-sm text-gray-600 mb-4">{artwork.provenance_notes}</p>}
                  {artwork.exhibitions && artwork.exhibitions.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-lg mb-2">Exhibitions</h4>
                      <ul>
                        {(artwork.exhibitions as HistoricalEntryJson[]).map((entry, index) => (
                          <li key={index}>{entry.year}: {entry.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {artwork.literature && artwork.literature.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Literature</h4>
                      <ul>
                        {(artwork.literature as HistoricalEntryJson[]).map((entry, index) => (
                          <li key={index}>{entry.year}: {entry.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'condition' && hasConditionTabContent && (
                <div className="condition-content">
                  {/* Security: If condition/condition_notes contains rich text from user, sanitize on backend and/or client side using DOMPurify */}
                  {artwork.condition && <p className="mb-2"><strong>Condition:</strong> {artwork.condition}</p>}
                  {artwork.condition_notes && <p className="text-sm text-gray-600">{artwork.condition_notes}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Artist Profile Spotlight */}
        {artist && (
            <div className="artist-spotlight-section">
                <div className="artist-info-card">
                    <img
                        src={artist.avatar_url || 'https://placehold.co/128x128'}
                        alt={artist.full_name || 'Artist'}
                        className="artist-avatar-lg"
                        loading="lazy" // Page Speed: Lazy load artist avatar
                    />
                    <div>
                        <h3 className="text-2xl font-bold">{artist.full_name}</h3>
                        {/* Security: If bios contain rich text from user, sanitize on backend and/or client side using DOMPurify */}
                        {artist.short_bio && <p className="text-muted-foreground mt-1">{artist.short_bio}</p>}
                        {artist.bio && <p className="mt-2 text-sm line-clamp-3">{artist.bio}</p>}
                        <div className="artist-actions mt-4 flex gap-3">
                            <Link to={`/u/${artist.slug}`} className="button button-primary button-with-icon">
                                <UserPlus size={16} /> Follow Artist
                            </Link>
                            <Link to={`/u/${artist.slug}`} className="button button-secondary">
                                View Portfolio
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {/* Other works from artist section */}
        {similarArtworks && similarArtworks.length > 0 && (
          <div className="related-artworks-section">
            <div className="related-header">
                <h3>More works from {artist?.full_name || 'this artist'}</h3>
                <Link to={otherWorksFilterLink} className="button-link">View all works <ArrowLeft size={16} className="rotate-180 inline-block"/></Link>
            </div>
            {isErrorSimilar ? (
                <p className="error-message">Error loading similar artworks: {errorSimilar?.message}</p>
            ) : isLoadingSimilar ? (
                <p className="loading-message">Loading similar artworks...</p>
            ) : (
                <div className="related-artworks-list">
                {similarArtworks.map((art: AppArtwork) => {
                    const imageUrl = art.artwork_images?.[0]?.image_url || 'https://placehold.co/400x400?text=No+Image';
                    if (!art.slug || !art.artist?.slug) return null;
                    return (
                    <Link to={`/artwork/${art.slug}`} key={art.id} className="artwork-card-link">
                        <div className="artwork-card">
                        <img
                            src={imageUrl}
                            alt={art.title || ''}
                            className="artwork-card-image"
                            loading="lazy" // Page Speed: Lazy load similar artwork images
                        />
                        <div className="artwork-card-info">
                            <h4 className="artwork-card-title-italic">{art.title}</h4>
                            <p className="artwork-card-artist text-sm">{art.artist.full_name}</p>
                        </div>
                        </div>
                    </Link>
                    );
                })}
                </div>
            )}
          </div>
        )}

        {/* Similar by palette and metadata */}
        {paletteSimilar && paletteSimilar.length > 0 && (
          <div className="related-artworks-section">
            <div className="related-header">
                <h3>You may also love</h3>
            </div>
            <div className="related-artworks-list">
              {paletteSimilar.map((art: any) => (
                <Link to={`/artwork/${art.slug || art.id}`} key={art.id} className="artwork-card-link">
                  <div className="artwork-card">
                    <img
                      src={art.primary_image_url || 'https://placehold.co/400x400?text=No+Image'}
                      alt={art.title || ''}
                      className="artwork-card-image"
                      loading="lazy"
                    />
                    <div className="artwork-card-info">
                      <h4 className="artwork-card-title-italic">{art.title}</h4>
                      {typeof art.price === 'number' && <p className="artwork-card-artist text-sm">${art.price.toLocaleString()}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals are rendered here, outside the main content flow, but inside the main component's return */}
      {artwork && artist && ( /* Ensure both artwork and artist are available before rendering modals */
        <>
          <InquiryModal
            isOpen={showInquiryModal}
            onClose={() => setShowInquiryModal(false)}
            artwork={artwork}
            artist={artist as AppProfile}
          />
          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            artwork={artwork}
            shareUrl={window.location.href}
            title={artwork.title}
            byline={artwork.artist?.full_name}
            previewImageUrls={[artwork.artwork_images?.[0]?.image_url || null]}
            dimensions={formattedDimensions || undefined} // Pass formatted dimensions string if exists
            price={artwork.price}
            year={artworkYear ? String(artworkYear) : undefined}
            currency={artwork.currency || undefined}
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