// src/pages/dashboard/artist/ArtworkWizardPage.tsx

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
type ArtworkUpdate = Partial<Omit<Artwork, 'id' | 'user_id' | 'created_at'>>;

const fetchArtworksByIds = async (ids: string[]): Promise<Artwork[]> => {
    if (!ids || ids.length === 0) return [];
    const { data, error } = await supabase.from('artworks').select('*').in('id', ids);
    if (error) throw new Error(error.message);
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
    const mainContentRef = useRef<HTMLElement>(null);
    
    const wizardQueryKey = ['artworks-wizard', artworkIds];

    const { data: artworks, isLoading, isSuccess } = useQuery({
        queryKey: wizardQueryKey,
        queryFn: () => fetchArtworksByIds(artworkIds),
        enabled: artworkIds.length > 0,
    });
    
    const updateMutation = useMutation({
        mutationFn: async ({ id, formData }: { id: string, formData: ArtworkUpdate }) => {
            const { error } = await supabase.from('artworks').update(formData).eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.setQueryData(wizardQueryKey, (oldData: Artwork[] = []) => 
                oldData.map(art => art.id === variables.id ? { ...art, ...variables.formData } : art)
            );
        }
    });

    useEffect(() => { mainContentRef.current?.scrollTo(0, 0); }, [currentIndex]);
    
    const handleSave = (id: string, formData: ArtworkUpdate) => {
        updateMutation.mutate({ id, formData });
    };

    const handleSaveAndNext = () => {
        if (currentIndex < artworkIds.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            alert("All artworks have been processed!");
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            navigate('/artist/artworks');
        }
    };

    const currentArtwork = useMemo(() => artworks?.[currentIndex], [artworks, currentIndex]);

    if (isLoading) return <p>Loading wizard...</p>;
    if (isSuccess && (!artworks || artworks.length === 0)) return <p>No artworks found.</p>;

    return (
        <div>
            {/* ... other wizard JSX ... */}
            <main ref={mainContentRef}>
                {currentArtwork && (
                    <ArtworkEditorForm 
                        key={currentArtwork.id} 
                        artwork={currentArtwork}
                        onSave={(formData) => handleSave(currentArtwork.id, formData)}
                        isLoading={updateMutation.isPending && updateMutation.variables?.id === currentArtwork.id}
                    />
                )}
                 <button onClick={handleSaveAndNext}>Save & Next</button>
            </main>
        </div>
    );
};

export default ArtworkWizardPage;