// pages/MarketingPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Swiper, SwiperSlide } from 'swiper/react';
// FIX: Re-added Autoplay module for the carousel functionality
import { Navigation, Pagination, Autoplay } from 'swiper/modules'; 
import { Palette, BarChart, MessageSquare, ShieldCheck, Users as UsersIcon } from 'lucide-react'; // Renamed Users to UsersIcon to avoid conflict
// FIX: Assuming you have a Header component for your marketing layout.
// If this is not the case, remove this import and the <Header /> tag.
import Header from '../../components/layout/Header'; 

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/autoplay'; // Import autoplay CSS

// --- TYPE DEFINITIONS (No changes needed) ---
interface Artwork {
    id: string; title: string | null; image_url: string | null; slug: string; price: number | null;
    profiles: { full_name: string | null; slug: string; };
}
interface Catalogue {
    id:string; title: string | null; cover_image_url: string | null; slug: string;
    profiles: { full_name: string | null; slug: string; };
}
interface Artist {
    id: string; full_name: string | null; avatar_url: string | null; slug: string; short_bio: string | null;
}

// --- API FUNCTIONS (No changes needed) ---
// Note: Ensure your Supabase RPC functions `get_random_artworks`, `get_random_catalogues`,
// and `get_random_artists` are correctly defined in your Supabase project and are efficient.
// Slow database queries or RPC functions are a common cause of slow loading carousels.
const fetchRandomArtworks = async (count: number): Promise<Artwork[]> => {
    const { data, error } = await supabase.rpc('get_random_artworks', { limit_count: count });
    if (error) {
        console.error("Error fetching random artworks:", error);
        throw new Error(error.message);
    }
    return (data || []).map((art: any) => ({ ...art, profiles: { full_name: art.profile_full_name, slug: art.profile_slug } }));
};
const fetchRandomCatalogues = async (count: number): Promise<Catalogue[]> => {
    const { data, error } = await supabase.rpc('get_random_catalogues', { limit_count: count });
    if (error) {
        console.error("Error fetching random catalogues:", error);
        throw new Error(error.message);
    }
    return (data || []).map((cat: any) => ({ ...cat, profiles: { full_name: cat.profile_full_name, slug: cat.profile_slug } }));
};
const fetchRandomArtists = async (count: number): Promise<Artist[]> => {
    const { data, error } = await supabase.rpc('get_random_artists', { limit_count: count });
    if (error) {
        console.error("Error fetching random artists:", error);
        throw new Error(error.message);
    }
    return data || [];
};

// --- UI CARD COMPONENTS (No changes needed) ---
const ArtworkCard = ({ item }: { item: Artwork }) => (
    <Link to={`/artwork/${item.slug}`} className="card-link">
        <img src={item.image_url || 'https://placehold.co/400x400?text=No+Image'} alt={item.title || 'Artwork'} className="card-image" />
        <div className="card-info">
            <h4>{item.title || 'Untitled'}</h4>
            <p className="card-subtext">{item.profiles.full_name || 'Unknown Artist'}</p>
            {item.price != null && <p className="card-price">${item.price.toLocaleString()}</p>}
        </div>
    </Link>
);
const CatalogueCard = ({ item }: { item: Catalogue }) => (
    <Link to={`/${item.profiles.slug}/catalogue/${item.slug}`} className="card-link">
        <img src={item.cover_image_url || 'https://placehold.co/400x400?text=No+Image'} alt={item.title || 'Catalogue'} className="card-image" />
        <div className="card-info">
            <h4>{item.title || 'Untitled Catalogue'}</h4>
            <p className="card-subtext">{item.profiles.full_name || 'Unknown Artist'}</p>
        </div>
    </Link>
);
const ArtistCard = ({ item }: { item: Artist }) => (
     <Link to={`/u/${item.slug}`} className="card-link">
        <img src={item.avatar_url || 'https://placehold.co/400x400?text=No+Image'} alt={item.full_name || 'Artist'} className="card-image" />
        <div className="card-info">
            <h4>{item.full_name || 'Untitled Artist'}</h4>
            <p className="card-subtext artist-bio">{item.short_bio}</p>
        </div>
    </Link>
);

// --- REUSABLE CAROUSEL COMPONENT ---
const ContentCarousel = ({ title, data, isLoading, renderCard }: { title: string, data: any[] | undefined, isLoading: boolean, renderCard: (item: any) => React.ReactNode }) => (
    <section className="carousel-section">
        <h2 className="carousel-title">{title}</h2>
        {isLoading ? ( 
            // FIX: Add a simple loading spinner or skeleton for better UX
            <div className="carousel-loading-skeleton" style={{ height: '250px', background: 'var(--color-neutral-200)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ textAlign: 'center', lineHeight: '250px', color: 'var(--color-neutral-500)' }}>Loading {title}...</p>
            </div>
        ) : (
            data && data.length > 0 ? ( // FIX: Only render Swiper if there's data
                <Swiper
                    modules={[Navigation, Pagination, Autoplay]} // FIX: Added Autoplay
                    spaceBetween={24}
                    slidesPerView={1.5}
                    navigation
                    pagination={{ clickable: true }}
                    autoplay={{ delay: 5000, disableOnInteraction: false }} // FIX: Autoplay configuration
                    breakpoints={{
                        640: { slidesPerView: 2.5, spaceBetween: 24 },
                        768: { slidesPerView: 3, spaceBetween: 24 },
                        1024: { slidesPerView: 4, spaceBetween: 30 },
                        1280: { slidesPerView: 5, spaceBetween: 30 },
                    }}
                    className="content-swiper"
                >
                    {data.map(item => ( <SwiperSlide key={item.id}> {renderCard(item)} </SwiperSlide> ))}
                </Swiper>
            ) : (
                <p>No {title.toLowerCase()} available at the moment.</p>
            )
        )}
    </section>
);

// --- NEW MARKETING SECTION COMPONENTS ---
const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
    <div className="feature-card">
        <div className="feature-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{children}</p>
    </div>
);

const TestimonialCard = ({ quote, author, title }: { quote: string, author: string, title: string }) => (
    <div className="testimonial-card">
        <blockquote>"{quote}"</blockquote>
        <cite><strong>{author}</strong>, {title}</cite>
    </div>
);

// --- MAIN MARKETING PAGE COMPONENT ---
const MarketingPage = () => {
    // Added error handling to useQuery hooks for better debugging
    const { data: featuredArtworks, isLoading: isLoadingArtworks, isError: isErrorArtworks, error: errorArtworks } = useQuery({ 
        queryKey: ['featuredArtworks'], 
        queryFn: () => fetchRandomArtworks(10),
        staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
        cacheTime: 30 * 60 * 1000 // Data kept in cache for 30 minutes
    });
    const { data: featuredCatalogues, isLoading: isLoadingCatalogues, isError: isErrorCatalogues, error: errorCatalogues } = useQuery({ 
        queryKey: ['featuredCatalogues'], 
        queryFn: () => fetchRandomCatalogues(8),
        staleTime: 5 * 60 * 1000,
        cacheTime: 30 * 60 * 1000
    });
    const { data: featuredArtists, isLoading: isLoadingArtists, isError: isErrorArtists, error: errorArtists } = useQuery({ 
        queryKey: ['featuredArtists'], 
        queryFn: () => fetchRandomArtists(8),
        staleTime: 5 * 60 * 1000,
        cacheTime: 30 * 60 * 1000
    });

    // Log errors for debugging
    React.useEffect(() => {
        if (isErrorArtworks) console.error("Featured Artworks Query Error:", errorArtworks);
        if (isErrorCatalogues) console.error("Featured Catalogues Query Error:", errorCatalogues);
        if (isErrorArtists) console.error("Featured Artists Query Error:", errorArtists);
    }, [isErrorArtworks, errorArtworks, isErrorCatalogues, errorCatalogues, isErrorArtists, errorArtists]);

    return (
        <>
            {/* FIX: Render the Header component. Make sure this Header is appropriate for your marketing layout. */}
            <Header /> 
            <div className="marketing-page-container">
                <header className="hero-section">
                    <h1 className="hero-title">Your Art Career, Elevated.</h1>
                    <p className="hero-subtitle">The essential platform for artists to manage their inventory, build their brand, and connect with serious collectors.</p>
                    <div className="hero-actions">
                        <Link to="/register" className="button button-primary button-lg">Start Your Free Trial</Link>
                        <Link to="/artworks" className="button button-secondary button-lg">Explore Art</Link>
                    </div>
                </header>

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
                
                <ContentCarousel title="Featured Artworks" data={featuredArtworks} isLoading={isLoadingArtworks} renderCard={(item: Artwork) => <ArtworkCard item={item} />} />
                
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

                <ContentCarousel title="Featured Catalogues" data={featuredCatalogues} isLoading={isLoadingCatalogues} renderCard={(item: Catalogue) => <CatalogueCard item={item} />} />

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
                
                <ContentCarousel title="Featured Artists" data={featuredArtists} isLoading={isLoadingArtists} renderCard={(item: Artist) => <ArtistCard item={item} />} />
                
                <section className="marketing-section final-cta">
                     <h2>Ready to Take Control of Your Art Career?</h2>
                     <p>Join a community of professional artists and discerning collectors today.</p>
                     <Link to="/register" className="button button-primary button-lg">Get Started For Free</Link>
                </section>
            </div>
        </>
    );
};

export default MarketingPage;