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

interface Artwork {
  id: string;
  title: string | null;
  image_url: string | null;
  slug: string;
  price: number | null;
  profiles: { full_name: string | null; slug: string };
}

interface Catalogue {
  id: string;
  title: string | null;
  cover_image_url: string | null;
  slug: string;
  profiles: { full_name: string | null; slug: string };
}

interface Artist {
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
const fetchRandomArtworks = async (count: number): Promise<Artwork[]> => {
  const { data, error } = await supabase.rpc('get_random_artworks', { limit_count: count });
  if (error) throw new Error(error.message);
  return (data || []).map((art: any) => ({
    ...art,
    profiles: { full_name: art.profile_full_name, slug: art.profile_slug },
  }));
};

const fetchRandomCatalogues = async (count: number): Promise<Catalogue[]> => {
  const { data, error } = await supabase.rpc('get_random_catalogues', { limit_count: count });
  if (error) throw new Error(error.message);
  // Only include catalogues that have at least 1 artwork
  return (data || []).filter((cat: any) => cat.artwork_count > 0).map((cat: any) => ({
    ...cat,
    profiles: { full_name: cat.profile_full_name, slug: cat.profile_slug },
  }));
};

const fetchRandomArtists = async (count: number): Promise<Artist[]> => {
  const { data, error } = await supabase.rpc('get_random_artists', { limit_count: count });
  if (error) throw new Error(error.message);
  return data || [];
};

// --- Reusable Card Components ---
const ArtworkCard = ({ item }: { item: Artwork }) => (
  <Link to={`/artwork/${item.slug}`} className="card-link">
    <img
      src={item.image_url || 'https://placehold.co/400x400?text=No+Image'}
      alt={item.title || 'Artwork'}
      className="card-image"
      loading="lazy" // Added lazy loading for images
    />
    <div className="card-info">
      <h4>{item.title || 'Untitled'}</h4>
      <p className="card-subtext">{item.profiles.full_name || 'Unknown Artist'}</p>
      {item.price != null && <p className="card-price">${item.price.toLocaleString()}</p>}
    </div>
  </Link>
);

const CatalogueCard = ({ item }: { item: Catalogue }) => (
  <Link to={`/${item.profiles.slug}/catalogue/${item.slug}`} className="card-link">
    <img
      src={item.cover_image_url || 'https://placehold.co/400x400?text=No+Image'}
      alt={item.title || 'Catalogue'}
      className="card-image"
      loading="lazy" // Added lazy loading for images
    />
    <div className="card-info">
      <h4>{item.title || 'Untitled Catalogue'}</h4>
      <p className="card-subtext">{item.profiles.full_name || 'Unknown Artist'}</p>
    </div>
  </Link>
);

const ArtistCard = ({ item }: { item: Artist }) => (
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

const TestimonialCard = ({ quote, author, title }: { quote: string; author: string; title: string }) => (
  <div className="testimonial-card">
    <blockquote>"{quote}"</blockquote>
    <cite>
      <strong>{author}</strong>, {title}
    </cite>
  </div>
);

// --- Main Marketing Page ---
const MarketingPage = () => {
  const { data: featuredArtworks, isLoading: isLoadingArtworks, isError: isErrorArtworks, error: errorArtworks } = useQuery({
    queryKey: ['featuredArtworks'],
    queryFn: () => fetchRandomArtworks(ARTWORK_LIMIT),
  });

  const { data: featuredCatalogues, isLoading: isLoadingCatalogues, isError: isErrorCatalogues, error: errorCatalogues } = useQuery({
    queryKey: ['featuredCatalogues'],
    queryFn: () => fetchRandomCatalogues(CATALOGUE_LIMIT),
  });

  const { data: featuredArtists, isLoading: isLoadingArtists, isError: isErrorArtists, error: errorArtists } = useQuery({
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
          <Link to="/register" className="button button-primary button-lg">
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

      <section className="marketing-section text-center">
        <h2>A Seamless Experience for Artists & Collectors</h2>
        <div className="how-it-works-grid">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Upload & Organize</h3>
            <p>Easily upload your artwork, manage editions, and track every detail from dimensions to provenance.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Curate & Share</h3>
            <p>Create stunning private or public catalogues for exhibitions, clients, or your personal portfolio.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Connect & Sell</h3>
            <p>Engage with collectors through a secure messaging portal and manage sales from inquiry to invoice.</p>
          </div>
        </div>
      </section>

      {/* Conditional rendering for catalogue carousel only if there might be data */}
      <ContentCarousel
        title="Featured Catalogues"
        data={featuredCatalogues}
        isLoading={isLoadingCatalogues}
        isError={isErrorCatalogues}
        error={errorCatalogues}
        renderCard={item => <CatalogueCard item={item} />}
      />


      <section className="marketing-section">
        <h2 className="text-center">Powerful Tools, Effortless Management</h2>
        <div className="features-grid">
          <FeatureCard icon={<Palette size={32} />} title="Inventory Management">
            A complete, professional system to track your entire collection, including editions, sales history, and private notes.
          </FeatureCard>
          <FeatureCard icon={<BarChart size={32} />} title="Sales & Insights">
            Monitor your sales, view revenue analytics, and understand which pieces are getting the most attention from collectors.
          </FeatureCard>
          <FeatureCard icon={<MessageSquare size={32} />} title="Direct Communication">
            A built-in messaging center to handle inquiries directly, negotiate sales, and build relationships with your buyers.
          </FeatureCard>
          <FeatureCard icon={<ShieldCheck size={32} />} title="Secure & Private">
            You control what's public. Share private catalogues with specific contacts or keep your entire inventory private.
          </FeatureCard>
        </div>
      </section>

      <section className="marketing-section testimonials">
        <h2 className="text-center">Trusted by Artists and Collectors</h2>
        <div className="testimonial-grid">
          <TestimonialCard
            quote="ArtFlow has become the backbone of my studio practice. I spend less time on admin and more time creating."
            author="Elena Vance"
            title="Contemporary Painter"
          />
          <TestimonialCard
            quote="As a collector, the ability to view curated catalogues and inquire directly with the artist is a game-changer."
            author="Marcus Thorne"
            title="Private Collector"
          />
        </div>
      </section>

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
        <Link to="/register" className="button button-primary button-lg">
          Get Started For Free
        </Link>
      </footer>
    </div>
  );
};

export default MarketingPage;