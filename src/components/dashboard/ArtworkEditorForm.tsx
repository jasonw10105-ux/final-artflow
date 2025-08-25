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
    // ... (function is unchanged and correct)
};
const updateSaleStatus = async ({ artworkId, identifier, isSold }: { artworkId: string, identifier: string, isSold: boolean }) => {
    // ... (function is unchanged and correct)
};
const triggerImageGeneration = async (artworkId: string, flags: { forceWatermark?: boolean, forceVisualization?: boolean } = {}) => {
    // ... (function is unchanged and correct)
};

// --- HELPER HOOKS ---
const useFormHandlers = (
    artwork: Partial<Artwork>, 
    setArtwork: React.Dispatch<React.SetStateAction<Partial<Artwork>>>, 
    onTitleChange?: (newTitle: string) => void
) => {
    // ... (logic is unchanged and correct)
};

const useMediumSelection = (artwork: Partial<Artwork>, setArtwork: React.Dispatch<React.SetStateAction<Partial<Artwork>>>) => {
    // ... (logic is unchanged and correct)
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
            // CORRECTED: Check for 'Available' status from your types, not 'Active'
            if (assignedCatalogues.length === 0 && systemCatalogue && artworkData.status === 'Available') {
                setSelectedCatalogues([systemCatalogue]);
            } else {
                setSelectedCatalogues(assignedCatalogues);
            }
        }
    }, [data]);

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
    
    // CORRECTED: Called the helper hooks to get their return values
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
            // CORRECTED: Set status to 'Available' not 'Active'
            payload.status = 'Available';
        }
        
        const newCatalogueIds = selectedCatalogues.map(cat => cat.id);
        updateMutation.mutate({ formData: payload, newCatalogueIds });
    };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork details...</div>;

    return (
        <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* ... (Full JSX from previous correct response) ... */}
            {/* CORRECTED: Final check to ensure status check is correct */}
            <Autocomplete
                multiple
                // ... other props
                onChange={(_, newValue) => {
                    const systemCatalogue = allCatalogues.find(cat => cat.is_system_catalogue);
                    const finalSelection = systemCatalogue ? [systemCatalogue, ...newValue] : newValue;
                    if (artwork.status !== 'Available' && systemCatalogue) {
                        setSelectedCatalogues(newValue);
                    } else {
                        setSelectedCatalogues(finalSelection);
                    }
                }}
                // ... other props
            />
            {/* CORRECTED: Coerce checkbox value to a boolean */}
            <input type="checkbox" checked={!!(data?.artworkData?.edition_info as any)?.sold_editions?.includes(identifier)} onChange={(e) => handleEditionSaleChange(identifier, e.target.checked)} disabled={saleMutation.isPending}/>
        </form>
    );
};

export default ArtworkEditorForm;