import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { ArrowLeft, Share2, Edit3, Eye, Lock } from 'lucide-react';
import InquiryModal from '../../components/public/InquiryModal';
import ShareButton from '../../components/ui/ShareButton'; // Reusable ShareButton component
import { AppCatalogue, AppArtwork, AppProfile } from '@/types/app.types';
import '@/styles/app.css';
import SeoHelmet from '../../components/SeoHelmet'; // Import SeoHelmet

// --- FETCH FUNCTION ---
const fetchPublicCatalogue = async (artistSlug: string, catalogueSlug: string): Promise<AppCatalogue> => {
  // 1️⃣ Fetch catalogue with artist and check if it's published
  const { data: catalogueData, error: catErr } = await supabase
    .from('catalogues')
    .select('*, artist:profiles(id, full_name, slug, avatar_url)') // Fetch artist avatar_url for JSON-LD
    .eq('slug', catalogueSlug)
    .in('artist.slug', [artistSlug]) // Using .in for related table filter, which is more robust
    .eq('is_published', true) // Ensure only published catalogues are public
    .single();
  
  if (!catalogueData || catErr) {
    throw new Error('Catalogue not found, is private, or is no longer available.');
  }

  // 2️⃣ Get artwork IDs and positions linked to this catalogue
  const { data: junction, error: junctionErr } = await supabase
    .from('artwork_catalogue_junction')
    .select('artwork_id, position')
    .eq('catalogue_id', catalogueData.id)
    .order('position', { ascending: true }); // Order by position for display
  if (junctionErr) throw new Error('Failed to fetch artwork links');

  const artworkIds = junction?.map((j: { artwork_id: string; }) => j.artwork_id) || [];
  if (artworkIds.length === 0) {
      return { ...catalogueData, artworks: [] } as AppCatalogue;
  }

  // 3️⃣ Fetch artworks and their primary images
  const { data: artworks, error: artErr } = await supabase
    .from('artworks')
    .select(`
      id, title, slug, price, currency, status,
      artwork_images(image_url, is_primary, position)
    `)
    .in('id', artworkIds)
    .eq('status', 'available'); // Only show available artworks in public catalogue
  if (artErr) throw new Error('Failed to fetch artworks');

  // 4️⃣ Combine artworks with their primary images and reorder by catalogue position
  const artworksWithImagesAndOrder: AppArtwork[] = (junction || []).map((j: { artwork_id: string; position: number; }) => {
      const artworkDetail = (artworks || []).find((a: AppArtwork) => a.id === j.artwork_id);
      if (artworkDetail) {
          const primaryImage = artworkDetail.artwork_images?.find((img: any) => img.is_primary) || artworkDetail.artwork_images?.[0];
          return {
              ...artworkDetail,
              artwork_images: primaryImage ? [primaryImage] : [], // Only keep primary for quick access
          } as AppArtwork;
      }
      return null;
  }).filter(Boolean) as AppArtwork[];


  return { ...catalogueData, artworks: artworksWithImagesAndOrder } as AppCatalogue;
};

const PublicCataloguePage = () => {
  const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string; catalogueSlug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [inquiryArtwork, setInquiryArtwork] = useState<AppArtwork | null>(null);

  const { data, isLoading, isError } = useQuery<AppCatalogue, Error>({
    queryKey: ['publicCatalogue', artistSlug, catalogueSlug],
    queryFn: () => fetchPublicCatalogue(artistSlug!, catalogueSlug!),
    enabled: !!artistSlug && !!catalogueSlug,
    retry: 1, // Retry once if it fails to fetch
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    cacheTime: 1000 * 60 * 30, // Keep cached data for 30 minutes
  });

  if (isLoading) return <p className="loading-placeholder">Loading Catalogue...</p>;
  if (isError || !data) return (
    <>
      <SeoHelmet
        title="Catalogue Not Found | ArtFlow App"
        description="This art catalogue could not be found, is private, or is no longer available on ArtFlow App."
        canonicalUrl={`${window.location.origin}/u/${artistSlug}/catalogue/${catalogueSlug}`}
      />
      <div className="not-found-container">
        <h1>404 - Catalogue Not Found</h1>
        <p>This catalogue could not be found, is private, or is no longer available.</p>
        <Link to="/artists" className="button button-primary">Browse Artists</Link>
      </div>
    </>
  );

  const catalogue = data;
  const artworks = data.artworks;

  const isOwner = profile?.id === catalogue.artist.id;
  const isSharable = catalogue.access_type === 'public';
  const shareImageUrls = [catalogue.cover_image_url, ...(artworks?.flatMap((a: AppArtwork) => a.artwork_images?.map((i: any) => i.image_url) || []) || [])].filter(Boolean) as string[];

  const getBannerInfo = () => {
    switch (catalogue.access_type) {
      case 'public': return { text: 'This is a public catalogue', icon: <Eye size={16} /> };
      case 'password_protected': return { text: 'This is a password-protected catalogue', icon: <Lock size={16} /> };
      case 'restricted_audience': return { text: 'This catalogue is shared with specific contacts', icon: <Lock size={16} /> };
      default: return { text: 'Catalogue access is restricted', icon: <Lock size={16} /> };
    }
  };
  const bannerInfo = getBannerInfo();

  // --- SEO & JSON-LD Construction ---
  const pageTitle = `${catalogue.title} by ${catalogue.artist.full_name} | Art Catalogue | ArtFlow App`;
  const pageDescription = catalogue.description || `Explore the curated art collection "${catalogue.title}" by artist ${catalogue.artist.full_name} on ArtFlow App.`;
  const canonicalUrl = `${window.location.origin}/u/${catalogue.artist.slug}/catalogue/${catalogue.slug}`;
  const ogImage = catalogue.cover_image_url || `${window.location.origin}/default-catalogue-cover.jpg`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage", // Or "CreativeWorkSeries"
    "name": catalogue.title,
    "description": catalogue.description,
    "image": ogImage,
    "url": canonicalUrl,
    "creator": {
      "@type": "Person",
      "name": catalogue.artist.full_name,
      "url": `${window.location.origin}/u/${catalogue.artist.slug}`,
      "image": catalogue.artist.avatar_url || undefined,
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    "hasPart": artworks.map(art => ({
        "@type": "VisualArtwork", // Or "Product" if purchasable
        "name": art.title,
        "image": art.artwork_images?.[0]?.image_url,
        "url": `${window.location.origin}/artwork/${art.slug}`,
        ...(art.price && art.currency && {
            "offers": {
                "@type": "Offer",
                "priceCurrency": art.currency,
                "price": art.price,
                "availability": art.status?.toLowerCase() === 'available' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            }
        })
    }))
  };

  return (
    <>
      <SeoHelmet
        title={pageTitle}
        description={pageDescription}
        canonicalUrl={canonicalUrl}
        ogType="article"
        ogImage={ogImage}
        ogUrl={canonicalUrl}
        jsonLd={jsonLd}
      />
      <div className="page-container">
        {isOwner && (
          <div className="owner-preview-banner">
            <div className="banner-info">{bannerInfo.icon}<span>You are viewing your own catalogue. {bannerInfo.text}.</span></div>
            <Link to={`/u/catalogues/edit/${catalogue.id}`} className="button button-secondary button-with-icon">
              <Edit3 size={16} /> Manage Catalogue
            </Link>
          </div>
        )}

        <button onClick={() => navigate(-1)} className="button button-secondary back-button button-with-icon">
          <ArrowLeft size={16} /> Back
        </button>

        <section className="catalogue_header" style={{backgroundImage: `url(${catalogue.cover_image_url || 'https://placehold.co/1200x600?text=Catalogue+Cover'})`}}>
          <h1>
            <Link to={`/u/${catalogue.artist.slug}`} className="catalogue-artist-link">{catalogue.artist.full_name}</Link><br/>
            {catalogue.title}
          </h1>
          {/* Security: If description contains rich text from user, sanitize on backend and/or client side using DOMPurify */}
          {catalogue.description && <p className="catalogue-description">{catalogue.description}</p>}
          {isSharable && (
            <div className="catalogue-header-actions">
              <ShareButton
                  shareUrl={window.location.href}
                  title={catalogue.title || "My Catalogue"}
                  byline={catalogue.artist.full_name}
                  previewImageUrls={shareImageUrls}
                  isCatalogue={true}
              />
            </div>
          )}
          <div className="blurred-overlay"></div>
        </section>

        {artworks && artworks.length > 0 ? (
          <div className="flex_grid">
            {(artworks || []).map((art: AppArtwork) => (
              <div key={art.id} className="artwork-card">
                <img
                  src={art.artwork_images?.[0]?.image_url || 'https://placehold.co/600x450?text=No+Image'}
                  alt={art.title || 'Artwork'}
                  className="artwork-card-image"
                  loading="lazy" // Page Speed: Lazy load artwork images within catalogue
                />
                <div className="artwork-card-info">
                  <h4>{art.title || "Untitled"}</h4>
                  <p className="artwork-card-price">{art.price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: art.currency || 'USD' }).format(art.price) : 'Price on Request'}</p>
                </div>
                <div className="artwork-card-actions">
                  <button className="button button-secondary button-sm" onClick={() => setInquiryArtwork(art)}>Inquire</button>
                  <Link to={`/artwork/${art.slug}`} className="button button-primary button-sm">View Artwork</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (<p className="empty-list-placeholder">There are no available artworks in this catalogue at the moment.</p>)}

        {inquiryArtwork && (
          <InquiryModal
            isOpen={!!inquiryArtwork}
            onClose={() => setInquiryArtwork(null)}
            artworkId={inquiryArtwork.id}
            previewImageUrl={inquiryArtwork.artwork_images?.[0]?.image_url || undefined}
            previewTitle={inquiryArtwork.title || undefined}
            artist={catalogue.artist as AppProfile} // Pass the catalogue's artist as AppProfile
          />
        )}
      </div>
    </>
  );
};

export default PublicCataloguePage;