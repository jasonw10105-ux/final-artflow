// src/pages/dashboard/artist/ArtworkWizardPage.tsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import ArtworkEditorForm from '../../../components/dashboard/ArtworkEditorForm';
import { ArrowLeft, ArrowRight, PlusCircle, Trash2 } from 'lucide-react';
import ArtworkUploadModal from '../../../components/dashboard/ArtworkUploadModal';
import { useArtworkUploadStore } from '../../../stores/artworkUploadStore';

const fetchArtworksByIds = async (ids: string[]) => { /* ... (no changes) ... */ };

// --- NEW: Helper function to trigger image generation ---
const triggerImageGeneration = async (artworkId: string) => {
    try {
        const { data, error } = await supabase.functions.invoke('generate-images', {
            body: { artworkId },
        });
        if (error) throw new Error(`Failed to trigger image generation: ${error.message}`);
        console.log(`Background image generation started for ${artworkId}`, data);
    } catch (error) {
        console.error(error);
        // We don't alert the user here as it's a background task.
        // It will be re-attempted on the next edit if it fails.
    }
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

    const handleTitleChange = (artworkIdToUpdate: string, newTitle: string) => { /* ... (no changes) ... */ };
    const handleRemoveArtwork = async (artworkIdToRemove: string, artworkTitle: string) => { /* ... (no changes) ... */ };

    // --- MODIFIED: This function now triggers the image generation ---
    const handleSaveAndNext = () => {
        const savedArtworkId = currentArtwork?.id;
        
        // Trigger generation in the background. Don't await it.
        if (savedArtworkId) {
            triggerImageGeneration(savedArtworkId);
        }

        if (currentIndex < artworkIds.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            alert("All artworks have been processed! Images are being generated in the background.");
            navigate('/artist/artworks');
        }
    };
    
    const handleMoreUploadsComplete = (newArtworkIds: string[]) => { /* ... (no changes) ... */ };
    const currentArtwork = useMemo(() => artworks?.[currentIndex], [artworks, currentIndex]);
    const FORM_ID = 'artwork-wizard-form';
    const triggerFormSubmit = () => { document.getElementById(FORM_ID)?.requestSubmit(); };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork wizard...</div>;
    if (isSuccess && (!artworks || artworks.length === 0)) return <div style={{padding: '2rem'}}>No artworks found to edit. <Link to="/artist/artworks">Go back</Link></div>;

    // --- The rest of the component's JSX remains the same ---
    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
            {/* ... (header, aside, main content JSX is unchanged) ... */}
            {/* --- The key is that ArtworkEditorForm's onSaveSuccess prop is now correctly wired --- */}
             <main ref={mainContentRef} style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto', paddingRight: '1rem' }}>
                    {currentArtwork && (
                        <div id="form">
                            <img src={currentArtwork.image_url} alt={currentArtwork.title || 'Untitled'} style={{ width: '100%', borderRadius: 'var(--radius)', objectFit: 'contain', alignSelf: 'start', position: 'sticky', top: 0 }}/>
                            <div>
                                <ArtworkEditorForm 
                                    key={currentArtwork.id} 
                                    artworkId={currentArtwork.id} 
                                    onSaveSuccess={handleSaveAndNext} // <-- THIS IS THE CRITICAL LINK
                                    formId={FORM_ID}
                                    onTitleChange={(newTitle) => handleTitleChange(currentArtwork.id, newTitle)}
                                />
                                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem'}}>
                                    <button type="button" onClick={triggerFormSubmit} className="button button-primary"> {currentIndex === (artworks?.length ?? 0) - 1 ? 'Finish Wizard' : 'Save & Go to Next'} <ArrowRight size={16} /> </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
        </div>
    );
};

export default ArtworkWizardPage;