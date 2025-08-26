// src/pages/dashboard/artist/ArtworkListPage.tsx

import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { PlusCircle, List, LayoutGrid, MoreVertical, Circle, CheckCircle, Archive, BookCopy, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDebounce } from '@/hooks/useDebounce';

import ArtworkUploadModal from '@/components/dashboard/ArtworkUploadModal';
import { useArtworkUploadStore } from '@/stores/artworkUploadStore';
import ArtworkActionsMenu from '@/components/dashboard/ArtworkActionsMenu';
import AssignCatalogueModal from '@/components/dashboard/AssignCatalogueModal';
import { Database } from '@/types/database.types';

type Artwork = Database['public']['Tables']['artworks']['Row'];

type ArtworkWithCatalogueCount = Artwork & {
    artwork_catalogues: { count: number }[];
};

const fetchArtworks = async (userId: string): Promise<ArtworkWithCatalogueCount[]> => {
    const { data, error } = await supabase
        .from('artworks')
        .select('*, artwork_catalogues(count)')
        .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return (data as any[] || []) as ArtworkWithCatalogueCount[];
};

const formatPrice = (price: number | null, currency: string | null) => {
    if (price === null || price === undefined) return 'Price not set';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(price);
};

const StatusBadge = React.memo(({ status }: { status: string }) => {
    const statusMap: { [key: string]: { text: string; icon: React.ReactNode; color: string } } = {
        'Available': { text: 'Available', icon: <CheckCircle size={14} />, color: 'var(--color-green-success)' },
        'Sold': { text: 'Sold', icon: <Archive size={14} />, color: 'var(--foreground)' },
        'Pending': { text: 'Pending', icon: <Circle size={14} />, color: 'var(--muted-foreground)' }
    };
    const currentStatus = statusMap[status] || statusMap['Pending'];
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: currentStatus.color }}>
            {currentStatus.icon}
            <span>{currentStatus.text}</span>
        </div>
    );
});

const ArtworkListItem = React.memo(({ art, onMenuOpen }: { art: ArtworkWithCatalogueCount; onMenuOpen: (event: React.MouseEvent<HTMLElement>, artwork: ArtworkWithCatalogueCount) => void }) => (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', padding: '1rem', gap: '1rem' }}>
        <img src={art.image_url || '/placeholder.png'} alt={art.title || "Untitled"} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
        <div style={{ flexGrow: 1 }}>
            <h4 style={{ margin: 0, fontStyle: 'italic' }}>{art.title || "Untitled (Pending Details)"}</h4>
            <p style={{ fontWeight: 'bold', fontSize: '1rem', margin: '0.25rem 0' }}>{formatPrice(art.price, art.currency)}</p>
            <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <BookCopy size={14} />
                <span>
                    {(art.artwork_catalogues[0]?.count ?? 0) > 0
                        ? `In ${art.artwork_catalogues[0].count} catalogue${art.artwork_catalogues[0].count > 1 ? 's' : ''}`
                        : 'Not in any catalogues'
                    }
                </span>
            </div>
        </div>
        <div style={{ width: '120px' }}><StatusBadge status={art.status} /></div>
        <button className="button-icon" onClick={(e) => onMenuOpen(e, art)} aria-label="Artwork Actions">
            <MoreVertical size={20} />
        </button>
    </div>
));


const ArtworkListPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { addFiles, clearStore } = useArtworkUploadStore();

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [sortOption, setSortOption] = useState('updated_at-desc');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedArtwork, setSelectedArtwork] = useState<ArtworkWithCatalogueCount | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);

    const { data: artworks, isLoading: isLoadingArtworks } = useQuery<ArtworkWithCatalogueCount[]>({
        queryKey: ['artworks', user?.id],
        queryFn: () => fetchArtworks(user!.id),
        enabled: !!user,
    });

    const useArtworkMutation = (mutationFn: (id: string) => Promise<any>, successMessage: string, errorMessage: string) => {
        return useMutation({
            mutationFn,
            onSuccess: () => {
                toast.success(successMessage);
                queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
            },
            onError: (error) => toast.error(`${errorMessage}: ${error.message}`),
        });
    };

    const deleteMutation = useArtworkMutation(
        async (artworkId) => supabase.from('artworks').delete().eq('id', artworkId),
        'Artwork deleted successfully.',
        'Error deleting artwork'
    );

    const markAsSoldMutation = useArtworkMutation(
        async (artworkId) => supabase.from('artworks').update({ status: 'Sold' }).eq('id', artworkId),
        'Artwork marked as sold.',
        'Error updating artwork'
    );

    const markAsAvailableMutation = useArtworkMutation(
        async (artworkId) => supabase.from('artworks').update({ status: 'Available' }).eq('id', artworkId),
        'Artwork marked as available.',
        'Error updating artwork'
    );
    
    const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, artwork: ArtworkWithCatalogueCount) => {
        setAnchorEl(event.currentTarget);
        setSelectedArtwork(artwork);
    }, []);
    
    const handleMenuClose = useCallback(() => {
        setAnchorEl(null);
        setSelectedArtwork(null);
    }, []);

    const processedArtworks = useMemo(() => {
        if (!artworks) return [];
        let filtered = artworks.filter(art => {
            const statusMatch = filterStatus === 'all' || art.status === filterStatus;
            const searchMatch = !debouncedSearchQuery || (art.title || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            return statusMatch && searchMatch;
        });
        const [key, direction] = sortOption.split('-');
        return filtered.sort((a, b) => {
            const valA = a[key as keyof ArtworkWithCatalogueCount];
            const valB = b[key as keyof ArtworkWithCatalogueCount];
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;
            let comparison = 0;
            if (key === 'price') {
                comparison = (valA as number) - (valB as number);
            } else if (key === 'title') {
                comparison = (valA as string).localeCompare(valB as string);
            } else {
                comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
            }
            return direction === 'asc' ? comparison : -comparison;
        });
    }, [artworks, debouncedSearchQuery, sortOption, filterStatus]);
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            addFiles(Array.from(event.target.files));
            setShowUploadModal(true);
        }
    };

    const handleUploadComplete = (artworkIds: string[]) => {
        setShowUploadModal(false);
        clearStore();
        queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
        navigate(`/artist/artworks/wizard?ids=${artworkIds.join(',')}`);
    };

    const handleDelete = (id: string, title: string | null) => {
        if (window.confirm(`Are you sure you want to permanently delete "${title || 'this artwork'}"?`)) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div>
            {showUploadModal && <ArtworkUploadModal onUploadComplete={handleUploadComplete} />}
            {showAssignModal && selectedArtwork && <AssignCatalogueModal artwork={selectedArtwork} onClose={() => setShowAssignModal(false)} />}
            <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/jpeg,image/png,image/webp" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Artworks</h1>
                <button onClick={() => fileInputRef.current?.click()} className="button button-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <PlusCircle size={16} /> Create New Artwork
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <input className="input" placeholder="Search by title..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{flexGrow: 1, minWidth: '200px'}} />
                <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{flex: '0 0 150px'}}>
                    <option value="all">All Statuses</option>
                    <option value="Available">Available</option>
                    <option value="Sold">Sold</option>
                    <option value="Pending">Pending</option>
                </select>
                <select className="input" value={sortOption} onChange={(e) => setSortOption(e.target.value)} style={{flex: '0 0 180px'}}>
                    <option value="updated_at-desc">Sort by: Last Edited</option>
                    <option value="created_at-desc">Sort by: Newest</option>
                    <option value="created_at-asc">Sort by: Oldest</option>
                    <option value="title-asc">Sort by: Title (A-Z)</option>
                    <option value="price-desc">Sort by: Price (High-Low)</option>
                    <option value="price-asc">Sort by: Price (Low-High)</option>
                </select>
                <div style={{display: 'flex', gap: '0.5rem', background: 'var(--input)', padding: '0.25rem', borderRadius: 'var(--radius)'}}>
                    <button onClick={() => setViewMode('grid')} title="Grid View" style={{background: viewMode === 'grid' ? 'var(--card)' : 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-sm)'}}><LayoutGrid size={18} /></button>
                    <button onClick={() => setViewMode('list')} title="List View" style={{background: viewMode === 'list' ? 'var(--card)' : 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-sm)'}}><List size={18} /></button>
                </div>
            </div>
            
            {isLoadingArtworks ? (
                <p>Loading artworks...</p>
            ) : artworks && artworks.length === 0 ? (
                <div className="empty-state-card">
                    <Info size={48} style={{ color: 'var(--muted-foreground)' }} />
                    <h2>No Artworks Yet</h2>
                    <p>Click "Create New Artwork" to upload your first piece and get started.</p>
                </div>
            ) : processedArtworks.length === 0 ? (
                 <div className="empty-state-card">
                    <Info size={48} style={{ color: 'var(--muted-foreground)' }} />
                    <h2>No Matching Artworks</h2>
                    <p>Try adjusting your search or filter criteria.</p>
                </div>
            ) : (
                <div style={viewMode === 'grid' ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' } : { display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   {processedArtworks.map((art) => <ArtworkListItem key={art.id} art={art} onMenuOpen={handleMenuOpen} />)}
                </div>
            )}

            {selectedArtwork && (
                <ArtworkActionsMenu 
                    artwork={selectedArtwork}
                    anchorEl={anchorEl}
                    onClose={handleMenuClose}
                    onEdit={() => { navigate(`/artist/artworks/edit/${selectedArtwork.id}`); handleMenuClose(); }}
                    onDelete={() => { handleDelete(selectedArtwork.id, selectedArtwork.title); handleMenuClose(); }}
                    onMarkAsSold={() => { markAsSoldMutation.mutate(selectedArtwork.id); handleMenuClose(); }}
                    onMarkAsAvailable={() => { markAsAvailableMutation.mutate(selectedArtwork.id); handleMenuClose(); }}
                    onAssignCatalogue={() => { setShowAssignModal(true); handleMenuClose(); }}
                />
            )}
        </div>
    );
};

export default ArtworkListPage;