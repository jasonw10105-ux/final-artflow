// src/pages/dashboard/artist/ArtworkListPage.tsx

import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { PlusCircle, List, LayoutGrid, Folder, MoreVertical } from 'lucide-react';
import ArtworkUploadModal from '@/components/dashboard/ArtworkUploadModal';
import { useArtworkUploadStore } from '@/stores/artworkUploadStore';
import ArtworkActionsMenu from '@/components/dashboard/ArtworkActionsMenu';
import { Database } from '@/types/database.types';

type Artwork = Database['public']['Tables']['artworks']['Row'];
type Catalogue = Database['public']['Tables']['catalogues']['Row'];

const fetchArtworks = async (userId: string): Promise<Artwork[]> => {
    const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
};

const fetchArtistCatalogues = async (userId: string): Promise<Pick<Catalogue, 'id' | 'title'>[]> => {
    const { data, error } = await supabase.from('catalogues').select('id, title').eq('user_id', userId);
    if (error) throw new Error("Could not fetch catalogues");
    return data || [];
};

const formatPrice = (price: number | null, currency: string | null) => {
    if (price === null || price === undefined) return 'Price not set';
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: currency || 'ZAR' }).format(price);
};

const ArtworkListPage = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { addFiles, clearStore } = useArtworkUploadStore();

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    // State for the actions menu
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, artwork: Artwork) => {
        setAnchorEl(event.currentTarget);
        setSelectedArtwork(artwork);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedArtwork(null);
    };

    const { data: artworks, isLoading: isLoadingArtworks } = useQuery({
        queryKey: ['artworks', user?.id],
        queryFn: () => fetchArtworks(user!.id),
        enabled: !!user,
    });
    
    const { data: catalogues } = useQuery({
        queryKey: ['artist_catalogues', user?.id],
        queryFn: () => fetchArtistCatalogues(user!.id),
        enabled: !!user,
    });

    // Mutation for deleting an artwork
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

    // Mutation for marking an artwork as sold
    const markAsSoldMutation = useMutation({
        mutationFn: async (artworkId: string) => {
            const { error } = await supabase.from('artworks').update({ status: 'Sold' }).eq('id', artworkId);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
            alert('Artwork marked as sold.');
        },
        onError: (error) => alert(`Error updating artwork: ${error.message}`),
    });

    const filteredArtworks = useMemo(() => {
        if (!artworks) return [];
        return artworks.filter(art => 
            (art.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
            (art.status || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [artworks, searchQuery]);
    
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

    return (
        <div>
            {showUploadModal && <ArtworkUploadModal onUploadComplete={handleUploadComplete} />}
            <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Artworks</h1>
                <button onClick={() => fileInputRef.current?.click()} className="button button-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <PlusCircle size={16} /> Create New Artwork
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <input className="input" placeholder="Search by title or status..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{flexGrow: 1}} />
                <div style={{display: 'flex', gap: '0.5rem', background: 'var(--input)', padding: '0.25rem', borderRadius: 'var(--radius)'}}>
                    <button onClick={() => setViewMode('grid')} style={{background: viewMode === 'grid' ? 'var(--secondary)' : 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem'}}><LayoutGrid size={18} /></button>
                    <button onClick={() => setViewMode('list')} style={{background: viewMode === 'list' ? 'var(--secondary)' : 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem'}}><List size={18} /></button>
                </div>
            </div>
            
            {isLoadingArtworks ? <p>Loading artworks...</p> : (
                <div style={viewMode === 'grid' ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' } : { display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredArtworks.map((art: Artwork) => {
                        const catalogue = catalogues?.find(c => c.id === art.catalogue_id);

                        return (
                            <div key={art.id} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', flexDirection: viewMode === 'grid' ? 'column' : 'row' }}>
                               <img src={art.image_url || '/placeholder.png'} alt={art.title || "Untitled"} style={viewMode === 'grid' ? { width: '100%', height: '200px', objectFit: 'cover' } : { width: '100px', height: '100px', objectFit: 'cover' }} />
                                <div style={{ padding: '1rem', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <h4 style={{ marginBottom: '0.25rem', marginTop: 0 }}>{art.title || "Untitled (Pending Details)"}</h4>
                                        <p style={{ fontWeight: 'bold', fontSize: '1rem', margin: '0 0 0.5rem 0' }}>{formatPrice(art.price, art.currency)}</p>
                                        
                                        {catalogue && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                                <Folder size={14} />
                                                <span>{catalogue.title}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center'}}>
                                        <Link to={`/artist/artworks/edit/${art.id}`} className='button button-secondary'>Edit</Link>
                                        {art.slug && profile?.slug && (
                                            <a href={`/${profile.slug}/artwork/${art.slug}`} className='button button-secondary' target="_blank" rel="noopener noreferrer">
                                                Preview
                                            </a>
                                        )}
                                        <div style={{ flexGrow: 1 }}></div>
                                        <button onClick={(e) => handleMenuOpen(e, art)} style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem'}}>
                                            <MoreVertical size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedArtwork && (
                <ArtworkActionsMenu 
                    artwork={selectedArtwork}
                    anchorEl={anchorEl}
                    onClose={handleMenuClose}
                    onEdit={(id) => {
                        navigate(`/artist/artworks/edit/${id}`);
                        handleMenuClose();
                    }}
                    onDelete={(id) => {
                        if (window.confirm('Are you sure you want to delete this artwork?')) {
                            deleteMutation.mutate(id);
                        }
                        handleMenuClose();
                    }}
                    onMarkAsSold={(id) => {
                        markAsSoldMutation.mutate(id);
                        handleMenuClose();
                    }}
                />
            )}

            {filteredArtworks?.length === 0 && !isLoadingArtworks && (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
                    <p>No artworks found.</p>
                    <p style={{color: 'var(--muted-foreground)'}}>Click "Create New Artwork" to get started.</p>
                </div>
            )}
        </div>
    );
};

export default ArtworkListPage;