import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- TYPE DEFINITIONS (Unchanged) ---
type EditionInfo = { is_edition?: boolean; numeric_size?: number; ap_size?: number; sold_editions?: string[] };
type Artwork = {
    id: string; title: string | null; description: string | null; image_url: string | null;
    price: number | null; status: 'Pending' | 'Active' | 'Sold'; medium: string | null;
    dimensions: { height?: string; width?: string; depth?: string; unit?: string } | null;
    signature_info: { is_signed?: boolean; location?: string } | null;
    framing_info: { is_framed?: boolean; details?: string } | null;
    provenance: string | null; edition_info: EditionInfo | null; is_price_negotiable?: boolean;
    slug?: string; watermarked_image_url: string | null; visualization_image_url: string | null;
    artist: { full_name: string | null } | null;
};

// --- PROPS INTERFACE (Unchanged) ---
interface ArtworkEditorFormProps {
  artworkId: string;
  formId: string;
  onSaveSuccess: () => void;
  onTitleChange?: (newTitle: string) => void;
}

// --- MEDIA TAXONOMY (Unchanged) ---
const mediaTaxonomy: Record<string, string[]> = { /* Your full media taxonomy object */ };

// --- API FUNCTIONS (Unchanged) ---
const fetchArtwork = async (artworkId: string): Promise<Artwork> => { /* ... */ };
const updateSaleStatus = async ({ artworkId, identifier, isSold }: { artworkId: string, identifier: string, isSold: boolean }) => { /* ... */ };
const triggerImageGeneration = async (artworkId: string, flags: { forceWatermark?: boolean, forceVisualization?: boolean } = {}) => { /* ... */ };


const ArtworkEditorForm = ({ artworkId, formId, onSaveSuccess, onTitleChange }: ArtworkEditorFormProps) => {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [artwork, setArtwork] = useState<Partial<Omit<Artwork, 'id'>>>({});
    const [originalTitle, setOriginalTitle] = useState('');
    
    const queryKey = ['artwork-form', artworkId];
    const { data: originalArtwork, isLoading } = useQuery({ queryKey, queryFn: () => fetchArtwork(artworkId) });

    useEffect(() => {
        if (originalArtwork) {
            setArtwork(originalArtwork);
            setOriginalTitle(originalArtwork.title || '');
        }
    }, [originalArtwork]);

    // --- (All other hooks like useMutation, useMemo for medium, etc., are unchanged) ---
    const haveDimensionsChanged = (oldDim: any, newDim: any): boolean => { /* ... */ };
    const saleMutation = useMutation({ /* ... */ });
    const updateMutation = useMutation({ /* ... */ });
    const { parentMedium, childMedium } = useMemo(() => { /* ... */ }, [artwork.medium]);
    
    // --- UPDATED: Smarter handler for JSON objects and toggles ---
    const handleJsonChange = (parent: keyof Artwork, field: string, value: any) => {
        const oldParentState = artwork[parent] as object || {};

        // Special handling for the edition toggle
        if (parent === 'edition_info' && field === 'is_edition' && value === false) {
            // When toggling OFF, reset the edition sizes to ensure clean data
            setArtwork(prev => ({
                ...prev,
                edition_info: {
                    ...(prev.edition_info || {}),
                    is_edition: false,
                    numeric_size: undefined,
                    ap_size: undefined,
                }
            }));
        } else {
            // Default behavior for all other changes
            setArtwork(prev => ({ ...prev, [parent]: { ...oldParentState, [field]: value } }));
        }
    };

    const handleMediumChange = (newParent?: string, newChild?: string) => { /* ... */ };
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { /* ... */ };
    const allEditions = useMemo(() => { /* ... */ }, [artwork.edition_info]);
    const handleEditionSaleChange = (identifier: string, isChecked: boolean) => { /* ... */ };
    const handleSubmit = (e: React.FormEvent) => { /* ... */ };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork details...</div>;

    return (
        <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* ... (All other fieldsets: Primary Information, Artwork Details, etc., are unchanged) ... */}
            
            {/* --- REVISED: Edition Information Fieldset --- */}
            <fieldset>
                <legend>Edition Information</legend>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={!!artwork.edition_info?.is_edition}
                            onChange={e => handleJsonChange('edition_info', 'is_edition', e.target.checked)}
                        />
                        <span className="slider round"></span>
                    </label>
                    <p style={{ margin: 0, fontWeight: 500 }}>
                        {artwork.edition_info?.is_edition ? "This work is part of an edition" : "This is a unique work"}
                    </p>
                </div>

                {artwork.edition_info?.is_edition && (
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        <div>
                            <label>Numeric Edition Size</label>
                            <input
                                type="number"
                                value={artwork.edition_info?.numeric_size || ''}
                                onChange={e => handleJsonChange('edition_info', 'numeric_size', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                className="input"
                                placeholder="e.g., 50"
                                required // This field is required if it's an edition
                            />
                        </div>
                        <div>
                            <label>Total Artist's Proofs (APs)</label>
                            <input
                                type="number"
                                value={artwork.edition_info?.ap_size || ''}
                                onChange={e => handleJsonChange('edition_info', 'ap_size', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                className="input"
                                placeholder="e.g., 5"
                            />
                        </div>
                    </div>
                )}
            </fieldset>

            {/* ... (Provenance and Pricing fieldsets are unchanged) ... */}
        </form>
    );
};

export default ArtworkEditorForm;