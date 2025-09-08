// src/pages/BrowseCataloguesPage.tsx
import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"; // Added useLocation, useNavigate
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/database.types';
import '@/styles/app.css';
import { AppArtwork, AppProfile } from '@/types/app.types';
import SeoHelmet from '../../components/SeoHelmet'; // Import SeoHelmet

// Define types based on your database schema, similar to CatalogueListPage
type PublicCatalogueWithArtworks = Database['public']['Tables']['catalogues']['Row'] & {
    artworks: (AppArtwork & {
        artwork_images: { image_url: string }[];
    })[];
    artist: AppProfile;
};

// NEW: Fetch function for public catalogues
const fetchPublicCatalogues = async (): Promise<PublicCatalogueWithArtworks[]> => {
    const { data: rawCataloguesData, error } = await supabase
        .from('catalogues')
        .select(`
            id, title, description, slug, created_at, cover_image_url,
            is_published, access_type,
            artist:profiles(id, full_name, slug),
            artwork_catalogue_junction!left(
                artwork:artworks(
                    id, title, slug, price, currency, genre, keywords, status,
                    artwork_images(image_url, is_primary, position)
                )
            )
        `)
        .eq('is_published', true)
        .eq('access_type', 'public')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching public catalogues:", error);
        throw new Error(error.message);
    }

    const rawCatalogues = Array.isArray(rawCataloguesData) ? rawCataloguesData : [];

    return rawCatalogues.map((catalogue: any) => ({
        ...catalogue,
        artist: catalogue.artist,
        artworks: (catalogue.artwork_catalogue_junction || []) // Corrected to use junction table results
            .map((junction: any) => {
                const artwork = junction.artwork;
                if (!artwork) return null;
                const primaryImage = artwork.artwork_images?.find((img: any) => img.is_primary) || artwork.artwork_images?.[0];
                return {
                    ...artwork,
                    artwork_images: primaryImage ? [primaryImage] : [],
                } as AppArtwork;
            })
            .filter(Boolean),
    })) as PublicCatalogueWithArtworks[];
};


type Filters = {
  genre: string[];
  keyword: string[];
  search: string;
  sort: "newest" | "price-low" | "price-high" | "title-az" | "title-za";
};

// UPDATED: Function component signature
export default function BrowseCataloguesPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize filters from URL search parameters for better shareability and SEO
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialSearch = queryParams.get('search') || '';
  const initialSort = (queryParams.get('sort') as Filters['sort']) || 'newest';
  // Note: Genre and keyword filters from URL would need more complex parsing if they are multi-select or comma-separated

  const [filters, setFilters] = useState<Filters>({
    genre: [], // For simplicity, keep this client-side for now or implement URL parsing
    keyword: [], // Same as above
    search: initialSearch,
    sort: initialSort,
  });

  // Effect to update URL params when filters change (debounced for search in artworks page, but here just directly)
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (filters.search) newParams.set('search', filters.search);
    if (filters.sort !== 'newest') newParams.set('sort', filters.sort);
    // Add logic for genre/keyword if they become URL-driven
    navigate(`?${newParams.toString()}`, { replace: true });
  }, [filters.search, filters.sort, navigate]);


  // NEW: Fetch data using useQuery (called unconditionally)
  const { data: fetchedCatalogues, isLoading, error } = useQuery<PublicCatalogueWithArtworks[], Error>({
      queryKey: ['publicCatalogues'],
      queryFn: fetchPublicCatalogues,
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
      cacheTime: 1000 * 60 * 30, // Keep cached data for 30 minutes
  });

  const cataloguesToProcess = fetchedCatalogues;

  const filteredCatalogues = useMemo(() => {
    const currentCatalogues = Array.isArray(cataloguesToProcess) ? cataloguesToProcess : [];

    let processed = currentCatalogues
      .map((cat) => {
        const availableArts = cat.artworks?.filter(
          (a) => (a.status ?? "").toLowerCase() === "available"
        ) ?? [];

        const filteredArts = availableArts.filter((a) => {
          const matchesGenre =
            filters.genre.length === 0 || (a.genre && filters.genre.includes(a.genre));
          const matchesKeyword =
            filters.keyword.length === 0 ||
            (a.keywords && a.keywords.some((k) => filters.keyword.includes(k)));
          const matchesSearch =
            filters.search === "" ||
            a.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
            a.keywords?.some((k) => k.toLowerCase().includes(filters.search.toLowerCase())) ||
            cat.title?.toLowerCase().includes(filters.search.toLowerCase()) || // Search catalogue title too
            cat.description?.toLowerCase().includes(filters.search.toLowerCase()); // Search catalogue description

          return matchesGenre && matchesKeyword && matchesSearch;
        });

        return { ...cat, artworks: filteredArts };
      })
      .filter((cat) => (cat.artworks?.length ?? 0) > 0); // Only show catalogues with matching available artworks

    const sorted = processed.sort((a, b) => {
        switch (filters.sort) {
          case "price-low":
            // Sort by the lowest price among available artworks in the catalogue
            return (a.artworks?.[0]?.price ?? 0) - (b.artworks?.[0]?.price ?? 0);
          case "price-high":
            // Sort by the highest price among available artworks in the catalogue
            return (b.artworks?.[0]?.price ?? 0) - (a.artworks?.[0]?.price ?? 0);
          case "title-az":
            return (a.title ?? "").localeCompare(b.title ?? "");
          case "title-za":
            return (b.title ?? "").localeCompare(a.title ?? "");
          case "newest":
          default:
            return (
              new Date(b.created_at ?? 0).getTime() -
              new Date(a.created_at ?? 0).getTime()
            );
        }
      });
    return sorted;
  }, [cataloguesToProcess, filters]); // Depend on cataloguesToProcess and filters


  // SEO & JSON-LD Construction
  const pageTitle = `Browse Art Catalogues | ArtFlow App`;
  const pageDescription = "Explore public art catalogues featuring curated collections by artists on ArtFlow App.";
  const canonicalUrl = `${window.location.origin}/catalogues`;
  const ogImage = `${window.location.origin}/default-catalogues-share.jpg`; // A general image for this page

  // Conditional returns for loading/error states (must be after all hooks)
  if (isLoading) return (
    <>
      <SeoHelmet title={pageTitle} description={pageDescription} canonicalUrl={canonicalUrl} ogImage={ogImage} />
      <p className="loading-message">Loading public catalogues...</p>
    </>
  );
  if (error) return (
    <>
      <SeoHelmet title={`Error | ${pageTitle}`} description="Error loading catalogues." canonicalUrl={canonicalUrl} ogImage={ogImage} />
      <p className="error-message">Error loading catalogues: {error.message}</p>
    </>
  );


  return (
    <>
      <SeoHelmet title={pageTitle} description={pageDescription} canonicalUrl={canonicalUrl} ogImage={ogImage} />
      <div className="page-container">
        <h1>Browse Catalogues</h1>

        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="Search artworks in catalogues..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="input flex-grow max-w-xs"
          />
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value as Filters["sort"] })}
            className="select"
          >
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low → High</option>
            <option value="price-high">Price: High → Low</option>
            <option value="title-az">Title A → Z</option>
            <option value="title-za">Title Z → A</option>
          </select>
        </div>

        {filteredCatalogues.length === 0 ? (
          <p className="empty-state-message">No catalogues match your filters.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCatalogues.map((cat) => (
              <div key={cat.id} className="catalogue-card group">
                <div className="relative overflow-hidden rounded-t-lg">
                  <img
                    src={cat.cover_image_url || "https://placehold.co/600x400?text=Catalogue+Cover"}
                    alt={cat.title ?? "Catalogue"}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy" // Page Speed: Lazy load catalogue cover images
                  />
                  {cat.artworks && cat.artworks.length > 0 && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                      <p className="text-white text-sm">{cat.artworks.length} Artworks</p>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-card rounded-b-lg border border-t-0 border-border">
                  <h3 className="font-semibold text-xl group-hover:text-primary transition-colors">{cat.title ?? "Untitled Catalogue"}</h3>
                  <p className="text-muted-foreground text-sm mb-2">By {cat.artist.full_name}</p>
                  {/* Security: If description contains rich text from user, sanitize on backend and/or client side using DOMPurify */}
                  {cat.description && <p className="text-sm line-clamp-2">{cat.description}</p>}
                  <Link to={`/u/${cat.artist.slug}/catalogue/${cat.slug}`} className="button button-secondary button-sm mt-4 w-full">
                    View Catalogue
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}