// src/pages/BrowseArtworksPage.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom'; // Added useLocation, useNavigate for URL params
import { supabase } from '@/lib/supabaseClient';
import { AppArtwork, AppProfile, AppArtworkImage } from '@/types/app.types';
import '@/styles/app.css';
import { Heart, Search, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { v4 as uuidv4 } from 'uuid';
import SeoHelmet from '../../components/SeoHelmet'; // Import SeoHelmet

// --- Debounce Hook (for search input) ---
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};


// --- TYPE DEFINITIONS ---
// Type for artwork data including artist profile and RPC-specific fields
type ArtworkWithArtist = AppArtwork & {
  artist: AppProfile | null; // Use AppProfile for consistency
  recommendation_reason?: string;
  rank_score?: number;
};

// Type for the RPC result from get_personalized_artworks
interface PersonalizedArtworkRPCResult {
  id: string;
  artist_id: string; // The user_id of the artist
  title: string;
  slug: string;
  artist: { slug: string; full_name?: string; avatar_url?: string; }; // Minimal artist info from RPC
  artwork_images: { image_url: string; position?: number; is_primary?: boolean }[]; // Minimal image info from RPC
  price: number;
  status: string;
  reaction: 'like' | 'dislike' | null;
  recommendation_reason: string;
  // If your RPC *does* return created_at/updated_at, ensure their types here match the RPC return,
  // and they are then correctly mapped below. Otherwise, default them to null.
  created_at?: string | null;
  updated_at?: string | null;
}

const ARTWORKS_PER_PAGE = 12;

// --- DATA FETCHING ---
const fetchArtworks = async ({ pageParam = 0, queryKey }: { pageParam?: number; queryKey: any }): Promise<ArtworkWithArtist[]> => {
  const [_, { sort, searchQuery, filterMedium, filterStyle, userId, artistSlug: filterArtistSlug }] = queryKey; // Added filterArtistSlug
  
  if (sort === 'recommended' && userId) {
    // --- Call the personalized RPC ---
    const { data, error } = await supabase.rpc('get_personalized_artworks', {
        p_collector_id: userId,
        p_limit: ARTWORKS_PER_PAGE,
        p_offset: pageParam * ARTWORKS_PER_PAGE
    });
    if (error) {
        console.error("Error fetching personalized artworks:", error);
        throw error;
    }
    // Map RPC result (PersonalizedArtworkRPCResult) to ArtworkWithArtist (which extends AppArtwork)
    return (data || []).map((rpcArt: PersonalizedArtworkRPCResult) => ({
        // Explicitly map all fields from AppArtwork, providing defaults or null for those not in RPC result
        id: rpcArt.id,
        user_id: rpcArt.artist_id, // Map artist_id from RPC to user_id in AppArtwork
        created_at: rpcArt.created_at || null, // Explicitly map or default to null
        updated_at: rpcArt.updated_at || null, // Explicitly map or default to null
        slug: rpcArt.slug,
        title: rpcArt.title,
        description: null, // Default
        price: rpcArt.price,
        status: rpcArt.status,
        is_price_negotiable: null, // Default
        min_price: null, // Default
        max_price: null, // Default
        dimensions: null, // Default
        location: null, // Default
        medium: null, // Default
        date_info: null, // Default
        signature_info: null, // Default
        framing_info: null, // Default
        provenance: null, // Default
        currency: 'USD', // Default currency. Ensure RPC or DB has this or a default is set.
        edition_info: null, // Default
        genre: null, // Default
        dominant_colors: null, // Default
        keywords: null, // Default
        subject: null, // Default
        orientation: null, // Default
        inventory_number: null, // Default
        private_note: null, // Default
        provenance_notes: null, // Default
        exhibitions: null, // Default
        literature: null, // Default
        has_certificate_of_authenticity: null, // Default
        certificate_of_authenticity_details: null, // Default
        condition: null, // Default
        rarity: null, // Default
        framing_status: null, // Default
        primary_image_url: rpcArt.artwork_images?.[0]?.image_url || null, // Best guess for primary image (FIXED)
        embedding: null, // EXPLICITLY NULL: RPCs typically don't return embeddings for general display
        condition_notes: null, // Default

        // Joined relations
        artist: { // Map to AppProfile structure
            id: rpcArt.artist_id,
            slug: rpcArt.artist.slug,
            full_name: rpcArt.artist.full_name || 'Unknown Artist',
            avatar_url: rpcArt.artist.avatar_url || null,
            // Provide defaults for all non-nullable AppProfile fields
            created_at: null, updated_at: null, email: '', is_admin: false,
            display_name: rpcArt.artist.full_name || 'Unknown Artist', first_name: null, last_name: null,
            short_bio: null, artist_statement: null, social_links: null, coa_settings: null,
            profile_completed: false, bio: null, location: null, username: null
        } as AppProfile, // Cast to AppProfile

        artwork_images: (rpcArt.artwork_images || []).map(img => ({
            id: uuidv4(), // Generate ID as RPC might not provide it
            artwork_id: rpcArt.id,
            image_url: img.image_url,
            is_primary: img.is_primary ?? true, // Assume primary if not specified
            position: img.position ?? 0,
            // Provide defaults for all non-nullable AppArtworkImage fields
            created_at: null, updated_at: null,
            watermarked_image_url: null, visualization_image_url: null,
        })) as AppArtworkImage[],
        recommendation_reason: rpcArt.recommendation_reason,
    })) as ArtworkWithArtist[];
  } else {
    // Standard sorting for direct Supabase query
    // Explicitly select ALL non-embedding columns from artworks table to match AppArtwork
    let query = supabase.from('artworks').select(`
        id, user_id, created_at, updated_at, slug, title, description,
        price, status, is_price_negotiable, min_price, max_price, dimensions,
        location, medium, date_info, signature_info, framing_info, provenance,
        currency, edition_info, genre, dominant_colors, keywords, subject,
        orientation, inventory_number, private_note, provenance_notes,
        exhibitions, literature, has_certificate_of_authenticity,
        certificate_of_authenticity_details, condition, rarity,
        framing_status, primary_image_url, condition_notes,
        artist:profiles!user_id(id, full_name, slug),
        artwork_images(id, image_url, watermarked_image_url, visualization_image_url, is_primary, position)
    `).eq('status', 'available'); // Ensure images are selected

    // Apply text search
    if (searchQuery) {
        query = query.textSearch('fts', searchQuery, { type: 'websearch' });
    }

    // Apply filters
    if (filterMedium !== 'all') query = query.eq('medium', filterMedium);
    if (filterStyle !== 'all') query = query.eq('style', filterStyle);
    if (filterArtistSlug) query = query.in('user_id', supabase.from('profiles').select('id').eq('slug', filterArtistSlug).limit(1)); // Filter by artist slug

    const from = pageParam * ARTWORKS_PER_PAGE;
    const to = from + ARTWORKS_PER_PAGE - 1;

    if (sort === 'newest') query = query.order('created_at', { ascending: false });
    if (sort === 'price_asc') query = query.order('price', { ascending: true });
    if (sort === 'price_desc') query = query.order('price', { ascending: false });
    
    const { data, error } = await query.range(from, to);
    if (error) {
        console.error("Error fetching standard artworks:", error);
        throw error;
    }
    // Process images for standard query
    return (data || []).map((art: any) => ({
        ...art,
        artwork_images: (art.artwork_images || []).sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)),
    })) as ArtworkWithArtist[];
  }
};

const BrowseArtworksPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize filters from URL search parameters for better shareability and SEO
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialSearch = queryParams.get('search') || '';
  const initialMedium = queryParams.get('medium') || 'all';
  const initialStyle = queryParams.get('style') || 'all';
  const initialSort = queryParams.get('sort') || (user ? 'recommended' : 'newest');
  const initialArtistSlug = queryParams.get('artistSlug') || '';


  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // Page Speed: Debounce search input
  const [filterMedium, setFilterMedium] = useState(initialMedium);
  const [filterStyle, setFilterStyle] = useState(initialStyle);
  const [sort, setSort] = useState(initialSort);
  const [filterArtistSlug, setFilterArtistSlug] = useState(initialArtistSlug); // State for artist slug filter

  // Effect to update URL params when filters change (debounced for search)
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (searchQuery) newParams.set('search', searchQuery);
    if (filterMedium !== 'all') newParams.set('medium', filterMedium);
    if (filterStyle !== 'all') newParams.set('style', filterStyle);
    if (sort !== (user ? 'recommended' : 'newest')) newParams.set('sort', sort);
    if (filterArtistSlug) newParams.set('artistSlug', filterArtistSlug);

    navigate(`?${newParams.toString()}`, { replace: true });
  }, [searchQuery, filterMedium, filterStyle, sort, filterArtistSlug, user, navigate]);


  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<ArtworkWithArtist[], Error>({ // Explicitly type the useInfiniteQuery
    queryKey: ['browseArtworks', { sort, searchQuery: debouncedSearchQuery, filterMedium, filterStyle, userId: user?.id, artistSlug: filterArtistSlug }], // Use debounced value and artistSlug
    queryFn: fetchArtworks,
    getNextPageParam: (lastPage, allPages) => {
        // If the last page had fewer items than requested, we're at the end
        return lastPage.length < ARTWORKS_PER_PAGE ? undefined : allPages.length;
    },
    initialPageParam: 0, // REQUIRED by react-query v5 for useInfiniteQuery
    refetchOnWindowFocus: false, // Prevent aggressive refetching on focus
    staleTime: 1000 * 60 * 1, // Cache for 1 minute
    cacheTime: 1000 * 60 * 5, // Keep cached data for 5 minutes
  });

  const artworks = useMemo(() => data?.pages.flatMap(page => page) ?? [], [data]);

  const availableMediums = ['all', 'Oil on Canvas', 'Sculpture', 'Photography', 'Digital', 'Acrylic', 'Watercolor', 'Mixed Media']; // Extended example
  const availableStyles = ['all', 'Abstract', 'Figurative', 'Impressionism', 'Pop Art', 'Realism', 'Surrealism', 'Expressionism', 'Minimalism']; // Extended example


  // SEO & JSON-LD Construction
  const pageTitle = sort === 'recommended' && user
    ? "Recommended Artworks for You | ArtFlow App"
    : `Discover Artworks ${searchQuery ? `"${searchQuery}"` : ''}${filterArtistSlug ? ` by ${filterArtistSlug}` : ''} | ArtFlow App`;
  const pageDescription = "Explore a curated selection of contemporary art, personalized for you, from a diverse range of artists on ArtFlow App.";
  const canonicalUrl = `${window.location.origin}/artworks`; // Can generate more specific canonical if filters are highly stable and SEO-relevant
  const ogImage = `${window.location.origin}/default-artworks-share.jpg`; // A general image for this page


  if (isLoading && !data) {
    return (
      <>
        <SeoHelmet title={pageTitle} description={pageDescription} canonicalUrl={canonicalUrl} ogImage={ogImage} />
        <div className="page-container"><p className="loading-message">Loading artworks...</p></div>
      </>
    );
  }
  if (error) {
    return (
      <>
        <SeoHelmet title={`Error | ${pageTitle}`} description="Error loading artworks." canonicalUrl={canonicalUrl} ogImage={ogImage} />
        <div className="page-container"><p className="error-message">Error loading artworks: {error.message}</p></div>
      </>
    );
  }

  return (
    <>
      <SeoHelmet title={pageTitle} description={pageDescription} canonicalUrl={canonicalUrl} ogImage={ogImage} />
      <div className="page-container">
        <h1 className="page-title">Discover Artworks</h1>
        <p className="page-subtitle">Explore a curated selection of contemporary art, personalized for you.</p>

        <div className="filter-controls mb-8 flex flex-wrap gap-4 items-center">
          <div className="relative flex-grow min-w-[250px]">
            <input
              type="text"
              placeholder="Search by title, artist, medium..."
              className="input pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} // Update local state immediately
            />
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
                  {/* Link to artwork must use correct path from App.tsx. It's /artwork/:artworkSlug */}
                  <Link to={`/artwork/${artwork.slug}`} className="artwork-card-link">
                    <img
                      src={imageUrl}
                      alt={artwork.title || 'Artwork'}
                      className="artwork-card-image"
                      loading="lazy" // Page Speed: Lazy load artwork images
                      // Consider srcset for responsive images
                    />
                    <div className="artwork-card-info">
                      <h3 className="artwork-card-title">{artwork.title}</h3>
                      {/* Link to artist portfolio is /u/:artistSlug */}
                      <p className="artwork-card-artist">
                          {artwork.artist?.slug ? (
                              <Link to={`/u/${artwork.artist.slug}`} className="text-link">
                                  {artwork.artist?.full_name || 'Unknown Artist'}
                              </Link>
                          ) : (
                              artwork.artist?.full_name || 'Unknown Artist'
                          )}
                      </p>
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
    </>
  );
};

export default BrowseArtworksPage;