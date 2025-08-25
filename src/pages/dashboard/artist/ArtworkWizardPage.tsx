import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import ArtworkEditorForm from '@/components/dashboard/ArtworkEditorForm';
import { ArrowLeft, ArrowRight, PlusCircle, Trash2 } from 'lucide-react';
import ArtworkUploadModal from '@/components/dashboard/ArtworkUploadModal';
import { useArtworkUploadStore } from '@/stores/artworkUploadStore';
import { Database } from '@/types/database.types';

type Artwork = Database['public']['Tables']['artworks']['Row'];

const fetchArtworksByIds = async (ids: string[]): Promise<Artwork[]> => {
    if (!ids || ids.length === 0) return [];
    const { data, error } = await supabase.from('artworks').select('*').in('id', ids);
    if (error) throw new Error(error.message);
    // Ensure the returned data is in the same order as the IDs in the URL param
    const orderedData = ids.map(id => data.find(artwork => artwork.id === id)).filter(Boolean) as Artwork[];
    return orderedData;
};

const ArtworkWizardPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const artworkIds = useMemo(() => searchParams.get('ids')?.split(',') || [], [searchParams]);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const { clearStore } = useArtworkUploadStore();
    const mainContentRef = useRef<HTMLDivElement>(null);
    
    const wizardQueryKey = ['artworks-wizard', artworkIds];

    const { data: artworks, isLoading, isSuccess } = useQuery({
        queryKey: wizardQueryKey,
        queryFn: () => fetchArtworksByIds(artworkIds),
        enabled: artworkIds.length > 0,
    });
    
    const deleteMutation = useMutation({
        mutationFn: async (artworkIdToRemove: string) => {
            const { error } = await supabase.from('artworks').delete().eq('id', artworkIdToRemove);
            if (error) throw new Error(error.message);
            return artworkIdToRemove;
        },
        onSuccess: (removedId: string) => {
            const newArtworkIds = artworkIds.filter(id => id !== removedId);

            queryClient.setQueryData(wizardQueryKey, (oldData: Artwork[] = []) => 
                oldData.filter(art => art.id !== removedId)
            );

            if (newArtworkIds.length === 0) {
                alert("All artworks have been removed from the wizard.");
                navigate('/artist/artworks');
                return;
            }

            if (currentIndex >= newArtworkIds.length) {
                setCurrentIndex(newArtworkIds.length - 1);
            }
            
            setSearchParams({ ids: newArtworkIds.join(',') }, { replace: true });
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
        },
        onError: (error: Error) => alert(`Error deleting artwork: ${error.message}`),
    });

    useEffect(() => { mainContentRef.current?.scrollTo(0, 0); }, [currentIndex]);

    const handleTitleChange = (artworkIdToUpdate: string, newTitle: string) => {
        queryClient.setQueryData(wizardQueryKey, (oldData: Artwork[] = []) => 
            oldData.map(art => art.id === artworkIdToUpdate ? { ...art, title: newTitle } : art)
        );
    };

    const handleRemoveArtwork = (artworkId: string, title: string | null) => {
        if (window.confirm(`Are you sure you want to permanently delete "${title || 'this artwork'}"? This action cannot be undone.`)) {
            deleteMutation.mutate(artworkId);
        }
    };

    const handleSaveAndNext = () => {
        const savedArtworkId = currentArtwork?.id;
        
        if (savedArtworkId) {
            queryClient.invalidateQueries({ queryKey: ['artwork-form', savedArtworkId] });
            queryClient.invalidateQueries({ queryKey: ['artwork-editor-data', savedArtworkId] });
        }
        
        if (currentIndex < artworkIds.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            alert("All artworks have been processed! Images are being generated in the background.");
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            navigate('/artist/artworks');
        }
    };

    const handleMoreUploadsComplete = (newArtworkIds: string[]) => {
        const combinedIds = [...artworkIds, ...newArtworkIds];
        setSearchParams({ ids: combinedIds.join(',') }, { replace: true });
        setShowUploadModal(false);
        clearStore();
    };

    const currentArtwork = useMemo(() => artworks?.[currentIndex], [artworks, currentIndex]);
    const FORM_ID = `artwork-wizard-form-${currentArtwork?.id}`;

    const triggerFormSubmit = () => {
        const form = document.getElementById(FORM_ID) as HTMLFormElement;
        if (form) {
            form.requestSubmit();
        }
    };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork wizard...</div>;
    if (isSuccess && (!artworks || artworks.length === 0)) return <div style={{padding: '2rem'}}>No artworks to edit. The wizard is complete. <Link to="/artist/artworks">Go back to artworks</Link></div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
            {showUploadModal && <ArtworkUploadModal onUploadComplete={handleMoreUploadsComplete} />}
            <header>
                 <Link to="/artist/artworks" className="button button-secondary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}> <ArrowLeft size={16} /> Exit Wizard </Link>
                <h1>Artwork Details ({currentIndex + 1} / {artworks?.length})</h1>
                <button onClick={() => setShowUploadModal(true)} className="button button-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}> <PlusCircle size={16} /> Add more</button>
            </header>
            <div id="artwork_create_wizard">
                <aside style={{ position: 'sticky', top: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto', marginTop: '1rem', paddingRight: '1rem' }}>
                        {artworks?.map((art, index) => (
                            <div key={art.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius)', border: `2px solid ${index === currentIndex ? 'var(--primary)' : 'var(--border)'}`, background: index === currentIndex ? 'var(--accent)' : 'var(--card)' }}>
                                <div onClick={() => setCurrentIndex(index)} style={{display: 'flex', flexGrow: 1, alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                                    <img src={art.image_url || ''} alt={art.title || 'Untitled'} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                    <p style={{fontWeight: index === currentIndex ? 'bold' : 'normal', flexGrow: 1}}>{art.title || "Untitled"}</p>
                                    {/* CORRECTED: Status check now uses 'Available' to align with types */}
                                    {art.status === 'Available' && <div style={{width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-green-success)'}} title="Completed"></div>}
                                </div>
                                <button onClick={() => handleRemoveArtwork(art.id, art.title)} className="button-secondary" style={{padding: '0.5rem'}} title="Delete Artwork">
                                    <Trash2 size={16} color="var(--color-red-danger)" />
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>
                <main ref={mainContentRef} style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto', paddingRight: '1rem' }}>
                    {currentArtwork && (
                        <div id="form">
                            <img src={currentArtwork.image_url || ''} alt={currentArtwork.title || 'Untitled'} style={{ width: '100%', borderRadius: 'var(--radius)', objectFit: 'contain', alignSelf: 'start', position: 'sticky', top: 0, marginBottom: '2rem' }}/>
                            <div>
                                <ArtworkEditorForm 
                                    key={currentArtwork.id} 
                                    artworkId={currentArtwork.id} 
                                    onSaveSuccess={handleSaveAndNext} 
                                    formId={FORM_ID}
                                    onTitleChange={(newTitle) => handleTitleChange(currentArtwork.id, newTitle)}
                                />
                                <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem'}}>
                                    <button type="button" onClick={triggerFormSubmit} className="button button-primary"> 
                                        {currentIndex === (artworks?.length ?? 0) - 1 ? 'Finish & View Artworks' : 'Save & Next'} 
                                        <ArrowRight size={16} /> 
                                    </button>
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