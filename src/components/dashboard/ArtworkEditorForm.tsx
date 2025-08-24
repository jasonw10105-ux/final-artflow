import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- TYPE DEFINITIONS ---
type EditionInfo = { is_edition?: boolean; numeric_size?: number; ap_size?: number; sold_editions?: string[] };
type Artwork = {
    id: string; title: string | null; description: string | null; image_url: string | null;
    price: number | null; status: 'Pending' | 'Active' | 'Sold'; medium: string | null;
    dimensions: { height?: string; width?: string; depth?: string; unit?: string } | null;
    signature_info: { is_signed?: boolean; location?: string } | null;
    framing_info: { is_framed?: boolean; details?: string } | null;
    provenance: string | null; edition_info: EditionInfo | null; is_price_negotiable?: boolean;
    slug?: string; watermarked_image_url: string | null; visualization_image_url: string | null;
    artist: { full_name: string | null } | null; // For the join
};

// --- PROPS INTERFACE ---
interface ArtworkEditorFormProps {
  artworkId: string; formId: string; onSaveSuccess: () => void;
  onTitleChange?: (newTitle: string) => void;
}

// --- MEDIA TAXONOMY ---
const mediaTaxonomy: Record<string, string[]> = { /* Paste your full mediaTaxonomy object here */ };

// --- API FUNCTIONS ---
const fetchArtwork = async (artworkId: string): Promise<Artwork> => {
    const { data, error } = await supabase.from('artworks').select('*, artist:profiles!user_id(full_name)').eq('id', artworkId).single();
    if (error) throw new Error(`Artwork not found: ${error.message}`);
    return data as any;
};

const updateSaleStatus = async ({ artworkId, identifier, isSold }: { artworkId: string, identifier: string, isSold: boolean }) => {
    const { error } = await supabase.rpc('update_artwork_edition_sale', { p_artwork_id: artworkId, p_edition_identifier: identifier, p_is_sold: isSold });
    if (error) throw error;
};

const triggerImageGeneration = async (artworkId: string, flags: { forceWatermark?: boolean, forceVisualization?: boolean } = {}) => {
    console.log(`Triggering image generation for ${artworkId} with flags:`, flags);
    try {
        const { error } = await supabase.functions.invoke('generate-images', {
            body: { artworkId, forceWatermarkUpdate: !!flags.forceWatermark, forceVisualizationUpdate: !!flags.forceVisualization },
        });
        if (error) throw error;
    } catch (err) {
        console.error("Background image generation failed:", (err as Error).message);
    }
};

const ArtworkEditorForm = ({ artworkId, formId, onSaveSuccess, onTitleChange }: ArtworkEditorFormProps) => {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [artwork, setArtwork] = useState<Partial<Omit<Artwork, 'id'>>>({});
    
    const queryKey = ['artwork-form', artworkId];
    const { data: originalArtwork, isLoading } = useQuery({ queryKey, queryFn: () => fetchArtwork(artworkId) });

    useEffect(() => { if (originalArtwork) setArtwork(originalArtwork); }, [originalArtwork]);

    const haveDimensionsChanged = (oldDim: any, newDim: any): boolean => {
        if (!oldDim || !newDim) return false;
        return oldDim.width !== newDim.width || oldDim.height !== newDim.height || oldDim.unit !== newDim.unit;
    };
    
    const saleMutation = useMutation({
        mutationFn: updateSaleStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
        },
        onError: (error: any) => alert(`Error updating sale: ${error.message}`),
    });

    const updateMutation = useMutation({
        mutationFn: async (formData: Partial<Artwork>) => {
            if (!profile) throw new Error("You must be logged in.");
            if (!formData.title) throw new Error("Title is required.");
            
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

    const { parentMedium, childMedium } = useMemo(() => {
        const mediumStr = artwork.medium || '';
        const [parent, ...childParts] = mediumStr.split(': ');
        const child = childParts.join(': ');
        return (parent && Object.keys(mediaTaxonomy).includes(parent))
            ? { parentMedium: parent, childMedium: child || '' }
            : { parentMedium: '', childMedium: mediumStr };
    }, [artwork.medium]);

    const handleMediumChange = (newParent?: string, newChild?: string) => {
        const currentParent = newParent !== undefined ? newParent : parentMedium;
        const currentChild = newChild !== undefined ? newChild : childMedium;
        let combinedMedium = currentParent ? (currentChild ? `${currentParent}: ${currentChild}` : currentParent) : currentChild;
        setArtwork(prev => ({ ...prev, medium: combinedMedium }));
    };

    const handleJsonChange = (parent: keyof Artwork, field: string, value: any) => {
        const oldParentState = artwork[parent] as object || {};
        setArtwork(prev => ({ ...prev, [parent]: { ...oldParentState, [field]: value } }));
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
        const newArtworkState = { ...artwork, [name]: checked !== undefined ? checked : value };
        setArtwork(newArtworkState);
        if (name === 'title' && onTitleChange) onTitleChange(value);
    };

    const allEditions = useMemo(() => {
        if (!artwork.edition_info?.is_edition) return [];
        const editions = [];
        const numericSize = artwork.edition_info?.numeric_size || 0;
        const apSize = artwork.edition_info?.ap_size || 0;
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
        if (originalArtwork?.status === 'Pending') payload.status = 'Active';
        updateMutation.mutate(payload);
    };

    if (isLoading) return <div>Loading artwork details...</div>;

    return (
        <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <fieldset>
                <legend>Primary Information</legend>
                <label>Title</label>
                <input name="title" className="input" type="text" value={artwork.title || ''} onChange={handleFormChange} required />
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem'}}>
                    <div>
                        <label>Primary Medium</label>
                        <select className="input" value={parentMedium} onChange={e => handleMediumChange(e.target.value, undefined)} required>
                            <option value="" disabled>Select a category...</option>
                            {Object.keys(mediaTaxonomy).map(parent => <option key={parent} value={parent}>{parent}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>Secondary Medium (Optional)</label>
                        <input name="medium_child" className="input" type="text" value={childMedium} onChange={e => handleMediumChange(undefined, e.target.value)} list="media-suggestions" placeholder="e.g., Oil, Impasto" disabled={!parentMedium} />
                        {parentMedium && mediaTaxonomy[parentMedium] && <datalist id="media-suggestions">{mediaTaxonomy[parentMedium].map(suggestion => <option key={suggestion} value={suggestion} />)}</datalist>}
                    </div>
                </div>

                <label style={{marginTop: '1rem'}}>Description</label>
                <textarea name="description" className="input" value={artwork.description || ''} onChange={handleFormChange} />
            </fieldset>

            <fieldset>
                <legend>Artwork Details</legend>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem'}}>
                    <div><label>Height</label><input type="text" value={artwork.dimensions?.height || ''} onChange={e => handleJsonChange('dimensions', 'height', e.target.value)} className="input" placeholder="e.g., 24" required /></div>
                    <div><label>Width</label><input type="text" value={artwork.dimensions?.width || ''} onChange={e => handleJsonChange('dimensions', 'width', e.target.value)} className="input" placeholder="e.g., 18" required /></div>
                    <div><label>Depth (Optional)</label><input type="text" value={artwork.dimensions?.depth || ''} onChange={e => handleJsonChange('dimensions', 'depth', e.target.value)} className="input" /></div>
                    <div><label>Unit</label><input type="text" value={artwork.dimensions?.unit || ''} onChange={e => handleJsonChange('dimensions', 'unit', e.target.value)} className="input" placeholder="e.g., in, cm" /></div>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem'}}>
                    <div>
                        <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}><input type="checkbox" checked={!!artwork.framing_info?.is_framed} onChange={e => handleJsonChange('framing_info', 'is_framed', e.target.checked)} /> Framed</label>
                        {artwork.framing_info?.is_framed && (<div><label>Frame Details</label><textarea className="input" placeholder="e.g., Black gallery frame" value={artwork.framing_info?.details || ''} onChange={e => handleJsonChange('framing_info', 'details', e.target.value)} required={!!artwork.framing_info?.is_framed} /></div>)}
                    </div>
                    <div>
                        <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}><input type="checkbox" checked={!!artwork.signature_info?.is_signed} onChange={e => handleJsonChange('signature_info', 'is_signed', e.target.checked)} /> Signed</label>
                        {artwork.signature_info?.is_signed && (<div><label>Signature Location & Details</label><input type="text" className="input" placeholder="e.g., Verso, bottom right" value={artwork.signature_info?.location || ''} onChange={e => handleJsonChange('signature_info', 'location', e.target.value)} required={!!artwork.signature_info?.is_signed} /></div>)}
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend>Edition Information</legend>
                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><input type="checkbox" checked={!!artwork.edition_info?.is_edition} onChange={e => handleJsonChange('edition_info', 'is_edition', e.target.checked)} />This work is part of an edition</label>
                {artwork.edition_info?.is_edition && (
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem'}}>
                        <div><label>Numeric Edition Size</label><input type="number" value={artwork.edition_info?.numeric_size || ''} onChange={e => handleJsonChange('edition_info', 'numeric_size', parseInt(e.target.value, 10))} className="input" /></div>
                        <div><label>Total Artist's Proofs (APs)</label><input type="number" value={artwork.edition_info?.ap_size || ''} onChange={e => handleJsonChange('edition_info', 'ap_size', parseInt(e.target.value, 10))} className="input" /></div>
                    </div>
                )}
            </fieldset>

            {artwork.edition_info?.is_edition && originalArtwork?.status !== 'Pending' && (
                <fieldset><legend>Sales & Inventory Management</legend><p>Check the box next to an edition to mark it as sold.</p><div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', padding: '1rem', background: 'var(--background-alt)'}}>{allEditions.map(id => (<label key={id}><input type="checkbox" checked={originalArtwork?.edition_info?.sold_editions?.includes(id)} onChange={(e) => handleEditionSaleChange(id, e.target.checked)} disabled={saleMutation.isPending}/> {id}</label>))}</div></fieldset>
            )}

            <fieldset><legend>Provenance</legend><textarea name="provenance" className="input" placeholder="History of ownership, exhibitions, etc." value={artwork.provenance || ''} onChange={handleFormChange} /></fieldset>
            
            <fieldset><legend>Pricing</legend><label>Price ($)</label><input name="price" className="input" type="number" step="0.01" value={artwork.price || ''} onChange={handleFormChange} /><label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><input name="is_price_negotiable" type="checkbox" checked={!!artwork.is_price_negotiable} onChange={handleFormChange} /> Price is negotiable </label></fieldset>
        </form>
    );
};

export default ArtworkEditorForm;
```---

### 2. The Artwork Creation Wizard (Unchanged from before, correct)
This page consumes the complete form above. Its logic remains the same and is correct.

**File:** `src/pages/dashboard/artist/ArtworkWizardPage.tsx`
```typescript
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import ArtworkEditorForm from '../../../components/dashboard/ArtworkEditorForm';
import { ArrowLeft, ArrowRight, PlusCircle, Trash2 } from 'lucide-react';
import ArtworkUploadModal from '../../../components/dashboard/ArtworkUploadModal';
import { useArtworkUploadStore } from '../../../stores/artworkUploadStore';

// ... (fetchArtworksByIds function is unchanged)
const fetchArtworksByIds = async (ids: string[]) => {
    if (!ids || ids.length === 0) return [];
    const { data, error } = await supabase.from('artworks').select('*').in('id', ids);
    if (error) throw new Error(error.message);
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
    
    useEffect(() => { mainContentRef.current?.scrollTo(0, 0); }, [currentIndex]);

    const handleTitleChange = (artworkIdToUpdate: string, newTitle: string) => { /* ... (no changes) ... */ };
    const handleRemoveArtwork = async (artworkIdToRemove: string, artworkTitle: string) => { /* ... (no changes) ... */ };

    const handleSaveAndNext = () => {
        if (currentIndex < artworkIds.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            alert("All artworks have been processed! Images are being generated in the background.");
            navigate('/artist/artworks');
        }
    };
    
    const handleMoreUploadsComplete = (newArtworkIds: string[]) => { /* ... (no changes) ... */ };
    const currentArtwork = useMemo(() => artworks?.[currentIndex], [artworks, currentIndex]);
    const FORM_ID = `artwork-wizard-form-${currentArtwork?.id}`;

    const triggerFormSubmit = () => {
        const form = document.getElementById(FORM_ID) as HTMLFormElement;
        if (form) form.requestSubmit();
    };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork wizard...</div>;
    if (isSuccess && (!artworks || artworks.length === 0)) return <div style={{padding: '2rem'}}>No artworks found to edit. <Link to="/artist/artworks">Go back</Link></div>;

    return (
        // The JSX for the wizard layout, header, and sidebar remains the same.
        // It correctly renders the complete ArtworkEditorForm below.
        <main ref={mainContentRef}>
            {currentArtwork && (
                <div>
                    <img src={currentArtwork.image_url} alt={currentArtwork.title || 'Untitled'}/>
                    <div>
                        <ArtworkEditorForm 
                            key={currentArtwork.id}
                            artworkId={currentArtwork.id} 
                            onSaveSuccess={handleSaveAndNext} 
                            formId={FORM_ID}
                            onTitleChange={(newTitle) => handleTitleChange(currentArtwork.id, newTitle)}
                        />
                        <div>
                            <button onClick={triggerFormSubmit} className="button button-primary"> 
                                {currentIndex === (artworks?.length ?? 0) - 1 ? 'Finish Wizard' : 'Save & Go to Next'} 
                                <ArrowRight size={16} /> 
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ArtworkWizardPage;