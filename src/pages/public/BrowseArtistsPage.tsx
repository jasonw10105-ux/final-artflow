// src/pages/public/BrowseArtistsPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Link } from 'react-router-dom';
import { Database } from '@/types/database.types';
import { useAuth } from '@/contexts/AuthProvider';
import { UserPlus, TrendingUp, Sparkles } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

// --- TYPE DEFINITIONS ---
type Profile = Database['public']['Tables']['profiles']['Row'];
type ArtworkPreview = { id: string; image_url: string; slug: string; };
interface ArtistWithExtras extends Profile {
    follower_count: number;
    artwork_previews: ArtworkPreview[];
}
interface ArtistDiscoveryLists {
    rising_talent: ArtistWithExtras[];
    trending_artists: ArtistWithExtras[];
    personalized_suggestions: ArtistWithExtras[];
}

// --- DATA FETCHING ---
const fetchArtistDiscoveryLists = async (userId?: string): Promise<ArtistDiscoveryLists> => {
    const { data, error } = await supabase.rpc('get_artist_discovery_lists', { p_collector_id: userId });
    if (error) throw new Error(error.message);
    return data;
};

// --- HELPER COMPONENT: Artist Card ---
const ArtistCard = ({ artist }: { artist: ArtistWithExtras }) => (
    <div className="artist-discovery-card">
        <Swiper className="artist-card-swiper" spaceBetween={0} slidesPerView={1}>
            {artist.artwork_previews.map(art => (
                <SwiperSlide key={art.id}>
                    <Link to={`/${artist.slug}/artwork/${art.slug}`}>
                        <img src={art.image_url} alt="Artwork Preview" className="artist-card-artwork-image" />
                    </Link>
                </SwiperSlide>
            ))}
        </Swiper>
        <div className="artist-card-info">
            <Link to={`/${artist.slug}`} className="artist-card-avatar-link">
                <img src={artist.avatar_url || '/placeholder.png'} alt={artist.full_name || 'Artist'} className="artist-card-avatar" />
            </Link>
            <h3 className="artist-card-name"><Link to={`/${artist.slug}`}>{artist.full_name}</Link></h3>
            <p className="artist-card-followers">{artist.follower_count} Followers</p>
            <button className="button button-secondary button-sm w-full mt-2"><UserPlus size={14}/> Follow</button>
        </div>
    </div>
);

// --- MAIN COMPONENT ---
const BrowseArtistsPage = () => {
    const { user } = useAuth();
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['artistDiscovery', user?.id],
        queryFn: () => fetchArtistDiscoveryLists(user?.id),
    });

    if (isLoading) return <div className="page-container"><p className="loading-message">Loading artists...</p></div>;
    if (isError) return <div className="page-container"><p className="error-message">Error loading artists: {error.message}</p></div>;

    return (
        <div className="page-container">
            <h1 className="page-title">Discover Artists</h1>
            <p className="page-subtitle">Find your next favorite artist through curated and personalized selections.</p>
            
            {data?.personalized_suggestions && data.personalized_suggestions.length > 0 && (
                <div className="discovery-section">
                    <h2 className="section-title"><Sparkles size={24}/> Recommended For You</h2>
                    <div className="artist-grid">
                        {data.personalized_suggestions.map(artist => <ArtistCard key={artist.id} artist={artist} />)}
                    </div>
                </div>
            )}
            {data?.trending_artists && data.trending_artists.length > 0 && (
                <div className="discovery-section">
                    <h2 className="section-title"><TrendingUp size={24}/> Trending Artists This Week</h2>
                    <div className="artist-grid">
                        {data.trending_artists.map(artist => <ArtistCard key={artist.id} artist={artist} />)}
                    </div>
                </div>
            )}
            {data?.rising_talent && data.rising_talent.length > 0 && (
                <div className="discovery-section">
                    <h2 className="section-title">Rising Talent</h2>
                    <div className="artist-grid">
                        {data.rising_talent.map(artist => <ArtistCard key={artist.id} artist={artist} />)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrowseArtistsPage;