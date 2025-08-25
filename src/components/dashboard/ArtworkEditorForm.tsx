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
const mediaTaxonomy: Record<string, string[]> = {
    'Drawing': ['Graphite (pencil, powder, mechanical)', 'Charcoal (vine, compressed)', 'Chalk (red/white/black, sanguine)', 'Conté (sticks, pencils)', 'Pastel (soft, hard, oil, pan)'],
    'Painting': ['Oil (alla prima, glazing, impasto, grisaille)', 'Acrylic (impasto, pouring, airbrush, glazing)'],
    // ... include all other categories
};

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
    // ... (implementation is unchanged)
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
            if (!profile) throw new Error("You must be logged in.");
            if (!formData.title) throw new Error("Title is required.");
            let finalSlug = formData.slug;
            if (formData.title !== originalTitle) {
                const { data: slugData } = await supabase.rpc('generate_unique_slug', { input_text: formData.title, table_name: 'artworks' });
                finalSlug = slugData;
            }
            const { artist, ...dataToUpdate } = formData;
            const payload = { ...dataToUpdate, slug: finalSlug };
            const { error: artworkUpdateError } = await supabase.from('artworks').update(payload).eq('id', artworkId);
            if (artworkUpdateError) throw artworkUpdateError;
            await supabase.from('artwork_catalogue_junction').delete().eq('artwork_id', artworkId);
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
            const isInitialCreation = !data?.artworkData?.watermarked_image_url || !data?.artworkData?.visualization_image_url;
            if (isInitialCreation) {
                triggerImageGeneration(artworkId, { forceWatermark: true, forceVisualization: true });
            } else {
                const forceVisualization = haveDimensionsChanged(data?.artworkData?.dimensions, savedData.dimensions);
                const originalArtistName = data?.artworkData?.artist?.full_name;
                const currentArtistName = profile?.full_name;
                const hasArtistNameChanged = originalArtistName && currentArtistName && originalArtistName !== currentArtistName;
                if (forceVisualization || hasArtistNameChanged) {
                    triggerImageGeneration(artworkId, {
                        forceVisualization: forceVisualization,
                        forceWatermark: hasArtistNameChanged,
                    });
                }
            }
            onSaveSuccess();
        },
        onError: (error: any) => alert(`Error saving artwork: ${error.message}`),
    });
    
    // --- HELPER LOGIC MOVED INSIDE MAIN COMPONENT ---
    const { parentMedium, childMedium } = useMemo(() => {
        const mediumStr = artwork.medium || '';
        const [parent, ...childParts] = mediumStr.split(': ');
        const child = childParts.join(': ');
        if (parent && Object.keys(mediaTaxonomy).includes(parent)) {
            return { parentMedium: parent, childMedium: child || '' };
        }
        return { parentMedium: '', childMedium: mediumStr };
    }, [artwork.medium]);

    const handleMediumChange = (type: 'parent' | 'child', newValue: string | null) => {
        let newParent = parentMedium;
        let newChild = childMedium;
        if (type === 'parent') { newParent = newValue || ''; newChild = ''; } 
        else { newChild = newValue || ''; }
        let combinedMedium = newParent ? (newChild ? `${newParent}: ${newChild}` : newParent) : '';
        setArtwork(prev => ({ ...prev, medium: combinedMedium }));
    };

    const primaryMediumOptions = Object.keys(mediaTaxonomy);
    const secondaryMediumOptions = useMemo(() => {
        return parentMedium && mediaTaxonomy[parentMedium] ? mediaTaxonomy[parentMedium] : [];
    }, [parentMedium]);

    const handleJsonChange = (parent: keyof Omit<Artwork, 'artist' | 'id' | 'user_id' | 'created_at' | 'updated_at' | 'slug'>, field: string, value: any) => {
        const oldParentState = (artwork as Partial<Artwork>)[parent] as object || {};
        if (parent === 'edition_info' && field === 'is_edition') {
            const isEdition = Boolean(value);
            if (!isEdition) {
                setArtwork(prev => ({ ...prev, edition_info: { ...(prev.edition_info as object || {}), is_edition: false, numeric_size: undefined, ap_size: undefined } }));
            } else {
                setArtwork(prev => ({ ...prev, edition_info: { ...(prev.edition_info as object || {}), is_edition: true } }));
            }
        } else {
            setArtwork(prev => ({ ...prev, [parent]: { ...oldParentState, [field]: value } }));
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
        setArtwork(prev => ({ ...prev, [name]: checked !== undefined ? checked : value }));
        if (name === 'title' && onTitleChange) onTitleChange(value);
    };

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
            payload.status = 'Available';
        }
        
        const newCatalogueIds = selectedCatalogues.map(cat => cat.id);
        updateMutation.mutate({ formData: payload, newCatalogueIds });
    };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork details...</div>;

    const userSelectableCatalogues = allCatalogues.filter(cat => !cat.is_system_catalogue);

    return (
        <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* The full unabridged JSX for the form from the previous correct response goes here */}
        </form>
    );
};

export default ArtworkEditorForm;