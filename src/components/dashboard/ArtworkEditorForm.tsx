import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database } from '@/types/database.types';

// MUI Imports for Multi-Select
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';

// --- TYPE DEFINITIONS ---
type Artwork = Database['public']['Tables']['artworks']['Row'];
type Catalogue = Database['public']['Tables']['catalogues']['Row'];

// --- PROPS INTERFACE ---
interface ArtworkEditorFormProps {
  artworkId: string;
  formId: string;
  onSaveSuccess: () => void;
  onTitleChange?: (newTitle: string) => void;
}

// --- MEDIA TAXONOMY ---
const mediaTaxonomy: Record<string, string[]> = {
    'Drawing': ['Graphite (pencil, powder, mechanical)', 'Charcoal (vine, compressed)', 'Chalk (red/white/black, sanguine)'],
    'Painting': ['Oil (alla prima, glazing, impasto, grisaille)', 'Acrylic (impasto, pouring, airbrush, glazing)'],
    'Printmaking': ['Relief (woodcut, linocut, wood engraving)', 'Intaglio (engraving, etching, drypoint, aquint, mezzotint, photogravure)'],
    'Sculpture': ['Stone (carving)', 'Wood (carving, turning)', 'Metal (lost-wax bronze, sand casting, forging, fabrication/welding)'],
    // ... (include all other categories)
};

// --- API FUNCTIONS (Updated for new schema) ---
const fetchArtworkAndCatalogues = async (artworkId: string, userId: string) => {
    const { data: artworkData, error: artworkError } = await supabase
        .from('artworks').select('*, artist:profiles!user_id(full_name)').eq('id', artworkId).single();
    if (artworkError) throw new Error(`Artwork not found: ${artworkError.message}`);

    const { data: allUserCatalogues, error: allCatError } = await supabase
        .from('catalogues').select('id, title, is_system_catalogue').eq('user_id', userId);
    if (allCatError) throw new Error(`Could not fetch catalogues: ${allCatError.message}`);

    const { data: assignedJunctions, error: junctionError } = await supabase
        .from('artwork_catalogue_junction').select('catalogue_id').eq('artwork_id', artworkId);
    if (junctionError) throw new Error(`Could not fetch assignments: ${junctionError.message}`);
    
    const assignedCatalogueIds = new Set(assignedJunctions.map(j => j.catalogue_id));
    const assignedCatalogues = allUserCatalogues.filter(cat => assignedCatalogueIds.has(cat.id));

    return { artworkData, allUserCatalogues, assignedCatalogues };
};

const triggerImageGeneration = async (artworkId: string, flags: { forceWatermark?: boolean, forceVisualization?: boolean } = {}) => {
    // ... (implementation is unchanged)
};

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
        onSuccess: (fetchedData) => {
            if (fetchedData) {
                const { artworkData, allUserCatalogues, assignedCatalogues } = fetchedData;
                setArtwork(artworkData);
                setOriginalTitle(artworkData.title || '');
                setAllCatalogues(allUserCatalogues);
                
                const systemCatalogue = allUserCatalogues.find(cat => cat.is_system_catalogue);
                if (assignedCatalogues.length === 0 && systemCatalogue && artworkData.status === 'Active') {
                    setSelectedCatalogues([systemCatalogue]);
                } else {
                    setSelectedCatalogues(assignedCatalogues);
                }
            }
        }
    });
    
    const updateMutation = useMutation({
        mutationFn: async ({ formData, newCatalogueIds }: { formData: Partial<Artwork>, newCatalogueIds: string[] }) => {
            const { artist, ...dataToUpdate } = formData;
            const { error: artworkUpdateError } = await supabase.from('artworks').update(dataToUpdate).eq('id', artworkId);
            if (artworkUpdateError) throw artworkUpdateError;

            const { error: deleteError } = await supabase.from('artwork_catalogue_junction').delete().eq('artwork_id', artworkId);
            if (deleteError) throw deleteError;

            if (newCatalogueIds.length > 0) {
                const newJunctions = newCatalogueIds.map(catId => ({ artwork_id: artworkId, catalogue_id: catId }));
                const { error: insertError } = await supabase.from('artwork_catalogue_junction').insert(newJunctions);
                if (insertError) throw insertError;
            }
            return formData; 
        },
        onSuccess: (savedData) => {
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            queryClient.invalidateQueries({ queryKey: ['cataloguesWithStatusCounts'] });
            queryClient.invalidateQueries({ queryKey });
            
            // ... (Image generation logic is unchanged)

            onSaveSuccess();
        },
        onError: (error: any) => alert(`Error saving artwork: ${error.message}`),
    });

    const { parentMedium, childMedium, handleMediumChange, primaryMediumOptions, secondaryMediumOptions } = useMediumSelection(artwork, setArtwork);
    const { handleFormChange, handleJsonChange } = useFormHandlers(setArtwork, onTitleChange);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { status, ...formData } = artwork;
        const payload: Partial<Artwork> = { ...formData, price: formData.price ? parseFloat(String(formData.price)) : null };
        if (data?.artworkData?.status === 'Pending') payload.status = 'Active';
        
        const newCatalogueIds = selectedCatalogues.map(cat => cat.id);
        updateMutation.mutate({ formData: payload, newCatalogueIds });
    };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork details...</div>;

    const userSelectableCatalogues = allCatalogues.filter(cat => !cat.is_system_catalogue);

    return (
        <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* ... (Primary Info, Artwork Details, Edition, Provenance, Pricing fieldsets are unchanged) ... */}
            {/* Make sure all fieldsets use className="fieldset" etc. as in previous versions */}

            <fieldset className="fieldset">
                <legend className="legend">Catalogue Assignment</legend>
                <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
                    This artwork will automatically appear in "Available Work" when active. Add it to your custom catalogues below.
                </p>
                <Autocomplete
                    multiple
                    options={userSelectableCatalogues}
                    getOptionLabel={(option) => option.title}
                    value={selectedCatalogues.filter(cat => !cat.is_system_catalogue)}
                    onChange={(event, newValue) => {
                        const systemCatalogue = allCatalogues.find(cat => cat.is_system_catalogue);
                        const finalSelection = systemCatalogue ? [systemCatalogue, ...newValue] : newValue;
                        // Only include the system catalogue if the artwork is Active
                        if (artwork.status !== 'Active' && systemCatalogue) {
                            setSelectedCatalogues(newValue);
                        } else {
                            setSelectedCatalogues(finalSelection);
                        }
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Select catalogues..." />
                    )}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                            <Chip
                                variant="outlined"
                                label={option.title}
                                {...getTagProps({ index })}
                            />
                        ))
                    }
                />
            </fieldset>
        </form>
    );
};

// Helper hooks to keep the main component clean
const useMediumSelection = (artwork: Partial<Artwork>, setArtwork: React.Dispatch<React.SetStateAction<Partial<Artwork>>>) => {
    // ... (paste the full useMemo and handleMediumChange logic here from previous response)
};
const useFormHandlers = (setArtwork: React.Dispatch<React.SetStateAction<Partial<Artwork>>>, onTitleChange?: (newTitle: string) => void) => {
    // ... (paste the handleFormChange and handleJsonChange logic here)
};

export default ArtworkEditorForm;