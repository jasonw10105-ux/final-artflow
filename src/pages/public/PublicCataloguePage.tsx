import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { ArrowLeft, Share2, Edit3, Eye, Lock } from 'lucide-react';
import InquiryModal from '../../components/public/InquiryModal';
import ShareModal from '../../components/public/ShareModal';
import '../../index.css';

type ArtworkImage = {
  id: string;
  artwork_id: string;
  image_url: string | null;
  watermarked_image_url: string | null;
  visualization_image_url: string | null;
  position: number;
};

type Artwork = {
  id: string;
  title: string | null;
  slug: string;
  price: number | null;
  currency: string | null;
  images: ArtworkImage[];
};

type Catalogue = {
  id: string;
  title: string | null;
  description: string | null;
  cover_image_url: string | null;
  access_type: string;
  artist: { id: string; full_name: string; slug: string };
};

// --- FETCH FUNCTION ---
const fetchPublicCatalogue = async (artistSlug: string, catalogueSlug: string) => {
  // 1️⃣ Fetch catalogue with artist
  const { data: catalogue, error: catErr } = await supabase
    .from('catalogues')
    .select('*, artist:profiles!inner(id, full_name, slug)')
    .eq('slug', catalogueSlug)
    .eq('artist.slug', artistSlug)
    .single();
  if (!catalogue || catErr) throw new Error('Catalogue not found');

  // 2️⃣ Get artwork IDs linked to this catalogue
  const { data: junction, error: junctionErr } = await supabase
    .from('artwork_catalogue_junction')
    .select('artwork_id')
    .eq('catalogue_id', catalogue.id);
  if (junctionErr) throw new Error('Failed to fetch artwork links');

  const artworkIds = junction.map(j => j.artwork_id);
  if (artworkIds.length === 0) return { catalogue, artworks: [] };

  // 3️⃣ Fetch artworks
  const { data: artworks, error: artErr } = await supabase
    .from('artworks')
    .select('id, title, slug, price, currency, status')
    .in('id', artworkIds)
    .eq('status', 'Available');
  if (artErr) throw new Error('Failed to fetch artworks');

  // 4️⃣ Fetch images
  const { data: images, error: imgErr } = await supabase
    .from('artwork_images')
    .select('id, artwork_id, image_url, watermarked_image_url, visualization_image_url, position')
    .in('artwork_id', artworkIds)
    .order('position', { ascending: true });
  if (imgErr) throw new Error('Failed to fetch artwork images');

  // 5️⃣ Combine artworks with images
  const artworksWithImages: Artwork[] = artworks.map(a => ({
    ...a,
    images: images.filter(img => img.artwork_id === a.id),
  }));

  return { catalogue, artworks: artworksWithImages };
};

const PublicCataloguePage = () => {
  const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string; catalogueSlug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [inquiryArtwork, setInquiryArtwork] = useState<Artwork | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['publicCatalogue', artistSlug, catalogueSlug],
    queryFn: () => fetchPublicCatalogue(artistSlug!, catalogueSlug!),
    enabled: !!artistSlug && !!catalogueSlug,
    retry: 1,
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
  const isSharable = catalogue.access_type === 'public';
  const shareImageUrls = [catalogue.cover_image_url, ...artworks.flatMap(a => a.images.map(i => i.image_url))].filter(Boolean) as string[];

  const getBannerInfo = () => {
    switch (catalogue.access_type) {
      case 'public': return { text: 'This is a public catalogue', icon: <Eye size={16} /> };
      case 'private': return { text: 'This is a private catalogue', icon: <Lock size={16} /> };
      default: return { text: 'Shared with specific contacts', icon: <Lock size={16} /> };
    }
  };
  const bannerInfo = getBannerInfo();

  return (
    <div className="page-container">
      {isOwner && (
        <div className="owner-preview-banner">
          <div className="banner-info">{bannerInfo.icon}<span>You are viewing your own catalogue. {bannerInfo.text}.</span></div>
          <Link to={`/artist/catalogues/edit/${catalogue.id}`} className="button button-secondary">
            <Edit3 size={16} /> Manage Catalogue
          </Link>
        </div>
      )}

      <button onClick={() => navigate(-1)} className="button button-secondary back-button">
        <ArrowLeft size={16} /> Back
      </button>

      <section className="catalogue_header" style={{backgroundImage: `url(${catalogue.cover_image_url})`}}>
        <h1>
          <Link to={`/${catalogue.artist.slug}`} className="catalogue-artist-link">{catalogue.artist.full_name}</Link><br/>
          {catalogue.title}
        </h1>
        {catalogue.description && <p className="catalogue-description">{catalogue.description}</p>}
        {isSharable && (
          <div className="catalogue-header-actions">
            <button className="button button-secondary" onClick={() => setShowShareModal(true)}>
              <Share2 size={16} /> Share Catalogue
            </button>
          </div>
        )}
        <div className="blurred-overlay"></div>
      </section>

      {artworks.length > 0 ? (
        <div className="flex_grid">
          {artworks.map(art => (
            <div key={art.id} className="card">
              <img src={art.images[0]?.image_url || 'https://placehold.co/600x450?text=No+Image'} alt={art.title || 'Artwork'} className="artwork-card-image" />
              <div className="artwork-card-info">
                <h4>{art.title || "Untitled"}</h4>
                <p>{art.price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: art.currency || 'USD' }).format(art.price) : 'Price on Request'}</p>
              </div>
              <div className="artwork-card-actions">
                <button className="button button-secondary" onClick={() => setInquiryArtwork(art)}>Inquire</button>
                <Link to={`/artwork/${art.slug}`} className="button button-primary">View Artwork</Link>
              </div>
            </div>
          ))}
        </div>
      ) : (<p className="empty-list-placeholder">There are no available artworks in this catalogue at the moment.</p>)}

      {inquiryArtwork && (
        <InquiryModal
          artworkId={inquiryArtwork.id}
          onClose={() => setInquiryArtwork(null)}
          previewImageUrl={inquiryArtwork.images[0]?.image_url || undefined}
          previewTitle={inquiryArtwork.title || undefined}
        />
      )}
      {showShareModal && isSharable && (
        <ShareModal
          onClose={() => setShowShareModal(false)}
          title={catalogue.title}
          byline={catalogue.artist.full_name}
          shareUrl={window.location.href}
          previewImageUrls={shareImageUrls}
          isCatalogue
        />
      )}
    </div>
  );
};

export default PublicCataloguePage;