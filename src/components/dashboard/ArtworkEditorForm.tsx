import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- TYPE DEFINITIONS (UPDATED) ---
// Now includes the joined artist profile data
type Artwork = {
    id: string;
    title: string | null;
    description: string | null;
    image_url: string | null;
    price: number | null;
    status: 'Pending' | 'Active' | 'Sold';
    medium: string | null;
    dimensions: { height?: string; width?: string; depth?: string; unit?: string } | null;
    signature_info: { is_signed?: boolean; location?: string } | null;
    framing_info: { is_framed?: boolean; details?: string } | null;
    provenance: string | null;
    edition_info: { is_edition?: boolean; numeric_size?: number; ap_size?: number; sold_editions?: string[] } | null;
    is_price_negotiable?: boolean;
    slug?: string;
    // --- CHANGE 1: Added nested artist type for the join ---
    artist: { full_name: string | null } | null; 
};

// --- PROPS INTERFACE ---
interface ArtworkEditorFormProps {
  artworkId: string;
  formId: string;
  onSaveSuccess: () => void;
  onTitleChange?: (newTitle: string) => void;
  submitButton?: React.ReactNode;
}

// --- API FUNCTIONS (UPDATED) ---
const fetchArtwork = async (artworkId: string): Promise<Artwork> => {
    // --- CHANGE 2: Joined the profiles table to get the artist's name ---
    const { data, error } = await supabase
      .from('artworks')
      .select('*, artist:profiles!user_id(full_name)') // Correctly joins profiles using the user_id FK
      .eq('id', artworkId)
      .single();
      
    if (error) throw new Error(`Artwork not found: ${error.message}`);
    return data as any;
};

// ... (The triggerImageGeneration function is unchanged)
const triggerImageGeneration = async (artworkId: string, flags: { forceWatermark?: boolean, forceVisualization?: boolean } = {}) => {
    console.log(`Triggering image generation for ${artworkId} with flags:`, flags);
    try {
        const { error } = await supabase.functions.invoke('generate-images', {
            body: { 
                artworkId, 
                forceWatermarkUpdate: !!flags.forceWatermark,
                forceVisualizationUpdate: !!flags.forceVisualization
            },
        });
        if (error) throw error;
    } catch (err) {
        console.error("Background image generation failed:", (err as Error).message);
    }
};


const ArtworkEditorForm = ({ artworkId, formId, onSaveSuccess, onTitleChange, submitButton }: ArtworkEditorFormProps) => {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [artwork, setArtwork] = useState<Partial<Artwork>>({});
    
    const queryKey = ['artwork-form', artworkId];
    const { data: originalArtwork, isLoading } = useQuery({ queryKey, queryFn: () => fetchArtwork(artworkId) });

    useEffect(() => {
        if (originalArtwork) {
            setArtwork(originalArtwork);
        }
    }, [originalArtwork]);

    const haveDimensionsChanged = (oldDim: any, newDim: any): boolean => {
        if (!oldDim || !newDim) return false;
        return oldDim.width !== newDim.width || oldDim.height !== newDim.height || oldDim.unit !== newDim.unit;
    };
    
    const updateMutation = useMutation({
        mutationFn: async (formData: Partial<Artwork>) => {
            if (!profile) throw new Error("You must be logged in.");
            if (!formData.title) throw new Error("Title is required.");
            
            // The joined 'artist' object should not be part of the update payload
            const { artist, ...dataToUpdate } = formData;

            const { error } = await supabase.from('artworks').update(dataToUpdate).eq('id', artworkId);
            if (error) throw error;
            return formData; 
        },
        onSuccess: (savedData) => {
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            queryClient.invalidateQueries({ queryKey });

            const isInitialCreation = !originalArtwork?.watermarked_image_url || !originalArtwork?.visualization_image_url;
            
            if (isInitialCreation) {
                triggerImageGeneration(artworkId);
            } else {
                const forceVisualization = haveDimensionsChanged(originalArtwork?.dimensions, savedData.dimensions);
                
                // --- CHANGE 3: More precise logic for watermark regeneration ---
                const originalArtistName = originalArtwork?.artist?.full_name;
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

    // ... (All other handlers: handleFormChange, handleJsonChange, handleSubmit, etc., are unchanged)
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
        
        const newArtworkState = { ...artwork, [name]: checked !== undefined ? checked : value };
        setArtwork(newArtworkState);

        if (name === 'title' && onTitleChange) {
            onTitleChange(value);
        }
    };

    const handleJsonChange = (parent: keyof Artwork, field: string, value: any) => {
        const oldParentState = artwork[parent] as object || {};
        setArtwork(prev => ({ ...prev, [parent]: { ...oldParentState, [field]: value } }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { status, ...formData } = artwork;
        const payload: Partial<Artwork> = { ...formData, price: formData.price ? parseFloat(String(formData.price)) : null };
        
        if (originalArtwork?.status === 'Pending') {
            payload.status = 'Active';
        }
        
        updateMutation.mutate(payload);
    };

    if (isLoading) return <div>Loading form...</div>;
    
    // The rest of the JSX for the form is unchanged.
    return (
        <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
           {/* All your fieldsets and inputs remain the same */}
            <fieldset>
                <legend>Primary Information</legend>
                <label>Title</label>
                <input name="title" className="input" type="text" value={artwork.title || ''} onChange={handleFormChange} required />
            </fieldset>
            
            <fieldset>
                <legend>Artwork Details</legend>
                 <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem'}}>
                    <div>
                        <label>Height</label>
                        <input type="text" value={artwork.dimensions?.height || ''} onChange={e => handleJsonChange('dimensions', 'height', e.target.value)} className="input" required />
                    </div>
                    <div>
                        <label>Width</label>
                        <input type="text" value={artwork.dimensions?.width || ''} onChange={e => handleJsonChange('dimensions', 'width', e.target.value)} className="input" required />
                    </div>
                    <div>
                        <label>Depth (Optional)</label>
                        <input type="text" value={artwork.dimensions?.depth || ''} onChange={e => handleJsonChange('dimensions', 'depth', e.target.value)} className="input" />
                    </div>
                    <div>
                        <label>Unit</label>
                        <input type="text" value={artwork.dimensions?.unit || ''} onChange={e => handleJsonChange('dimensions', 'unit', e.target.value)} className="input" placeholder="e.g., in, cm" />
                    </div>
                </div>
            </fieldset>

             <fieldset><legend>Pricing</legend><label>Price ($)</label><input name="price" className="input" type="number" step="0.01" value={artwork.price || ''} onChange={handleFormChange} /><label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><input name="is_price_negotiable" type="checkbox" checked={!!artwork.is_price_negotiable} onChange={handleFormChange} /> Price is negotiable </label></fieldset>

            {submitButton && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    {React.cloneElement(submitButton as React.ReactElement, {
                        type: 'submit',
                        disabled: updateMutation.isPending,
                        children: updateMutation.isPending ? 'Saving...' : (submitButton as React.ReactElement).props.children,
                    })}
                </div>
            )}
        </form>
    );
};

export default ArtworkEditorForm;