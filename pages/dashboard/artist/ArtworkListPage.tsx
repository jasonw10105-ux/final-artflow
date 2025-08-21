// src/pages/dashboard/artist/ArtworkListPage.tsx

import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { PlusCircle, List, LayoutGrid } from 'lucide-react';
import ArtworkUploadModal from '../../../components/dashboard/ArtworkUploadModal';
import { useArtworkUploadStore } from '../../../stores/artworkUploadStore';

const fetchArtworks = async (userId: string) => {
    const { data, error } = await supabase.from('artworks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
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
    
    const { data: artworks, isLoading } = useQuery({
        queryKey: ['artworks', user?.id],
        queryFn: () => fetchArtworks(user!.id),
        enabled: !!user,
    });

    const filteredArtworks = useMemo(() => {
        if (!artworks) return [];
        const lowerCaseQuery = searchQuery.toLowerCase();
        if (!lowerCaseQuery) return artworks;
        return artworks.filter(art => art.title?.toLowerCase().includes(lowerCaseQuery) || !art.title && "pending".includes(lowerCaseQuery));
    }, [artworks, searchQuery]);
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            addFiles(Array.from(event.target.files));
            setShowUploadModal(true);
            event.target.value = '';
        }
    };

    const handleUploadComplete = (artworkIds: string[]) => {
        setShowUploadModal(false);
        clearStore();
        queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
        if (artworkIds.length === 1) {
            navigate(`/artist/artworks/edit/${artworkIds[0]}`);
        } else {
            navigate(`/artist/artworks/wizard?ids=${artworkIds.join(',')}`);
        }
    };

    return (
        <div>
            {showUploadModal && <ArtworkUploadModal onUploadComplete={handleUploadComplete} />}
            <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Artworks</h1>
                <button onClick={() => fileInputRef.current?.click()} className="button button-primary" style={{ display: 'flex', gap: '0.5rem' }}>
                    <PlusCircle size={16} /> Upload Artworks
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <input className="input" placeholder="Search artworks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{flexGrow: 1}} />
                <div style={{display: 'flex', gap: '0.5rem', background: 'var(--input)', padding: '0.25rem', borderRadius: 'var(--radius)'}}>
                    <button onClick={() => setViewMode('grid')} style={{background: viewMode === 'grid' ? 'var(--secondary)' : 'transparent', border: 'none', cursor: 'pointer'}}><LayoutGrid size={18} /></button>
                    <button onClick={() => setViewMode('list')} style={{background: viewMode === 'list' ? 'var(--secondary)' : 'transparent', border: 'none', cursor: 'pointer'}}><List size={18} /></button>
                </div>
            </div>
            
            {isLoading ? <p>Loading artworks...</p> : (
                <div style={viewMode === 'grid' ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' } : { display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredArtworks?.map((art: any) => {
                        const isEdition = art.edition_info?.is_edition;
                        let statusText = art.status;
                        let statusColor = 'var(--muted-foreground)';

                        if (art.status === 'Sold') {
                            statusText = isEdition ? 'Sold Out' : 'Sold';
                            statusColor = 'red';
                        } else if (isEdition && art.status !== 'Pending') {
                            const numericSize = art.edition_info.numeric_size || 0;
                            const apSize = art.edition_info.ap_size || 0;
                            const total = numericSize + apSize;
                            const soldCount = art.edition_info.sold_editions?.length || 0;
                            statusText = `${total - soldCount} / ${total} available`;
                            statusColor = 'green';
                        } else if (art.status === 'Pending') {
                            statusText = 'Pending Details';
                            statusColor = 'orange';
                        }

                        return (
                            <div key={art.id} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', flexDirection: viewMode === 'grid' ? 'column' : 'row' }}>
                               {art.image_url && <img src={art.image_url} alt={art.title || "Untitled"} style={viewMode === 'grid' ? { width: '100%', height: '200px', objectFit: 'cover' } : { width: '100px', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius)' }} />}
                                <div style={{ padding: '1rem', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <h4 style={{ marginBottom: '0.25rem' }}>{art.title || "Untitled"}</h4>
                                        <p style={{ color: statusColor, fontSize: '0.875rem', fontWeight: 'bold' }}>{statusText}</p>
                                    </div>
                                    <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
                                        <Link to={`/artist/artworks/edit/${art.id}`} className='button-secondary button'>Edit</Link>
                                        <Link to={`/artwork/${profile?.slug}/${art.slug}`} className='button-secondary button' target="_blank" rel="noopener noreferrer" style={{display: art.slug ? 'flex' : 'none'}}>Preview</Link>
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