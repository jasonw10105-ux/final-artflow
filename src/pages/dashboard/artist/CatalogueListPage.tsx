import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { PlusCircle, ImageOff, CheckCircle, Archive, Lock, Share2 } from 'lucide-react'; // Added Share2 icon
import { Database } from '@/types/database.types';
import ShareModal from '@/components/public/ShareModal'; // Import the ShareModal
import '@/styles/app.css';

type CatalogueWithCounts = Database['public']['Tables']['catalogues']['Row'] & {
    total_count: number; available_count: number; sold_count: number;
};

const fetchCataloguesWithStatusCounts = async (userId: string): Promise<CatalogueWithCounts[]> => {
    console.log("CatalogueListPage: Fetching catalogues for user:", userId); // Query Log 1 (Initiated)
    const { data, error } = await supabase.rpc('get_catalogues_with_status_counts', { auth_user_id: userId });
    if (error) {
        console.error("CatalogueListPage: Supabase RPC error fetching catalogues:", error); // Query Log 2 (Error)
        throw new Error(error.message);
    }
    console.log("CatalogueListPage: Supabase RPC returned catalogues (raw):", data); // Query Log 2 (Success)
    return data || [];
};

// Moved the ShareModal state and logic to the parent component (CatalogueListPage)
// to manage which catalogue is being shared.
const CatalogueListItem = React.memo(({ cat, profileSlug, onShare }: { 
    cat: CatalogueWithCounts; 
    profileSlug: string | null | undefined;
    onShare: (catalogue: CatalogueWithCounts) => void; // Callback to open share modal
}) => {
    console.log("CatalogueListItem: Rendering item:", cat.title); // Item Render Log
    return (
        <div className="catalogue-list-item">
            {cat.cover_image_url ? (
                <div className="catalogue-list-image-wrapper">
                    <img src={cat.cover_image_url} alt={cat.title} className="catalogue-list-image" />
                </div>
            ) : (
                <div className="catalogue-list-image-placeholder">
                    <ImageOff size={32} />
                </div>
            )}
            <div className="catalogue-list-details">
                <div className="flex items-center gap-2 mb-2">
                <h3 className="catalogue-list-title">{cat.title}</h3>
                    {cat.is_system_catalogue && (
                        <span title="This system catalogue's details cannot be edited, but you can manage its artworks." className="tag-pill badge-system">
                            <Lock size={12} /> System
                        </span>
                    )}
                    {!cat.is_published && !cat.is_system_catalogue && (
                        <span className="tag-pill badge-draft">Draft</span>
                    )}
                </div>
                <p className="catalogue-list-summary">
                    Total of {cat.total_count || 0} artwork(s)
                </p>
                <div className="catalogue-list-stats">
                    <div className="flex items-center gap-1">
                        <CheckCircle size={16} className="text-green-success" />
                        <span>{cat.available_count || 0} Available</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <Archive size={16} />
                        <span>{cat.sold_count || 0} Sold</span>
                    </div>
                </div>
            </div>
            <div className="catalogue-list-actions">
                {cat.is_published && profileSlug && (
                    <Link to={`/u/${profileSlug}/catalogue/${cat.slug}`} className='button button-secondary' target="_blank" rel="noopener noreferrer">View</Link>
                )}
                <Link to={`/u/catalogues/edit/${cat.id}`} className='button button-secondary'>
                    {cat.is_system_catalogue ? 'Manage Artworks' : 'Edit'}
                </Link>
                {cat.is_published && ( // Only show share button for published catalogues
                    <button 
                        onClick={() => onShare(cat)} 
                        className='button button-secondary button-with-icon' 
                        title="Share Catalogue"
                    >
                        <Share2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
});

const CatalogueListSkeleton = () => (
    <>
        {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="catalogue-list-item skeleton">
                <div className="catalogue-list-image-skeleton" />
                <div className="catalogue-list-details">
                    <div className="skeleton-line w-2/3 h-6 mb-2" />
                    <div className="skeleton-line w-1/4 h-4 mb-4" />
                    <div className="flex gap-4">
                        <div className="skeleton-line w-1/5 h-5" />
                        <div className="skeleton-line w-1/5 h-5" />
                    </div>
                </div>
            </div>
        ))}
    </>
);

const CatalogueListPage = () => {
    const { user, profile, loading: authLoading } = useAuth(); // Added authLoading
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [sortOption, setSortOption] = useState('created_at-desc');
    const [filterStatus, setFilterStatus] = useState('all');

    // State for ShareModal
    const [showShareModal, setShowShareModal] = useState(false);
    const [catalogueToShare, setCatalogueToShare] = useState<CatalogueWithCounts | null>(null);

    console.log("CatalogueListPage: Component rendered. Auth State:", { user, profile, authLoading }); // Global Log 1

    const { data: catalogues, isLoading, error } = useQuery({
        queryKey: ['cataloguesWithStatusCounts', user?.id],
        queryFn: () => fetchCataloguesWithStatusCounts(user!.id),
        enabled: !!user,
    });
    
    const processedCatalogues = useMemo(() => {
        console.log("CatalogueListPage: useMemo - Catalogues before processing (from query):", catalogues); // Filter Log 1

        if (!catalogues) {
            console.log("CatalogueListPage: useMemo - No catalogues data yet, returning empty array.");
            return [];
        }
        const systemCatalogue = catalogues.find(cat => cat.is_system_catalogue);
        const userCatalogues = catalogues.filter(cat => !cat.is_system_catalogue);

        let filtered = userCatalogues.filter(cat => {
            const statusMatch = filterStatus === 'all' || (filterStatus === 'published' ? cat.is_published : !cat.is_published);
            const searchMatch = !debouncedSearchQuery || cat.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            return statusMatch && searchMatch;
        });

        const [key, direction] = sortOption.split('-');
        const sorted = filtered.sort((a, b) => {
            const valA = a[key as keyof typeof a];
            const valB = b[key as keyof typeof b];
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;
            let comparison = 0;
            // Handle number comparison
            if (['total_count', 'available_count', 'sold_count'].includes(key) && typeof valA === 'number' && typeof valB === 'number') {
                comparison = valA - valB;
            } 
            // Handle string comparison for title
            else if (key === 'title' && typeof valA === 'string' && typeof valB === 'string') {
                comparison = valA.localeCompare(valB);
            }
            // Handle date comparison for created_at
            else if (key === 'created_at' && typeof valA === 'string' && typeof valB === 'string') {
                comparison = new Date(valA).getTime() - new Date(valB).getTime();
            }
            
            return direction === 'asc' ? comparison : -comparison;
        });

        const finalProcessed = systemCatalogue ? [systemCatalogue, ...sorted] : sorted;
        console.log("CatalogueListPage: useMemo - Catalogues after processing and sorting:", finalProcessed.length, finalProcessed); // Filter Log 2
        return finalProcessed;

    }, [catalogues, debouncedSearchQuery, sortOption, filterStatus]);

    // Handler to open the share modal with specific catalogue data
    const handleOpenShareModal = useCallback((cat: CatalogueWithCounts) => {
        setCatalogueToShare(cat);
        setShowShareModal(true);
    }, []);

    // Handle modal body scroll locking
    useEffect(() => {
        document.body.style.overflow = showShareModal ? 'hidden' : 'auto';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [showShareModal]);

    console.log("CatalogueListPage: Before rendering main JSX. isLoading:", isLoading, "error:", error, "processedCatalogues count:", processedCatalogues.length); // Render Log 1

    if (authLoading) { // Check auth loading first
        console.log("CatalogueListPage: Auth is still loading.");
        return <p className="loading-message">Loading authentication...</p>;
    }

    if (!user) { // If user is not authenticated, redirect or show message (should be handled by ProtectedRoute)
        console.log("CatalogueListPage: User not authenticated, redirecting or showing login prompt.");
        return <p className="error-message">Please log in to view your catalogues.</p>;
    }

    if (isLoading) {
        console.log("CatalogueListPage: Data is still loading (isLoading is true).");
        return <CatalogueListSkeleton />; // Show skeleton during loading
    }
    if (error) {
        console.error("CatalogueListPage: Error in useQuery:", error);
        return <p className="error-message">Error loading catalogues: {error.message}</p>;
    }

    return (
        <div className="page-container">
            <div className="page-header-row">
                <h1>Catalogues</h1>
                <Link to="/u/catalogues/new" className="button button-primary button-with-icon">
                    <PlusCircle size={16} /> Create Catalogue
                </Link>
            </div>
            
            <div className="filter-bar-grid">
                <input 
                    className="input" 
                    placeholder="Search by title..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <select className="input" value={sortOption} onChange={e => setSortOption(e.target.value)}>
                    <option value="created_at-desc">Sort by: Newest</option>
                    <option value="created_at-asc">Sort by: Oldest</option>
                    <option value="title-asc">Sort by: Title (A-Z)</option>
                    <option value="title-desc">Sort by: Title (Z-A)</option>
                    <option value="total_count-desc">Sort by: Most Artworks</option>
                    <option value="available_count-desc">Sort by: Most Available</option>
                    <option value="sold_count-desc">Sort by: Most Sold</option>
                </select>
                <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">Show All</option>
                    <option value="published">Show Published</option>
                    <option value="unpublished">Show Drafts</option>
                </select>
            </div>
            
            <div className="catalogue-list">
                {processedCatalogues.length > 0 ? (
                    processedCatalogues.map((cat) => (
                        <CatalogueListItem 
                            key={cat.id} 
                            cat={cat} 
                            profileSlug={profile?.slug} 
                            onShare={handleOpenShareModal} // Pass the handler
                        />
                    ))
                ) : (
                    <div className="empty-state-card">
                        <p>
                            {catalogues && catalogues.length > 0
                                ? "No catalogues match your current filters."
                                : "You haven't created any catalogues yet."}
                        </p>
                    </div>
                )}
            </div>

            {/* ShareModal */}
            {showShareModal && catalogueToShare && profile?.slug && (
                <ShareModal
                    onClose={() => {
                        setShowShareModal(false);
                        setCatalogueToShare(null); // Clear shared catalogue data
                    }}
                    title={catalogueToShare.title}
                    byline={profile.full_name || "Artflow Artist"} // Assuming byline is artist's name
                    shareUrl={`${window.location.origin}/u/${profile.slug}/catalogue/${catalogueToShare.slug}`}
                    previewImageUrls={catalogueToShare.cover_image_url ? [catalogueToShare.cover_image_url] : []}
                    isCatalogue={true}
                    // For catalogues, dimensions, price, year, currency might not be directly applicable
                    // You can choose to pass null or default values
                    dimensions={null}
                    price={null}
                    year={null}
                    currency={null}
                />
            )}
        </div>
    );
};

export default CatalogueListPage;