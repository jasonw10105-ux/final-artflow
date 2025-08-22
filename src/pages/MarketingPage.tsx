// src/pages/MarketingPage.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

// --- TYPE DEFINITIONS for strict type safety ---
interface Artwork {
    id: string; title: string; image_url: string; slug: string; price: number;
    profiles: { full_name: string; slug: string; };
}
interface Catalogue {
    id: string; title: string; cover_image_url: string; slug: string;
    profiles: { full_name: string; slug: string; };
}
interface Artist {
    id: string; full_name: string; avatar_url: string; slug: string; bio: string;
}

// --- API FUNCTIONS to call the database RPCs ---
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

// --- GENERIC UI CARD COMPONENTS ---
const ArtworkCard = ({ item }: { item: Artwork }) => (
    // --- FIXED: Link updated to the new URL structure ---
    <Link to={`/${item.profiles.slug}/artwork/${item.slug}`} className="card-link">
        <img src={item.image_url} alt={item.title} className="card-image" />
        <div className="card-info">
            <h4>{item.title}</h4>
            <p className="card-subtext">{item.profiles.full_name}</p>
            <p className="card-price">${item.price}</p>
        </div>
    </Link>
);

const CatalogueCard = ({ item }: { item: Catalogue }) => (
    // --- FIXED: Link updated to the new URL structure ---
    <Link to={`/${item.profiles.slug}/catalogue/${item.slug}`} className="card-link">
        <img src={item.cover_image_url || 'https://placehold.co/600x600'} alt={item.title} className="card-image" />
        <div className="card-info">
            <h4>{item.title}</h4>
            <p className="card-subtext">by {item.profiles.full_name}</p>
        </div>
    </Link>
);

const ArtistCard = ({ item }: { item: Artist }) => (
     <Link to={`/${item.slug}`} className="card-link">
        <img src={item.avatar_url || 'https://placehold.co/600x600'} alt={item.full_name} className="card-image" />
        <div className="card-info">
            <h4>{item.full_name}</h4>
            <p className="card-subtext artist-bio">{item.bio}</p>
        </div>
    </Link>
);

// --- GENERIC CAROUSEL COMPONENT ---
const ContentCarousel = ({ title, data, isLoading, renderCard }: { title: string, data: any[] | undefined, isLoading: boolean, renderCard: (item: any) => React.ReactNode }) => (
    <section style={{ marginTop: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>{title}</h2>
        <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
            {isLoading ? <p>Loading...</p> : data?.map(item => renderCard(item))}
        </div>
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
        queryFn: () => fetchRandomCatalogues(5),
    });
    const { data: featuredArtists, isLoading: isLoadingArtists } = useQuery({
        queryKey: ['featuredArtists'],
        queryFn: () => fetchRandomArtists(5),
    });

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
            <style>{`
                .card-link { text-decoration: none; color: inherit; flex-shrink: 0; width: 300px; }
                .card-image { width: 100%; height: 280px; object-fit: cover; border-radius: var(--radius); }
                .card-info { padding-top: 1rem; }
                .card-subtext { color: var(--muted-foreground); font-size: 0.875rem; margin-top: 0.25rem; }
                .card-price { color: var(--primary); font-weight: 600; margin-top: 0.5rem; }
                .artist-bio { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            `}</style>
            
            <header style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Art, managed</h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--muted-foreground)', marginBottom: '2rem' }}>For artists to build their careers and for collectors to discover their next acquisition</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <Link to="/register"><button className="button button-primary">Get started for free</button></Link>
                </div>
            </header>

            <ContentCarousel title="Featured Artworks" data={featuredArtworks} isLoading={isLoadingArtworks} renderCard={(item: Artwork) => <ArtworkCard key={item.id} item={item} />} />
            <ContentCarousel title="Featured Catalogues" data={featuredCatalogues} isLoading={isLoadingCatalogues} renderCard={(item: Catalogue) => <CatalogueCard key={item.id} item={item} />} />
            <ContentCarousel title="Featured Artists" data={featuredArtists} isLoading={isLoadingArtists} renderCard={(item: Artist) => <ArtistCard key={item.id} item={item} />} />
        </div>
    );
};
export default MarketingPage;