import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import FiltersSidebar, { ActiveFilters, AvailableFilters } from '../../components/ui/FiltersSidebar';

const ITEMS_PER_PAGE = 12;

interface Catalogue {
  id: string;
  title: string;
  slug: string;
  profile_full_name: string;
  profile_slug: string;
  cover_image_url?: string;
}

const BrowseCataloguesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(0);

  const initialFilters: ActiveFilters = useMemo(() => ({
    search: searchParams.get('search') || '',
    colors: [],
    genres: [],
    artists: [],
    sizes: [],
    waysToBuy: [],
    signed: [],
    framed: [],
    minPrice: '',
    maxPrice: '',
    sortBy: 'recently_added',
  }), [searchParams]);

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(initialFilters);
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({});
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeFilters.search) params.set('search', activeFilters.search);
    setSearchParams(params);
    setPage(0);
  }, [activeFilters, setSearchParams]);

  const { isLoading } = useQuery({
    queryKey: ['filteredCatalogues', page, activeFilters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_filtered_items', {
        p_type: 'catalogue',
        p_keywords: activeFilters.search ? [activeFilters.search] : [],
        p_offset: page * ITEMS_PER_PAGE,
        p_limit: ITEMS_PER_PAGE
      });
      if (error) throw new Error(error.message);

      const resp = data as any;
      setCatalogues(resp.items || []);
      setAvailableFilters(resp.filter_counts || {});
      setTotalCount(resp.items?.length || 0);
    },
    keepPreviousData: true
  });

  return (
    <div className="browse-page-container">
      <h1 className="browse-page-title">Browse Catalogues</h1>
      <div className="main-content-grid">
        <FiltersSidebar
          availableFilters={availableFilters}
          activeFilters={activeFilters}
          setActiveFilters={setActiveFilters}
        />

        <div className="artwork-list-area">
          {isLoading ? <p>Loading catalogues...</p> :
            catalogues.length ? (
              <div className="artwork-grid">
                {catalogues.map(cat => (
                  <Link key={cat.id} to={`/${cat.profile_slug}/catalogue/${cat.slug}`}>
                    <div className="artwork-card">
                      <img src={cat.cover_image_url || ''} alt={cat.title} />
                      <div className="artwork-card-info">
                        <h4>{cat.title}</h4>
                        <p>{cat.profile_full_name}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <p>No catalogues match your selected filters.</p>
          }

          {totalCount >= ITEMS_PER_PAGE && (
            <div className="pagination-controls">
              <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}>Previous</button>
              <span>Page {page+1}</span>
              <button onClick={()=>setPage(p=>p+1)}>Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
};

export default BrowseCataloguesPage;
