// src/pages/BrowseArtworksPage.tsx
import React, { useState, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { AppArtwork, ProfileRow } from '@/types/app.types';
import '@/styles/app.css';
import { Heart, Search, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';

// --- TYPE DEFINITIONS ---
type ArtworkWithArtist = AppArtwork & {
  artist: ProfileRow | null;
  // --- NEW: Added for personalized sorting ---
  recommendation_reason?: string;
  rank_score?: number;
};

const ARTWORKS_PER_PAGE = 12;

// --- DATA FETCHING ---
const fetchArtworks = async ({ pageParam = 0, queryKey }: { pageParam?: number; queryKey: any }): Promise<ArtworkWithArtist[]> => {
  const [_, { sort, searchQuery, filterMedium, filterStyle, userId }] = queryKey;
  
  let query = supabase.from('artworks').select('*, artist:profiles!user_id(*)').eq('status', 'available');

  // Apply text search
  if (searchQuery) {
    query = query.textSearch('fts', searchQuery, { type: 'websearch' });
  }

  // Apply filters
  if (filterMedium !== 'all') query = query.eq('medium', filterMedium);
  if (filterStyle !== 'all') query = query.eq('style', filterStyle);
  
  // Handle Sorting
  if (sort === 'recommended' && userId) {
    // --- NEW: Call the personalized RPC ---
    const { data, error } = await supabase.rpc('get_personalized_artworks', {
        p_collector_id: userId,
        p_limit: ARTWORKS_PER_PAGE,
        p_offset: pageParam * ARTWORKS_PER_PAGE
    });
    if (error) throw error;
    return data as ArtworkWithArtist[];
  } else {
    // Standard sorting
    const from = pageParam * ARTWORKS_PER_PAGE;
    const to = from + ARTWORKS_PER_PAGE - 1;
    if (sort === 'newest') query = query.order('created_at', { ascending: false });
    if (sort === 'price_asc') query = query.order('price', { ascending: true });
    if (sort === 'price_desc') query = query.order('price', { ascending: false });
    
    const { data, error } = await query.range(from, to);
    if (error) throw error;
    return data as ArtworkWithArtist[];
  }
};

const BrowseArtworksPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMedium, setFilterMedium] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');
  const [sort, setSort] = useState('recommended'); // --- NEW: Default to personalized sort

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['browseArtworks', { sort, searchQuery, filterMedium, filterStyle, userId: user?.id }],
    queryFn: fetchArtworks,
    getNextPageParam: (lastPage, allPages) => {
        // If the last page had fewer items than requested, we're at the end
        return lastPage.length < ARTWORKS_PER_PAGE ? undefined : allPages.length;
    },
  });

  const artworks = useMemo(() => data?.pages.flatMap(page => page) ?? [], [data]);

  const availableMediums = ['all', 'Oil on Canvas', 'Sculpture', 'Photography', 'Digital']; // Example
  const availableStyles = ['all', 'Abstract', 'Figurative', 'Impressionism', 'Pop Art']; // Example

  if (isLoading && !data) {
    return <div className="page-container"><p className="loading-message">Loading artworks...</p></div>;
  }
  if (error) {
    return <div className="page-container"><p className="error-message">Error loading artworks: {error.message}</p></div>;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Discover Artworks</h1>
      <p className="page-subtitle">Explore a curated selection of contemporary art, personalized for you.</p>

      <div className="filter-controls mb-8 flex flex-wrap gap-4 items-center">
        <div className="relative flex-grow min-w-[250px]">
          <input type="text" placeholder="Search by title, artist, medium..." className="input pr-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        </div>
        <select className="select" value={filterMedium} onChange={(e) => setFilterMedium(e.target.value)}>
          {availableMediums.map(m => <option key={m} value={m}>{m === 'all' ? 'All Mediums' : m}</option>)}
        </select>
        <select className="select" value={filterStyle} onChange={(e) => setFilterStyle(e.target.value)}>
          {availableStyles.map(s => <option key={s} value={s}>{s === 'all' ? 'All Styles' : s}</option>)}
        </select>
        {/* --- NEW: Enhanced Sort Options --- */}
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {user && <option value="recommended">Recommended for You</option>}
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      <div className="artwork-grid">
        {artworks.length > 0 ? (
          artworks.map((artwork) => {
            const imageUrl = artwork.artwork_images?.[0]?.image_url || 'https://placehold.co/400x400?text=No+Image';
            return (
              <div key={artwork.id} className="artwork-card relative">
                {/* --- NEW: Recommendation Reason Badge --- */}
                {artwork.recommendation_reason && (
                    <div className="recommendation-badge">
                        <Sparkles size={14} /> {artwork.recommendation_reason}
                    </div>
                )}
                <Link to={`/${artwork.artist?.slug}/artwork/${artwork.slug}`} className="artwork-card-link">
                  <img src={imageUrl} alt={artwork.title || 'Artwork'} className="artwork-card-image" />
                  <div className="artwork-card-info">
                    <h3 className="artwork-card-title">{artwork.title}</h3>
                    <p className="artwork-card-artist">{artwork.artist?.full_name || 'Unknown Artist'}</p>
                    {artwork.price && (
                      <p className="artwork-card-price">{new Intl.NumberFormat('en-US', { style: 'currency', currency: artwork.currency || 'USD' }).format(artwork.price)}</p>
                    )}
                  </div>
                </Link>
                {/* --- NEW: Quick Like Button --- */}
                <button className="quick-like-button">
                    <Heart size={20} />
                </button>
              </div>
            );
          })
        ) : (
          <p className="col-span-full text-center text-muted-foreground py-10">No artworks found matching your criteria.</p>
        )}
      </div>

      {/* --- NEW: Infinite Scroll Loader --- */}
      <div className="flex justify-center my-8">
        <button
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isFetchingNextPage}
          className="button button-secondary"
        >
          {isFetchingNextPage ? 'Loading more...' : hasNextPage ? 'Load More' : 'No more artworks'}
        </button>
      </div>
    </div>
  );
};

export default BrowseArtworksPage;