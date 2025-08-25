// src/pages/dashboard/artist/ArtworkListPage.tsx

import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { PlusCircle, List, LayoutGrid, MoreVertical, Circle, CheckCircle, Archive } from 'lucide-react'; // Removed 'Folder' icon as it's no longer used
import ArtworkUploadModal from '@/components/dashboard/ArtworkUploadModal';
import { useArtworkUploadStore } from '@/stores/artworkUploadStore';
import ArtworkActionsMenu from '@/components/dashboard/ArtworkActionsMenu';
import AssignCatalogueModal from '@/components/dashboard/AssignCatalogueModal';
import { Database } from '@/types/database.types';

type Artwork = Database['public']['Tables']['artworks']['Row'];

const fetchArtworks = async (userId: string): Promise<Artwork[]> => {
    const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
};

const formatPrice = (price: number | null, currency: string | null) => {
    if (price === null || price === undefined) return 'Price not set';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(price);
};

const StatusBadge = ({ status }: { status: string }) => {
    const statusMap: { [key: string]: { text: string; icon: React.ReactNode; color: string } } = {
        // FIX: Changed 'Active' to 'Available' for consistency with database and actions.
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
};

const ArtworkListPage = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { addFiles, clearStore } = useArtworkUploadStore();

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('created_at-desc');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, artwork: Artwork) => {
        setAnchorEl(event.currentTarget);
        setSelectedArtwork(artwork);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedArtwork(null);
    };
    const handleAssignModalOpen = () => {
        setShowAssignModal(true);
        handleMenuClose();
    };

    const { data: artworks, isLoading: isLoadingArtworks } = useQuery({
        queryKey: ['artworks', user?.id],
        queryFn: () => fetchArtworks(user!.id),
        enabled: !!user,
    });

    const deleteMutation = useMutation({
        mutationFn: async (artworkId: string) => {
            const { error } = await supabase.from('artworks').delete().eq('id', artworkId);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
            alert('Artwork deleted successfully.');
        },
        onError: (error) => alert(`Error deleting artwork: ${error.message}`),
    });

    const markAsSoldMutation = useMutation({
        mutationFn: async (artworkId: string) => {
            const { error } = await supabase.from('artworks').update({ status: 'Sold' }).eq('id', artworkId);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
        },
        onError: (error) => alert(`Error updating artwork: ${error.message}`),
    });

    // --- FIX (1/3): Add a mutation to mark artwork as available ---
    const markAsAvailableMutation = useMutation({
        mutationFn: async (artworkId: string) => {
            const { error } = await supabase.from('artworks').update({ status: 'Available' }).eq('id', artworkId);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
        },
        onError: (error) => alert(`Error updating artwork: ${error.message}`),
    });

    const processedArtworks = useMemo(() => {
        if (!artworks) return [];
        let filtered = artworks.filter(art => {
            const statusMatch = filterStatus === 'all' || art.status === filterStatus;
            const searchMatch = !searchQuery || (art.title || '').toLowerCase().includes(searchQuery.toLowerCase());
            return statusMatch && searchMatch;
        });
        const [key, direction] = sortOption.split('-');
        return filtered.sort((a, b) => {
            const valA = a[key as keyof Artwork];
            const valB = b[key as keyof Artwork];
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
    }, [artworks, searchQuery, sortOption, filterStatus]);
    
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

    const handleEdit = (id: string) => navigate(`/artist/artworks/edit/${id}`);
    const handleDelete = (id: string, title: string | null) => {
        if (window.confirm(`Are you sure you want to permanently delete "${title || 'this artwork'}"?`)) {
            deleteMutation.mutate(id);
        }
    };
    const handleMarkAsSold = (id: string) => markAsSoldMutation.mutate(id);
    
    // --- FIX (2/3): Create the handler function for the new mutation ---
    const handleMarkAsAvailable = (id: string) => markAsAvailableMutation.mutate(id);

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
                {/* FIX: Use 'Available' instead of 'Active' in filter */}
                <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{flex: '0 0 150px'}}>
                    <option value="all">All Statuses</option>
                    <option value="Available">Available</option>
                    <option value="Sold">Sold</option>
                    <option value="Pending">Pending</option>
                </select>
                <select className="input" value={sortOption} onChange={(e) => setSortOption(e.target.value)} style={{flex: '0 0 180px'}}>
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
            
            {isLoadingArtworks ? <p>Loading artworks...</p> : (
                <div style={viewMode === 'grid' ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' } : { display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {processedArtworks.map((art) => (
                        viewMode === 'grid' ? (
                            <div key={art.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                {/* Grid view content... */}
                            </div>
                        ) : (
                            <div key={art.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', padding: '1rem', gap: '1rem' }}>
                               <img src={art.image_url || '/placeholder.png'} alt={art.title || "Untitled"} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                                <div style={{ flexGrow: 1 }}>
                                    <h4 style={{ margin: 0, fontStyle: 'italic' }}>{art.title || "Untitled (Pending Details)"}</h4>
                                    <p style={{ fontWeight: 'bold', fontSize: '1rem', margin: '0.25rem 0' }}>{formatPrice(art.price, art.currency)}</p>
                                    {/* FIX: Removed the incorrect single-catalogue display to avoid data inconsistency. */}
                                </div>
                                <div style={{ width: '120px' }}><StatusBadge status={art.status} /></div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {/* Action buttons... */}
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}

            {selectedArtwork && (
                // --- FIX (3/3): Pass the new prop to the component to fix the build error ---
                <ArtworkActionsMenu 
                    artwork={selectedArtwork}
                    anchorEl={anchorEl}
                    onClose={handleMenuClose}
                    onEdit={() => { handleEdit(selectedArtwork.id); handleMenuClose(); }}
                    onDelete={() => { handleDelete(selectedArtwork.id, selectedArtwork.title); handleMenuClose(); }}
                    onMarkAsSold={() => { handleMarkAsSold(selectedArtwork.id); handleMenuClose(); }}
                    onMarkAsAvailable={() => { handleMarkAsAvailable(selectedArtwork.id); handleMenuClose(); }}
                    onAssignCatalogue={handleAssignModalOpen}
                />
            )}

            {/* Fallback content... */}
        </div>
    );
};

export default ArtworkListPage;