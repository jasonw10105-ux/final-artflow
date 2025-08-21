// src/pages/dashboard/artist/ArtworkWizardPage.tsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import ArtworkEditorForm from '../../../components/dashboard/ArtworkEditorForm';
import { ArrowLeft, ArrowRight, PlusCircle, Trash2 } from 'lucide-react';
import ArtworkUploadModal from '../../../components/dashboard/ArtworkUploadModal';
import { useArtworkUploadStore } from '../../../stores/artworkUploadStore';

const fetchArtworksByIds = async (ids: string[]) => {
    if (!ids || ids.length === 0) return [];
    const { data, error } = await supabase.from('artworks').select('*').in('id', ids);
    if (error) throw new Error(error.message);
    const sortedData = ids.map(id => data.find(artwork => artwork.id === id)).filter(Boolean);
    return sortedData as any[];
};

const ArtworkWizardPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const artworkIds = useMemo(() => searchParams.get('ids')?.split(',') || [], [searchParams]);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const { clearStore } = useArtworkUploadStore();
    const mainContentRef = useRef<HTMLElement>(null);
    
    const wizardQueryKey = ['artworks-wizard', artworkIds];

    const { data: artworks, isLoading, isSuccess } = useQuery({
        queryKey: wizardQueryKey,
        queryFn: () => fetchArtworksByIds(artworkIds),
        enabled: artworkIds.length > 0,
    });
    
    useEffect(() => {
        mainContentRef.current?.scrollTo(0, 0);
    }, [currentIndex]);

    const handleTitleChange = (artworkIdToUpdate: string, newTitle: string) => {
        queryClient.setQueryData(wizardQueryKey, (oldData: any[] | undefined) => {
            if (!oldData) return [];
            return oldData.map(art => 
                art.id === artworkIdToUpdate ? { ...art, title: newTitle } : art
            );
        });
    };
    
    const handleRemoveArtwork = async (artworkIdToRemove: string, artworkTitle: string) => {
        if (!window.confirm(`Are you sure you want to permanently delete "${artworkTitle || 'this artwork'}"? This action cannot be undone.`)) {
            return;
        }
        try {
            const { error } = await supabase.from('artworks').delete().eq('id', artworkIdToRemove);
            if (error) throw error;

            queryClient.setQueryData(wizardQueryKey, (oldData: any[] | undefined) => {
                if (!oldData) return [];
                return oldData.filter(art => art.id !== artworkIdToRemove);
            });

            const newArtworkIds = artworkIds.filter(id => id !== artworkIdToRemove);

            if (newArtworkIds.length === 0) {
                alert("All artworks have been removed from the wizard.");
                navigate('/artist/artworks');
                return;
            }

            if (currentIndex >= newArtworkIds.length) {
                setCurrentIndex(newArtworkIds.length - 1);
            }
            setSearchParams({ ids: newArtworkIds.join(',') }, { replace: true });

            await queryClient.invalidateQueries({ queryKey: ['artworks'] });

        } catch (error: any) {
            alert(`Error deleting artwork: ${error.message}`);
        }
    };

    const handleSaveAndNext = () => {
        if (currentIndex < artworkIds.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            alert("All artworks have been processed!");
            navigate('/artist/artworks');
        }
    };
    
    const handleMoreUploadsComplete = (newArtworkIds: string[]) => {
        const combinedIds = [...artworkIds, ...newArtworkIds];
        setSearchParams({ ids: combinedIds.join(',') });
        setShowUploadModal(false);
        clearStore();
    };

    const currentArtwork = useMemo(() => artworks?.[currentIndex], [artworks, currentIndex]);
    const FORM_ID = 'artwork-wizard-form';

    const triggerFormSubmit = () => {
        document.getElementById(FORM_ID)?.requestSubmit();
    };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork wizard...</div>;
    if (isSuccess && (!artworks || artworks.length === 0)) return <div style={{padding: '2rem'}}>No artworks found to edit. <Link to="/artist/artworks">Go back</Link></div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
            {showUploadModal && <ArtworkUploadModal onUploadComplete={handleMoreUploadsComplete} />}
            <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)' }}>
                 <Link to="/artist/artworks" className="button button-secondary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}> <ArrowLeft size={16} /> Exit Wizard </Link>
                <h1>Artwork Details ({currentIndex + 1} / {artworks?.length})</h1>
                <button onClick={() => setShowUploadModal(true)} className="button button-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}> <PlusCircle size={16} /> Add More Artworks </button>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', alignItems: 'flex-start', padding: '2rem' }}>
                <aside style={{ position: 'sticky', top: '2rem' }}>
                    <h4>Upload Queue</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto', marginTop: '1rem', paddingRight: '1rem' }}>
                        {artworks?.map((art, index) => (
                            <div key={art.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius)', border: `2px solid ${index === currentIndex ? 'var(--primary)' : 'var(--border)'}`, background: index === currentIndex ? 'var(--accent)' : 'var(--card)' }}>
                                <div onClick={() => setCurrentIndex(index)} style={{display: 'flex', flexGrow: 1, alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                                    <img src={art.image_url} alt={art.title || 'Untitled'} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius)' }} />
                                    <p style={{fontWeight: index === currentIndex ? 'bold' : 'normal', flexGrow: 1}}>{art.title || "Untitled"}</p>
                                    {art.status === 'Available' && <div style={{width: '10px', height: '10px', borderRadius: '50%', background: 'green'}} title="Completed"></div>}
                                </div>
                                <button onClick={() => handleRemoveArtwork(art.id, art.title)} className="button-secondary" style={{padding: '0.5rem'}} title="Delete Artwork">
                                    <Trash2 size={16} color="red" />
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>
                <main ref={mainContentRef} style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto', paddingRight: '1rem' }}>
                    {currentArtwork && (
                        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
                            <img src={currentArtwork.image_url} alt={currentArtwork.title || 'Untitled'} style={{ width: '100%', borderRadius: 'var(--radius)', objectFit: 'contain', alignSelf: 'start', position: 'sticky', top: 0 }}/>
                            <div>
                                <ArtworkEditorForm 
                                    key={currentArtwork.id} 
                                    artworkId={currentArtwork.id} 
                                    onSaveSuccess={handleSaveAndNext} 
                                    formId={FORM_ID}
                                    onTitleChange={(newTitle) => handleTitleChange(currentArtwork.id, newTitle)}
                                />
                                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem'}}>
                                    <button className="button button-secondary" onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}> <ArrowLeft size={16} /> Previous </button>
                                    <button type="button" onClick={triggerFormSubmit} className="button button-primary"> {currentIndex === (artworks?.length ?? 0) - 1 ? 'Finish Wizard' : 'Save & Go to Next'} <ArrowRight size={16} /> </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ArtworkWizardPage;