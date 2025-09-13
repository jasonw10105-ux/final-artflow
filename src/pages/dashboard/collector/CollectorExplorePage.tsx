// src/pages/dashboard/collector/CollectorExplorePage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Link } from 'react-router-dom';
import { Sparkles, Users, Map } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { apiGet } from '@/lib/api';

// --- TYPE DEFINITIONS ---
interface SearchResult {
  id: string;
  title: string;
  slug: string;
  artist_slug: string;
  image_url: string;
  price: number;
  status: string;
}

interface PublicList {
    list_id: string;
    list_title: string;
    list_description: string;
    collector_name: string;
    artwork_previews: { id: string; image_url: string }[];
}

// --- MAIN PAGE COMPONENT ---
const CollectorExplorePage = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [submittedQuery, setSubmittedQuery] = useState('');

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittedQuery(searchQuery);
    };

    const { data: roadmapRecommendations, isLoading: loadingRoadmapRecs } = useQuery({
        queryKey: ['roadmapExploreRecommendations', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase.rpc('get_personalized_artworks', { p_collector_id: user.id, p_limit: 8, p_offset: 0 });
            if (error) throw error;
            return (data || []).filter((rec: any) => rec.recommendation_reason === 'Matches your collection roadmap');
        },
        enabled: !!user,
    });
    
    const { data: searchResults, isLoading: isSearching } = useQuery<SearchResult[], Error>({
        queryKey: ['naturalLanguageSearch', submittedQuery],
        queryFn: async () => {
            if (!submittedQuery.trim()) return [];
            const { data, error } = await supabase.rpc('search_artworks_with_natural_language', {
                query_text: submittedQuery,
                match_threshold: 0.75,
                match_count: 20
            });
            if (error) throw new Error(error.message);
            return data || [];
        },
        enabled: !!submittedQuery.trim(),
    });

    const { data: publicLists, isLoading: isLoadingLists } = useQuery<PublicList[], Error>({
        queryKey: ['publicCollectorLists'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_public_collector_lists', { list_limit: 12 });
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    // --- Dynamic Groups from API ---
    const { data: dynamicGroups } = useQuery<{ groups: { label: string; items: any[] }[] }>({
        queryKey: ['dynamicGroups'],
        queryFn: () => apiGet('/api/groups/dynamic'),
    })

    return (
        <div className="page-container">
            <h1>Explore Art</h1>
            <p className="page-subtitle">Discover art that resonates, through intelligent search and community curation.</p>

            <div className="concierge-search-bar">
                <Sparkles size={24} className="concierge-icon" />
                <form onSubmit={handleSearchSubmit} className="w-full">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search like you talk... e.g., 'calming blue abstract paintings for a large wall'"
                        className="concierge-input"
                    />
                </form>
            </div>

            <div className="mt-8">
                {isSearching ? (
                    <p className="loading-message">Searching for matches...</p>
                ) : submittedQuery && searchResults ? (
                    <div>
                        <h2 className="section-title">Results for "{submittedQuery}"</h2>
                        {searchResults.length > 0 ? (
                            <div className="artwork-grid">
                                {searchResults.map(art => (
                                    <div key={art.id} className="artwork-card">
                                        <Link to={`/${art.artist_slug}/artwork/${art.slug}`}>
                                            <div className="artwork-card-image-wrapper">
                                                <img src={art.image_url || 'https://placehold.co/400x300?text=No+Image'} alt={art.title} className="artwork-card-image" />
                                                <div className="artwork-card-status-badge">{art.status}</div>
                                            </div>
                                            <div className="artwork-card-info">
                                                <h3>{art.title}</h3>
                                                <p className="artwork-card-price">${art.price?.toLocaleString()}</p>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="empty-state-message">No artworks found matching your search. Try being a bit more general.</p>
                        )}
                    </div>
                ) : (
                    <>
                        {loadingRoadmapRecs ? <p className="loading-message">Loading roadmap suggestions...</p> : roadmapRecommendations && roadmapRecommendations.length > 0 && (
                             <div className="insight-section">
                                <h2 className="section-title flex items-center gap-2"><Map size={24} /> Artworks for Your Roadmap</h2>
                                <p className="section-description">Hand-picked by our AI to match your collection goals.</p>
                                <div className="artwork-grid">
                                    {roadmapRecommendations.map((art: any) => (
                                        <div key={art.id} className="artwork-card">
                                            <Link to={`/${art.artist.slug}/artwork/${art.slug}`}>
                                                <div className="artwork-card-image-wrapper">
                                                    <img src={art.artwork_images[0]?.image_url || 'https://placehold.co/400x300?text=No+Image'} alt={art.title} className="artwork-card-image" />
                                                    <div className="artwork-card-status-badge">{art.status}</div>
                                                </div>
                                                <div className="artwork-card-info">
                                                    <h3>{art.title}</h3>
                                                    <p className="artwork-card-price">${art.price?.toLocaleString()}</p>
                                                </div>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                                <hr className="my-8 border-border" />
                            </div>
                        )}

                        {/* Dynamic Auto Grouping */}
                        {dynamicGroups?.groups?.length ? (
                            <div className="insight-section">
                                {dynamicGroups.groups.map(group => (
                                    <div key={group.label} className="mb-10">
                                        <h2 className="section-title">{group.label}</h2>
                                        <div className="artwork-grid">
                                            {group.items.map((art: any) => (
                                                <div key={art.id} className="artwork-card">
                                                    <Link to={`/artwork/${art.slug || art.id}`}>
                                                        <div className="artwork-card-image-wrapper">
                                                            <img src={art.primary_image_url || 'https://placehold.co/400x300?text=No+Image'} alt={art.title} className="artwork-card-image" />
                                                            <div className="artwork-card-status-badge">{art.status || 'available'}</div>
                                                        </div>
                                                        <div className="artwork-card-info">
                                                            <h3>{art.title}</h3>
                                                            {typeof art.price === 'number' && (
                                                              <p className="artwork-card-price">${art.price.toLocaleString()}</p>
                                                            )}
                                                        </div>
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <hr className="my-8 border-border" />
                            </div>
                        ) : null}
                        
                        <div className="insight-section">
                            <h2 className="section-title flex items-center gap-2"><Users size={24} /> Community Curations</h2>
                            <p className="section-description">Discover art through the eyes of other collectors.</p>
                            {isLoadingLists ? (
                                <p className="loading-message">Loading community lists...</p>
                            ) : publicLists && publicLists.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {publicLists.map(list => (
                                        <Link to={`/list/${list.list_id}`} key={list.list_id} className="community-list-card">
                                            <div className="preview-image-grid">
                                                {list.artwork_previews.slice(0, 4).map((art, index) => (
                                                    <img key={art.id} src={art.image_url} alt="artwork preview" className={index === 0 ? 'main-preview' : 'thumb-preview'}/>
                                                ))}
                                            </div>
                                            <div className="list-info">
                                                <h4 className="font-semibold">{list.list_title}</h4>
                                                <p className="text-sm text-muted-foreground">Curated by {list.collector_name}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="empty-state-message">No public lists have been created yet. Be the first!</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CollectorExplorePage;