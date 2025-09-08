// src/pages/MarketingPage.tsx
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { Palette, BarChart, MessageSquare, ShieldCheck, Info } from 'lucide-react'; // Added Info icon for empty state
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';
import { AppArtwork, AppProfile, AppArtworkImage, AppCatalogue } from '@/types/app.types'; // Import from centralized types
import { v4 as uuidv4 } from 'uuid'; // For generating IDs for images

// Define specific types for data returned by RPCs for clarity and mapping
interface MarketingArtworkRPCResult {
  id: string;
  title: string | null;
  image_url: string | null; // This is directly from the RPC's select on artworks table for display
  slug: string;
  price: number | null;
  currency: string | null;
  profile_full_name: string | null;
  profile_slug: string;
  artist_id: string; // Add artist_id as RPC likely returns it
}

interface MarketingCatalogueRPCResult {
  id: string;
  title: string | null;
  cover_image_url: string | null;
  slug: string;
  profile_full_name: string | null;
  profile_slug: string;
  artwork_count: number; // Assuming RPC returns this
  artist_id: string; // Add artist_id as RPC likely returns it
}

interface MarketingArtistRPCResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  slug: string;
  short_bio: string | null;
}

// --- Constants for Fetch Limits ---
const ARTWORK_LIMIT = 10;
const CATALOGUE_LIMIT = 8;
const ARTIST_LIMIT = 8;

// --- Supabase fetchers ---
const fetchRandomArtworks = async (count: number): Promise<AppArtwork[]> => {
  const { data, error } = await supabase.rpc('get_random_artworks', { limit_count: count });
  if (error) throw new Error(error.message);
  
  return (data as MarketingArtworkRPCResult[] || []).map(rpcArt => ({
    // Explicitly map AppArtwork properties
    id: rpcArt.id,
    user_id: rpcArt.artist_id, 
    created_at: null, updated_at: null, // RPC likely doesn't return, default to null
    slug: rpcArt.slug,
    title: rpcArt.title,
    description: null, 
    price: rpcArt.price,
    status: 'available', // Assuming random artworks are available
    is_price_negotiable: null, min_price: null, max_price: null, 
    dimensions: null, location: null, medium: null, date_info: null, 
    signature_info: null, framing_info: null, provenance: null, 
    currency: rpcArt.currency, 
    edition_info: null, genre: null, dominant_colors: null, keywords: null, subject: null,
    orientation: null, inventory_number: null, private_note: null, provenance_notes: null,
    exhibitions: null, literature: null, has_certificate_of_authenticity: null,
    certificate_of_authenticity_details: null, condition: null, rarity: null,
    framing_status: null, primary_image_url: rpcArt.image_url, embedding: null, condition_notes: null,

    // Joined relations
    artist: { // Map to AppProfile structure
        id: rpcArt.artist_id, 
        full_name: rpcArt.profile_full_name, 
        slug: rpcArt.profile_slug,
        // Provide defaults for all non-nullable AppProfile fields
        created_at: null, updated_at: null, username: null, email: '', is_admin: false,
        display_name: rpcArt.profile_full_name, first_name: null, last_name: null, artist_statement: null,
        short_bio: null, social_links: null, coa_settings: null, profile_completed: false, bio: null, location: null, role: null,
    } as AppProfile, 
    artwork_images: [{ // Create a minimal AppArtworkImage
        id: uuidv4(), artwork_id: rpcArt.id, image_url: rpcArt.image_url, position: 0, is_primary: true,
        created_at: null, updated_at: null, watermarked_image_url: null, visualization_image_url: null
    }] as AppArtworkImage[],
  })) as AppArtwork[];
};

const fetchRandomCatalogues = async (count: number): Promise<AppCatalogue[]> => {
  const { data, error } = await supabase.rpc('get_random_catalogues', { limit_count: count });
  if (error) throw new Error(error.message);
  
  // Only include catalogues that have at least 1 artwork (assuming RPC returns artwork_count)
  return (data as MarketingCatalogueRPCResult[] || []).filter(cat => cat.artwork_count > 0).map(rpcCat => ({
    // Explicitly map AppCatalogue properties
    id: rpcCat.id,
    user_id: rpcCat.artist_id,
    created_at: null, updated_at: null,
    slug: rpcCat.slug,
    title: rpcCat.title,
    description: null,
    is_system_catalogue: false,
    cover_artwork_id: null,
    cover_image_url: rpcCat.cover_image_url,
    access_type: 'public', // Assuming random catalogues are public
    password: null,
    scheduled_send_at: null,
    is_published: true, // Assuming random catalogues are published

    // Joined relations
    artist: { // Map to AppProfile structure
        id: rpcCat.artist_id, 
        full_name: rpcCat.profile_full_name, 
        slug: rpcCat.profile_slug,
        // Provide defaults for all non-nullable AppProfile fields
        created_at: null, updated_at: null, username: null, email: '', is_admin: false,
        display_name: rpcCat.profile_full_name, first_name: null, last_name: null, artist_statement: null,
        short_bio: null, social_links: null, coa_settings: null, profile_completed: false, bio: null, location: null, role: null,
    } as AppProfile,
  })) as AppCatalogue[];
};

const fetchRandomArtists = async (count: number): Promise<AppProfile[]> => {
  const { data, error } = await supabase.rpc('get_random_artists', { limit_count: count });
  if (error) throw new Error(error.message);
  
  return (data as MarketingArtistRPCResult[] || []).map(rpcArtist => ({
    // Explicitly map AppProfile properties
    id: rpcArtist.id,
    full_name: rpcArtist.full_name,
    avatar_url: rpcArtist.avatar_url,
    slug: rpcArtist.slug,
    short_bio: rpcArtist.short_bio,
    // Provide defaults for all other required AppProfile fields
    created_at: null, updated_at: null, username: null, email: '', is_admin: false,
    display_name: rpcArtist.full_name, first_name: null, last_name: null, artist_statement: null,
    social_links: null, coa_settings: null, profile_completed: false, bio: null, location: null, role: null,
  })) as AppProfile[];
};

// --- Reusable Card Components ---
const ArtworkCard = ({ item }: { item: AppArtwork }) => (
  <Link to={`/artwork/${item.slug}`} className="card-link">
    <img
      src={item.artwork_images?.[0]?.image_url || 'https://placehold.co/400x400?text=No+Image'} // Fixed optional chaining
      alt={item.title || 'Artwork'}
      className="card-image"
      loading="lazy" // Added lazy loading for images
    />
    <div className="card-info">
      <h4>{item.title || 'Untitled'}</h4>
      <p className="card-subtext">{item.artist?.full_name || 'Unknown Artist'}</p>
      {item.price != null && <p className="card-price">${item.price.toLocaleString()}</p>}
    </div>
  </Link>
);

const CatalogueCard = ({ item }: { item: AppCatalogue }) => (
  <Link to={`/u/${item.artist?.slug}/catalogue/${item.slug}`} className="card-link">
    <img
      src={item.cover_image_url || 'https://placehold.co/400x400?text=No+Image'}
      alt={item.title || 'Catalogue'}
      className="card-image"
      loading="lazy" // Added lazy loading for images
    />
    <div className="card-info">
      <h4>{item.title || 'Untitled Catalogue'}</h4>
      <p className="card-subtext">{item.artist?.full_name || 'Unknown Artist'}</p>
    </div>
  </Link>
);

const ArtistCard = ({ item }: { item: AppProfile }) => (
  <Link to={`/u/${item.slug}`} className="card-link">
    <img
      src={item.avatar_url || 'https://placehold.co/400x400?text=No+Image'}
      alt={item.full_name || 'Artist'}
      className="card-image"
      loading="lazy" // Added lazy loading for images
    />
    <div className="card-info">
      <h4>{item.full_name || 'Untitled Artist'}</h4>
      <p className="card-subtext artist-bio">{item.short_bio}</p>
    </div>
  </Link>
);

// --- Reusable Carousel with Error/Empty States ---
const ContentCarousel = ({
  title,
  data,
  isLoading,
  isError, // Added for error handling
  error,   // Added for error message
  renderCard,
}: {
  title: string;
  data: any[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  renderCard: (item: any) => React.ReactNode;
}) => (
  <section className="carousel-section">
    <h2 className="carousel-title">{title}</h2>
    {isLoading ? (
      <div
        className="carousel-loading-skeleton"
        style={{ height: '250px', background: 'var(--color-neutral-200)', borderRadius: 'var(--radius-md)' }}
      >
        <p style={{ textAlign: 'center', lineHeight: '250px', color: 'var(--color-neutral-500)' }}>
          Loading {title}...
        </p>
      </div>
    ) : isError ? (
      <div className="carousel-message error" role="alert">
        <p>Error loading {title}: {error?.message || 'Please try again later.'}</p>
      </div>
    ) : data && data.length > 0 ? (
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={24}
        slidesPerView={1.5}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        breakpoints={{
          640: { slidesPerView: 2.5, spaceBetween: 24 },
          768: { slidesPerView: 3, spaceBetween: 24 },
          1024: { slidesPerView: 4, spaceBetween: 30 },
          1280: { slidesPerView: 5, spaceBetween: 30 },
        }}
        className="content-swiper"
      >
        {data.map(item => (
          <SwiperSlide key={item.id}>{renderCard(item)}</SwiperSlide>
        ))}
      </Swiper>
    ) : (
      <div className="carousel-message empty">
        <Info size={24} />
        <p>No {title.toLowerCase()} found at the moment. Check back later!</p>
      </div>
    )}
  </section>
);

const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="feature-card">
    <div className="feature-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{children}</p>
  </div>
);

// --- Main Marketing Page ---
const MarketingPage = () => {
  const { data: featuredArtworks, isLoading: isLoadingArtworks, isError: isErrorArtworks, error: errorArtworks } = useQuery<AppArtwork[], Error>({
    queryKey: ['featuredArtworks'],
    queryFn: () => fetchRandomArtworks(ARTWORK_LIMIT),
  });

  const { data: featuredCatalogues, isLoading: isLoadingCatalogues, isError: isErrorCatalogues, error: errorCatalogues } = useQuery<AppCatalogue[], Error>({
    queryKey: ['featuredCatalogues'],
    queryFn: () => fetchRandomCatalogues(CATALOGUE_LIMIT),
  });

  const { data: featuredArtists, isLoading: isLoadingArtists, isError: isErrorArtists, error: errorArtists } = useQuery<AppProfile[], Error>({
    queryKey: ['featuredArtists'],
    queryFn: () => fetchRandomArtists(ARTIST_LIMIT),
  });

  return (
    <div className="marketing-page-container">
      <header id="hero">
        <h1 className="hero-title">Art, sorted</h1>
        <p className="hero-subtitle">
          The essential platform for artists to manage their inventory, build their brand, and connect with serious collectors.
        </p>
        <div className="hero-actions">
          <Link to="/start" className="button button-primary button-lg">
            Get started
          </Link>
        </div>
      </header>

      <ContentCarousel
        title="Featured Artworks"
        data={featuredArtworks}
        isLoading={isLoadingArtworks}
        isError={isErrorArtworks}
        error={errorArtworks}
        renderCard={item => <ArtworkCard item={item} />}
      />

      {/* Conditional rendering for catalogue carousel only if there might be data */}
      <ContentCarousel
        title="Featured Catalogues"
        data={featuredCatalogues}
        isLoading={isLoadingCatalogues}
        isError={isErrorCatalogues}
        error={errorCatalogues}
        renderCard={item => <CatalogueCard item={item} />}
      />

      <ContentCarousel
        title="Featured Artists"
        data={featuredArtists}
        isLoading={isLoadingArtists}
        isError={isErrorArtists}
        error={errorArtists}
        renderCard={item => <ArtistCard item={item} />}
      />

      <footer>
        <h2>Ready to Take Control of Your Art Career?</h2>
        <p>Join a community of professional artists and discerning collectors today.</p>
        <Link to="/start" className="button button-primary button-lg">
          Get Started For Free
        </Link>
      </footer>
    </div>
  );
};

export default MarketingPage;