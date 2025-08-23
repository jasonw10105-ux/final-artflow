import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

// Import Swiper React components and modules
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// --- TYPE DEFINITIONS ---
interface Artwork {
    id: string; title: string; image_url: string; slug: string; price: number;
    profiles: { full_name: string; slug: string; };
}
interface Catalogue {
    id: string; title: string; cover_image_url: string; slug: string;
    profiles: { full_name: string; slug: string; };
}
interface Artist {
    id: string; full_name: string; avatar_url: string; slug: string; short_bio: string;
}

// --- API FUNCTIONS ---
const fetchRandomArtworks = async (count: number): Promise<Artwork[]> => {
    const { data, error } = await supabase.rpc('get_random_artworks', { limit_count: count });
    if (error) throw new Error(error.message);
    return (data || []).map((art: any) => ({
        ...art, profiles: { full_name: art.profile_full_name, slug: art.profile_slug }
    }));
};
const fetchRandomCatalogues = async (count: number): Promise<Catalogue[]> => {
    const { data, error } = await supabase.rpc('get_random_catalogues', { limit_count: count });
    if (error) throw new Error(error.message);
    return (data || []).map((cat: any) => ({
        ...cat, profiles: { full_name: cat.profile_full_name, slug: cat.profile_slug }
    }));
};
const fetchRandomArtists = async (count: number): Promise<Artist[]> => {
    const { data, error } = await supabase.rpc('get_random_artists', { limit_count: count });
    if (error) throw new Error(error.message);
    return data || [];
};

// --- UI CARD COMPONENTS ---
const ArtworkCard = ({ item }: { item: Artwork }) => (
    <Link to={`/${item.profiles.slug}/artwork/${item.slug}`} className="card-link">
        <img src={item.image_url} alt={item.title} className="card-image" />
        <div className="card-info">
            <h4>{item.title}</h4>
            <p className="card-subtext">{item.profiles.full_name}</p>
            <p className="card-price">${item.price.toLocaleString()}</p>
        </div>
    </Link>
);

const CatalogueCard = ({ item }: { item: Catalogue }) => (
    <Link to={`/${item.profiles.slug}/catalogue/${item.slug}`} className="card-link">
        <img src={item.cover_image_url || 'https://placehold.co/400x400'} alt={item.title} className="card-image" />
        <div className="card-info">
            <h4>{item.title}</h4>
            <p className="card-subtext">{item.profiles.full_name}</p>
        </div>
    </Link>
);

const ArtistCard = ({ item }: { item: Artist }) => (
     <Link to={`/${item.slug}`} className="card-link">
        <img src={item.avatar_url || 'https://placehold.co/400x400'} alt={item.full_name} className="card-image" />
        <div className="card-info">
            <h4>{item.full_name}</h4>
            <p className="card-subtext artist-bio">{item.short_bio}</p>
        </div>
    </Link>
);

// --- REFACTORED CAROUSEL COMPONENT USING SWIPER ---
const ContentCarousel = ({ title, data, isLoading, renderCard }: { title: string, data: any[] | undefined, isLoading: boolean, renderCard: (item: any) => React.ReactNode }) => (
    <section className="carousel-section">
        <h2 className="carousel-title">{title}</h2>
        {isLoading ? (
            <p>Loading...</p>
        ) : (
            <Swiper
                modules={[Navigation, Pagination]}
                spaceBetween={24}
                slidesPerView={1.5}
                navigation
                pagination={{ clickable: true }}
                breakpoints={{
                    640: { slidesPerView: 2.5, spaceBetween: 24 },
                    768: { slidesPerView: 3, spaceBetween: 24 },
                    1024: { slidesPerView: 4, spaceBetween: 30 },
                    1280: { slidesPerView: 5, spaceBetween: 30 },
                }}
                className="content-swiper"
            >
                {data?.map(item => (
                    <SwiperSlide key={item.id}>
                        {renderCard(item)}
                    </SwiperSlide>
                ))}
            </Swiper>
        )}
    </section>
);

// --- MAIN MARKETING PAGE COMPONENT ---
const MarketingPage = () => {
    const { data: featuredArtworks, isLoading: isLoadingArtworks } = useQuery({
        queryKey: ['featuredArtworks'],
        queryFn: () => fetchRandomArtworks(10),
    });
    const { data: featuredCatalogues, isLoading: isLoadingCatalogues } = useQuery({
        queryKey: ['featuredCatalogues'],
        queryFn: () => fetchRandomCatalogues(8),
    });
    const { data: featuredArtists, isLoading: isLoadingArtists } = useQuery({
        queryKey: ['featuredArtists'],
        queryFn: () => fetchRandomArtists(8),
    });

    return (
        <div className="marketing-page-container">
            <header className="hero-section">
                <h1 className="hero-title">Art, managed</h1>
                <p className="hero-subtitle">For artists to build their careers and for collectors to discover their next acquisition.</p>
                <div className="hero-actions">
                    <Link to="/register" className="button button-primary">Get started for free</Link>
                </div>
            </header>

            <ContentCarousel title="Featured Artworks" data={featuredArtworks} isLoading={isLoadingArtworks} renderCard={(item: Artwork) => <ArtworkCard item={item} />} />
            <ContentCarousel title="Featured Catalogues" data={featuredCatalogues} isLoading={isLoadingCatalogues} renderCard={(item: Catalogue) => <CatalogueCard item={item} />} />
            <ContentCarousel title="Featured Artists" data={featuredArtists} isLoading={isLoadingArtists} renderCard={(item: Artist) => <ArtistCard item={item} />} />
        </div>
    );
};
export default MarketingPage;