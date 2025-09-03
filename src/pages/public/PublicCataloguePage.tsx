import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { ArrowLeft, Share2, Edit3, Eye, Lock } from 'lucide-react';
import InquiryModal from '../../components/public/InquiryModal';
import ShareButton from '../../components/ui/ShareButton'; // Reusable ShareButton component
import { AppCatalogue, AppArtwork, ProfileRow } from '@/types/app.types';
import '@/styles/app.css'; // Import the centralized styles

// --- FETCH FUNCTION ---
const fetchPublicCatalogue = async (artistSlug: string, catalogueSlug: string): Promise<AppCatalogue> => {
  // 1️⃣ Fetch catalogue with artist and check if it's published
  const { data: catalogueData, error: catErr } = await supabase
    .from('catalogues')
    .select('*, artist:profiles(id, full_name, slug)')
    .eq('slug', catalogueSlug)
    .eq('artist.slug', artistSlug)
    .eq('is_published', true) // Ensure only published catalogues are public
    .single();
  
  if (!catalogueData || catErr) {
    // Providing a more descriptive error for better debugging if needed
    throw new Error('Catalogue not found, is private, or is no longer available.');
  }

  // 2️⃣ Get artwork IDs and positions linked to this catalogue
  const { data: junction, error: junctionErr } = await supabase
    .from('artwork_catalogue_junction')
    .select('artwork_id, position')
    .eq('catalogue_id', catalogueData.id)
    .order('position', { ascending: true }); // Order by position for display
  if (junctionErr) throw new Error('Failed to fetch artwork links');

  const artworkIds = junction.map(j => j.artwork_id);
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
  const artworksWithImagesAndOrder: AppArtwork[] = junction.map(j => {
      const artworkDetail = artworks.find(a => a.id === j.artwork_id);
      if (artworkDetail) {
          const primaryImage = artworkDetail.artwork_images?.find(img => img.is_primary) || artworkDetail.artwork_images?.[0];
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
  });

  if (isLoading) return <p className="loading-placeholder">Loading Catalogue...</p>;
  if (isError || !data) return (
    <div className="not-found-container">
      <h1>404 - Catalogue Not Found</h1>
      <p>This catalogue could not be found, is private, or is no longer available.</p>
      <Link to="/artists" className="button button-primary">Browse Artists</Link>
    </div>
  );

  const { catalogue, artworks } = data;
  const isOwner = profile?.id === catalogue.artist.id;
  const isSharable = catalogue.access_type === 'public'; // Assuming 'public' access_type means sharable
  const shareImageUrls = [catalogue.cover_image_url, ...(artworks?.flatMap(a => a.artwork_images?.map(i => i.image_url) || []) || [])].filter(Boolean) as string[];

  const getBannerInfo = () => {
    switch (catalogue.access_type) {
      case 'public': return { text: 'This is a public catalogue', icon: <Eye size={16} /> };
      case 'password_protected': return { text: 'This is a password-protected catalogue', icon: <Lock size={16} /> };
      case 'restricted_audience': return { text: 'This catalogue is shared with specific contacts', icon: <Lock size={16} /> };
      default: return { text: 'Catalogue access is restricted', icon: <Lock size={16} /> };
    }
  };
  const bannerInfo = getBannerInfo();

  return (
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
          {artworks.map(art => (
            <div key={art.id} className="artwork-card">
              <img src={art.artwork_images?.[0]?.image_url || 'https://placehold.co/600x450?text=No+Image'} alt={art.title || 'Artwork'} className="artwork-card-image" />
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
          artist={catalogue.artist as ProfileRow} // Pass the catalogue's artist
        />
      )}
    </div>
  );
};

export default PublicCataloguePage;