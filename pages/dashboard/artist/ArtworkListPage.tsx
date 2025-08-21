// src/pages/dashboard/artist/ArtworkListPage.tsx

import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient'; // Also using alias here for consistency
import { useAuth } from '@/contexts/AuthProvider'; // Also using alias here
import { PlusCircle, List, LayoutGrid } from 'lucide-react';
import ArtworkUploadModal from '@/components/dashboard/ArtworkUploadModal'; // Also using alias here
// FIXED: Using the '@/' alias to get a direct path from the 'src' folder
import { useArtworkUploadStore } from '@/stores/artworkUploadStore';

const fetchArtworks = async (userId: string) => {
    const { data, error } = await supabase.from('artworks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
};

const ArtworkListPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { addFiles, clearStore } = useArtworkUploadStore();
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    const { data: artworks, isLoading, refetch } = useQuery({
        queryKey: ['artworks', user?.id],
        queryFn: () => fetchArtworks(user!.id),
        enabled: !!user,
    });

    const filteredArtworks = useMemo(() => {
        if (!artworks) return [];
        return artworks.filter(art => art.title?.toLowerCase().includes(searchQuery.toLowerCase()) || !art.title && "pending".includes(searchQuery.toLowerCase()));
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
        refetch();
        if (artworkIds.length === 1) {
            navigate(`/artist/artworks/edit/${artworkIds[0]}`);
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
                    <button onClick={() => setViewMode('grid')} style={{background: viewMode === 'grid' ? 'var(--secondary)' : 'transparent', border: 'none'}}><LayoutGrid size={18} /></button>
                    <button onClick={() => setViewMode('list')} style={{background: viewMode === 'list' ? 'var(--secondary)' : 'transparent', border: 'none'}}><List size={18} /></button>
                </div>
            </div>
            
            {isLoading ? <p>Loading artworks...</p> : (
                <div style={viewMode === 'grid' ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' } : { display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredArtworks?.map(art => (
                        <div key={art.id} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', flexDirection: viewMode === 'grid' ? 'column' : 'row' }}>
                           {art.image_url && <img src={art.image_url} alt={art.title || "Untitled"} style={viewMode === 'grid' ? { width: '100%', height: '200px', objectFit: 'cover' } : { width: '100px', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius)' }} />}
                            <div style={{ padding: '1rem', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <h4 style={{ marginBottom: '0.5rem' }}>{art.title || "Untitled (Pending Details)"}</h4>
                                    <p style={{ color: art.status === 'Pending' ? 'orange' : 'var(--muted-foreground)', fontSize: '0.875rem' }}>Status: {art.status}</p>
                                </div>
                                <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
                                    <Link to={`/artist/artworks/edit/${art.id}`} className='button-secondary button'>Edit</Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
export default ArtworkListPage;