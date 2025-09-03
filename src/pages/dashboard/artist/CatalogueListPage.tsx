import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { PlusCircle, ImageOff, CheckCircle, Archive, Lock, Share2 } from 'lucide-react'; // Added Share2 icon
import { Database } from '@/types/database.types';
import ShareModal from '@/components/public/ShareModal'; // Import the ShareModal

type CatalogueWithCounts = Database['public']['Tables']['catalogues']['Row'] & {
    total_count: number; available_count: number; sold_count: number;
};

const fetchCataloguesWithStatusCounts = async (userId: string): Promise<CatalogueWithCounts[]> => {
    const { data, error } = await supabase.rpc('get_catalogues_with_status_counts', { auth_user_id: userId });
    if (error) {
        console.error("Error fetching catalogues with RPC:", error);
        throw new Error(error.message);
    }
    return data || [];
};

// Moved the ShareModal state and logic to the parent component (CatalogueListPage)
// to manage which catalogue is being shared.
const CatalogueListItem = React.memo(({ cat, profileSlug, onShare }: { 
    cat: CatalogueWithCounts; 
    profileSlug: string | null | undefined;
    onShare: (catalogue: CatalogueWithCounts) => void; // Callback to open share modal
}) => (
    <div style={{
        background: 'var(--card)', borderRadius: 'var(--radius)',
        display: 'flex', alignItems: 'center', gap: '1.5rem',
        border: '1px solid var(--border)', overflow: 'hidden'
    }}>
        {cat.cover_image_url ? (
            <div className="artwork_preview">
                <img src={cat.cover_image_url} alt={cat.title} style={{ width: '150px', height: '150px', objectFit: 'cover' }}/>
            </div>
        ) : (
            <div style={{
                width: '150px', height: '150px', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', background: 'var(--input)', color: 'var(--muted-foreground)'
            }}>
                <ImageOff size={32} />
            </div>
        )}
        <div style={{ flexGrow: 1, padding: '1rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
               <h3>{cat.title}</h3>
                {cat.is_system_catalogue && (
                    <span title="This system catalogue's details cannot be edited, but you can manage its artworks." style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: 'var(--muted)', color: 'var(--muted-foreground)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius)', fontWeight: 500 }}>
                        <Lock size={12} /> System
                    </span>
                )}
                {!cat.is_published && !cat.is_system_catalogue && (
                    <span style={{ fontSize: '0.75rem', background: 'var(--secondary)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius)', fontWeight: 500 }}>Draft</span>
                )}
            </div>
            <p style={{ marginBottom: '0.5rem' }}>
                Total of {cat.total_count || 0} artwork(s)
            </p>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={16} color="var(--color-green-success)" />
                    <span>{cat.available_count || 0} Available</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)' }}>
                    <Archive size={16} />
                    <span>{cat.sold_count || 0} Sold</span>
                </div>
            </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', paddingRight: '1.5rem' }}>
            {cat.is_published && profileSlug && (
                <Link to={`/u/${profileSlug}/catalogue/${cat.slug}`} className='button button-secondary' target="_blank" rel="noopener noreferrer">View</Link>
            )}
            <Link to={`/u/catalogues/edit/${cat.id}`} className='button button-secondary'>
                {cat.is_system_catalogue ? 'Manage Artworks' : 'Edit'}
            </Link>
            {cat.is_published && ( // Only show share button for published catalogues
                <button 
                    onClick={() => onShare(cat)} 
                    className='button button-secondary' 
                    title="Share Catalogue"
                >
                    <Share2 size={16} />
                </button>
            )}
        </div>
    </div>
));

const CatalogueListSkeleton = () => (
    <>
        {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', paddingRight: '1.5rem' }}>
                <div style={{ width: '150px', height: '150px', background: 'var(--input)' }} />
                <div style={{ flexGrow: 1, padding: '1rem 0' }}>
                    <div style={{ height: '24px', width: '40%', background: 'var(--input)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }} />
                    <div style={{ height: '18px', width: '25%', background: 'var(--input)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }} />
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <div style={{ height: '20px', width: '80px', background: 'var(--input)', borderRadius: 'var(--radius-sm)' }} />
                        <div style={{ height: '20px', width: '80px', background: 'var(--input)', borderRadius: 'var(--radius-sm)' }} />
                    </div>
                </div>
            </div>
        ))}
    </>
);

const CatalogueListPage = () => {
    const { user, profile } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [sortOption, setSortOption] = useState('created_at-desc');
    const [filterStatus, setFilterStatus] = useState('all');

    // State for ShareModal
    const [showShareModal, setShowShareModal] = useState(false);
    const [catalogueToShare, setCatalogueToShare] = useState<CatalogueWithCounts | null>(null);

    const { data: catalogues, isLoading } = useQuery({
        queryKey: ['cataloguesWithStatusCounts', user?.id],
        queryFn: () => fetchCataloguesWithStatusCounts(user!.id),
        enabled: !!user,
    });
    
    const processedCatalogues = useMemo(() => {
        if (!catalogues) return [];
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

        return systemCatalogue ? [systemCatalogue, ...sorted] : sorted;
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


    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Catalogues</h1>
                <Link to="/u/catalogues/new" className="button button-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <PlusCircle size={16} /> Create Catalogue
                </Link>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <input 
                    className="input" 
                    placeholder="Search by title..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ flexGrow: 1, minWidth: '200px' }}
                />
                <select className="input" value={sortOption} onChange={e => setSortOption(e.target.value)} style={{ flex: '0 0 200px' }}>
                    <option value="created_at-desc">Sort by: Newest</option>
                    <option value="created_at-asc">Sort by: Oldest</option>
                    <option value="title-asc">Sort by: Title (A-Z)</option>
                    <option value="title-desc">Sort by: Title (Z-A)</option>
                    <option value="total_count-desc">Sort by: Most Artworks</option>
                    <option value="available_count-desc">Sort by: Most Available</option>
                    <option value="sold_count-desc">Sort by: Most Sold</option>
                </select>
                <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ flex: '0 0 150px' }}>
                    <option value="all">Show All</option>
                    <option value="published">Show Published</option>
                    <option value="unpublished">Show Drafts</option>
                </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {isLoading ? (
                    <CatalogueListSkeleton />
                ) : processedCatalogues.length > 0 ? (
                    processedCatalogues.map((cat) => (
                        <CatalogueListItem 
                            key={cat.id} 
                            cat={cat} 
                            profileSlug={profile?.slug} 
                            onShare={handleOpenShareModal} // Pass the handler
                        />
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
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