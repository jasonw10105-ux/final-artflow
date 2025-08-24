import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import ArtworkEditorForm from '../../../components/dashboard/ArtworkEditorForm'; // <-- IMPORT THE FORM
import { ArrowLeft, ArrowRight, PlusCircle, Trash2 } from 'lucide-react';
import ArtworkUploadModal from '../../../components/dashboard/ArtworkUploadModal';
import { useArtworkUploadStore } from '../../../stores/artworkUploadStore';

const fetchArtworksByIds = async (ids: string[]) => {
    if (!ids || ids.length === 0) return [];
    const { data, error } = await supabase.from('artworks').select('*').in('id', ids);
    if (error) throw new Error(error.message);
    // Sort the data to match the order of IDs in the URL
    return ids.map(id => data.find(artwork => artwork.id === id)).filter(Boolean) as any[];
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
        // ... (This function's logic does not need to change)
    };

    const handleSaveAndNext = () => {
        if (currentIndex < artworkIds.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            alert("All artworks have been processed! Images are being generated in the background.");
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
    const FORM_ID = `artwork-wizard-form-${currentArtwork?.id}`; // Use a dynamic ID

    const triggerFormSubmit = () => {
        const form = document.getElementById(FORM_ID) as HTMLFormElement;
        if (form) {
            form.requestSubmit();
        }
    };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork wizard...</div>;
    if (isSuccess && (!artworks || artworks.length === 0)) return <div style={{padding: '2rem'}}>No artworks found to edit. <Link to="/artist/artworks">Go back</Link></div>;

    return (
        // ... (The main page layout, header, and aside are unchanged)
        <main ref={mainContentRef} style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto', paddingRight: '1rem' }}>
            {currentArtwork && (
                <div id="form">
                    <img src={currentArtwork.image_url} alt={currentArtwork.title || 'Untitled'} style={{ width: '100%', borderRadius: 'var(--radius)', objectFit: 'contain', alignSelf: 'start', position: 'sticky', top: 0 }}/>
                    <div>
                        <ArtworkEditorForm 
                            key={currentArtwork.id} // <-- Use key to force re-mount
                            artworkId={currentArtwork.id} 
                            onSaveSuccess={handleSaveAndNext} 
                            formId={FORM_ID}
                            onTitleChange={(newTitle) => handleTitleChange(currentArtwork.id, newTitle)}
                        />
                        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem'}}>
                             <button type="button" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} className="button button-secondary" disabled={currentIndex === 0}>
                                <ArrowLeft size={16} /> Previous
                            </button>
                            <button type="button" onClick={triggerFormSubmit} className="button button-primary">
                                {currentIndex === (artworks?.length ?? 0) - 1 ? 'Finish Wizard' : 'Save & Go to Next'}
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
        // ...
    );
};

export default ArtworkWizardPage;