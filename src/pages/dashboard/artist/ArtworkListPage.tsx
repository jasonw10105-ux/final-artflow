// src/pages/dashboard/artist/ArtworkListPage.tsx

import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { PlusCircle, List, LayoutGrid, Folder } from 'lucide-react';
import ArtworkUploadModal from '../../../components/dashboard/ArtworkUploadModal';
import { useArtworkUploadStore } from '../../../stores/artworkUploadStore';
// --- FIXED: Reverted to a simple, reliable query ---
const fetchArtworks = async (userId: string) => {
    const { data, error } = await supabase
        .from('artworks')
        .select('*') // Fetch all artwork fields
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
    if (error) throw new Error(error.message);
    return data;
};

// --- NEW: A separate, reliable query for catalogues ---
const fetchArtistCatalogues = async (userId: string) => {
    const { data, error } = await supabase.from('catalogues').select('id, title').eq('user_id', userId);
    if (error) throw new Error("Could not fetch catalogues");
    return data;
};

const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return 'Price not set';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

const ArtworkListPage = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient(); // FIXED: Initialize queryClient
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { addFiles, clearStore } = useArtworkUploadStore();
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    const { data: artworks, isLoading: isLoadingArtworks } = useQuery({
        queryKey: ['artworks', user?.id],
        queryFn: () => fetchArtworks(user!.id),
        enabled: !!user,
    });
    
    // --- NEW: Fetch catalogues in parallel ---
    const { data: catalogues } = useQuery({
        queryKey: ['artist_catalogues', user?.id],
        queryFn: () => fetchArtistCatalogues(user!.id),
        enabled: !!user,
    });

    const filteredArtworks = useMemo(() => {
        if (!artworks) return [];
        const lowerCaseQuery = searchQuery.toLowerCase();
        
        if (!lowerCaseQuery) return artworks;

        return artworks.filter(art => {
            const title = art.title || '';
            const status = art.status || '';
            return title.toLowerCase().includes(lowerCaseQuery) || status.toLowerCase().includes(lowerCaseQuery);
        });
    }, [artworks, searchQuery]);
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            addFiles(Array.from(event.target.files));
            setShowUploadModal(true);
        }
    };

    const handleUploadComplete = (artworkIds: string[]) => {
        setShowUploadModal(false);
        clearStore();
        queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] }); // This will now work
        navigate(`/artist/artworks/wizard?ids=${artworkIds.join(',')}`);
    };

    const isLoading = isLoadingArtworks; // Page is loading if artworks are loading

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
                    <button onClick={() => setViewMode('grid')} style={{background: viewMode === 'grid' ? 'var(--secondary)' : 'transparent', border: 'none', cursor: 'pointer'}}><LayoutGrid size={18} /></button>
                    <button onClick={() => setViewMode('list')} style={{background: viewMode === 'list' ? 'var(--secondary)' : 'transparent', border: 'none', cursor: 'pointer'}}><List size={18} /></button>
                </div>
            </div>
            
            {isLoading ? <p>Loading artworks...</p> : (
                <div style={viewMode === 'grid' ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' } : { display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredArtworks?.map(art => {
                        // --- NEW: Find the catalogue title on the client side ---
                        const catalogue = catalogues?.find(c => c.id === art.catalogue_id);

                        return (
                            <div key={art.id} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', flexDirection: viewMode === 'grid' ? 'column' : 'row' }}>
                               <img src={art.image_url} alt={art.title || "Untitled"} style={viewMode === 'grid' ? { width: '100%', height: '200px', objectFit: 'cover' } : { width: '100px', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius)' }} />
                                <div style={{ padding: '1rem', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <h4 style={{ marginBottom: '0.25rem' }}>{art.title || "Untitled (Pending Details)"}</h4>
                                        {art.medium && <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{art.medium}</p>}
                                        <p style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.5rem' }}>{formatPrice(art.price)}</p>
                                        
                                        {catalogue && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                                                <Folder size={14} />
                                                <span>{catalogue.title}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
                                        <Link to={`/artist/artworks/edit/${art.id}`} className='button-secondary button'>Edit</Link>
                                        {art.slug && (
                                            <Link 
                                                to={`/artwork/${profile?.slug}/${art.slug}`} 
                                                className='button-secondary button' 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                            >
                                                Preview
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ArtworkListPage;
