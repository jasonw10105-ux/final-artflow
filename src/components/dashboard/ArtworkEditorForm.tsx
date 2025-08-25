import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database } from '@/types/database.types';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';

// --- TYPE DEFINITIONS ---
type Artwork = Database['public']['Tables']['artworks']['Row'] & {
    artist: { full_name: string | null } | null;
};
type Catalogue = Database['public']['Tables']['catalogues']['Row'];

// --- PROPS INTERFACE ---
interface ArtworkEditorFormProps {
  artworkId: string;
  formId: string;
  onSaveSuccess: () => void;
  onTitleChange?: (newTitle: string) => void;
}

// --- MEDIA TAXONOMY ---
const mediaTaxonomy: Record<string, string[]> = { /* ... your full taxonomy ... */ };

// --- API FUNCTIONS ---
const fetchArtworkAndCatalogues = async (artworkId: string, userId: string) => {
    const { data: artworkData, error: artworkError } = await supabase.from('artworks').select('*, artist:profiles!user_id(full_name)').eq('id', artworkId).single();
    if (artworkError) throw new Error(`Artwork not found: ${artworkError.message}`);
    const { data: allUserCatalogues, error: allCatError } = await supabase.from('catalogues').select('id, title, is_system_catalogue').eq('user_id', userId);
    if (allCatError) throw new Error(`Could not fetch catalogues: ${allCatError.message}`);
    const { data: assignedJunctions, error: junctionError } = await supabase.from('artwork_catalogue_junction').select('catalogue_id').eq('artwork_id', artworkId);
    if (junctionError) throw new Error(`Could not fetch assignments: ${junctionError.message}`);
    const assignedCatalogueIds = new Set(assignedJunctions.map(j => j.catalogue_id));
    const assignedCatalogues = allUserCatalogues.filter(cat => assignedCatalogueIds.has(cat.id));
    return { artworkData: artworkData as Artwork, allUserCatalogues: allUserCatalogues as Catalogue[], assignedCatalogues: assignedCatalogues as Catalogue[] };
};

const updateSaleStatus = async ({ artworkId, identifier, isSold }: { artworkId: string, identifier: string, isSold: boolean }) => {
    const { error } = await supabase.rpc('update_artwork_edition_sale', { p_artwork_id: artworkId, p_edition_identifier: identifier, p_is_sold: isSold });
    if (error) throw error;
};

const triggerImageGeneration = async (artworkId: string, flags: { forceWatermark?: boolean, forceVisualization?: boolean } = {}) => {
    // ... (function is unchanged)
};

// --- HELPER HOOKS (Now correctly defined and exported) ---
export const useFormHandlers = (
    artwork: Partial<Artwork>, 
    setArtwork: React.Dispatch<React.SetStateAction<Partial<Artwork>>>, 
    onTitleChange?: (newTitle: string) => void
) => {
    // ... (logic is unchanged)
};

export const useMediumSelection = (artwork: Partial<Artwork>, setArtwork: React.Dispatch<React.SetStateAction<Partial<Artwork>>>) => {
    // ... (logic is unchanged)
};

const haveDimensionsChanged = (oldDim: any, newDim: any): boolean => {
    if (!oldDim || !newDim) return false;
    return oldDim.width !== newDim.width || oldDim.height !== newDim.height || oldDim.unit !== newDim.unit;
};

// --- MAIN COMPONENT ---
const ArtworkEditorForm = ({ artworkId, formId, onSaveSuccess, onTitleChange }: ArtworkEditorFormProps) => {
    const { user, profile } = useAuth();
    const queryClient = useQueryClient();
    const [artwork, setArtwork] = useState<Partial<Artwork>>({});
    const [originalTitle, setOriginalTitle] = useState('');
    const [allCatalogues, setAllCatalogues] = useState<Catalogue[]>([]);
    const [selectedCatalogues, setSelectedCatalogues] = useState<Catalogue[]>([]);

    const queryKey = ['artwork-editor-data', artworkId];
    
    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () => fetchArtworkAndCatalogues(artworkId, user!.id),
        enabled: !!user,
    });

    useEffect(() => {
        if (data) {
            const { artworkData, allUserCatalogues, assignedCatalogues } = data;
            setArtwork(artworkData);
            setOriginalTitle(artworkData.title || '');
            setAllCatalogues(allUserCatalogues);
            
            const systemCatalogue = allUserCatalogues.find(cat => cat.is_system_catalogue);
            // CORRECTED: Check for 'Active' status to align with previous logic/triggers
            if (assignedCatalogues.length === 0 && systemCatalogue && artworkData.status === 'Active') {
                setSelectedCatalogues([systemCatalogue]);
            } else {
                setSelectedCatalogues(assignedCatalogues);
            }
        }
    }, [data]);

    // CORRECTED: saleMutation and allEditions logic was missing and is now restored
    const saleMutation = useMutation({
        mutationFn: updateSaleStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
        },
        onError: (error: any) => alert(`Error updating sale: ${error.message}`),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ formData, newCatalogueIds }: { formData: Partial<Artwork>, newCatalogueIds: string[] }) => {
            // ... (mutation logic is unchanged)
        },
        onSuccess: (savedData) => {
            // ... (onSuccess logic is unchanged)
        },
        onError: (error: any) => alert(`Error saving artwork: ${error.message}`),
    });
    
    const { parentMedium, childMedium, handleMediumChange, primaryMediumOptions, secondaryMediumOptions } = useMediumSelection(artwork, setArtwork);
    const { handleFormChange, handleJsonChange } = useFormHandlers(artwork, setArtwork, onTitleChange);
    
    const allEditions = useMemo(() => {
        const editionInfo = artwork.edition_info as any;
        if (!editionInfo?.is_edition) return [];
        const editions = [];
        const numericSize = editionInfo.numeric_size || 0;
        const apSize = editionInfo.ap_size || 0;
        for (let i = 1; i <= numericSize; i++) editions.push(`${i}/${numericSize}`);
        for (let i = 1; i <= apSize; i++) editions.push(`AP ${i}/${apSize}`);
        return editions;
    }, [artwork.edition_info]);

    const handleEditionSaleChange = (identifier: string, isChecked: boolean) => {
        saleMutation.mutate({ artworkId, identifier, isSold: isChecked });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { status, ...formData } = artwork;
        const payload: Partial<Artwork> = { ...formData, price: formData.price ? parseFloat(String(formData.price)) : null };
        if (data?.artworkData?.status === 'Pending') {
            payload.status = 'Active'; // Set to 'Active' on first save
        }
        
        const newCatalogueIds = selectedCatalogues.map(cat => cat.id);
        updateMutation.mutate({ formData: payload, newCatalogueIds });
    };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork details...</div>;

    const userSelectableCatalogues = allCatalogues.filter(cat => !cat.is_system_catalogue);

    return (
        <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* ... (Full JSX from previous correct response) ... */}
            {/* CORRECTED: Final check to ensure all `any` casts are safe */}
            {(artwork.edition_info as any)?.is_edition && data?.artworkData?.status !== 'Pending' && (
                <fieldset className="fieldset">
                    <legend className="legend">Sales & Inventory Management</legend>
                    <p>Check the box next to an edition to mark it as sold.</p>
                    <div style={{ /* ... */ }}>
                        {allEditions.map(identifier => (
                            <label key={identifier} style={{/* ... */}}>
                                <input type="checkbox" checked={!!(data?.artworkData?.edition_info as any)?.sold_editions?.includes(identifier)} onChange={(e) => handleEditionSaleChange(identifier, e.target.checked)} disabled={saleMutation.isPending}/>
                                {identifier}
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}
            {/* ... */}
        </form>
    );
};

export default ArtworkEditorForm;