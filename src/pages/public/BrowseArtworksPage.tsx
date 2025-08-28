import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import FiltersSidebar, { Filters } from '../../components/ui/FiltersSidebar';
import '../../index.css';

const BrowseArtworksPage = () => {
  const [filters, setFilters] = useState<Filters>({
    genre: [],
    status: [],
    keyword: [],
    search: '',
    sort: 'newest',
  });

  const { data: artworks, isLoading, isError } = useQuery({
    queryKey: ['filteredArtworks', filters],
    queryFn: () => fetchFilteredArtworks(filters),
    retry: 1,
  });

  if (isLoading) return <p className="loading-placeholder">Loading Artworks...</p>;
  if (isError) return <p className="empty-list-placeholder">Failed to load artworks.</p>;
  if (!artworks?.length) return <p className="empty-list-placeholder">No artworks available.</p>;

  return (
    <div className="browse-artworks-container" style={{ display: 'flex' }}>
      <FiltersSidebar artworks={artworks} filters={filters} setFilters={setFilters} />
      <div className="flex_grid" style={{ flexGrow: 1 }}>
        {artworks.map((art) => (
          <div key={art.id} className="card">
            <Link to={`/artwork/${art.slug}`} className="artwork-card-link">
              <img
                src={art.image_url || 'https://placehold.co/400x400?text=No+Image'}
                alt={art.title || 'Artwork'}
                className="artwork-card-image"
              />
              <div className="artwork-card-info">
                <h4>{art.title || 'Untitled'}</h4>
                <p>{art.user?.full_name || 'Unknown Artist'}</p>
                <p>
                  {art.price
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: art.currency || 'USD',
                      }).format(art.price)
                    : 'Price on Request'}
                </p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrowseArtworksPage;