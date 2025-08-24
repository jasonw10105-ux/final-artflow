import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- TYPE DEFINITIONS ---
type EditionInfo = { is_edition?: boolean; numeric_size?: number; ap_size?: number; sold_editions?: string[] };
type Artwork = {
    id: string; title: string | null; description: string | null; image_url: string | null;
    price: number | null; 
    // --- THIS IS THE CORRECTED LINE ---
    status: 'Pending' | 'Active' | 'Sold'; 
    medium: string | null;
    dimensions: { height?: string; width?: string; depth?: string; unit?: string } | null;
    signature_info: { is_signed?: boolean; location?: string } | null;
    framing_info: { is_framed?: boolean; details?: string } | null;
    provenance: string | null; edition_info: EditionInfo | null; is_price_negotiable?: boolean;
    slug?: string; watermarked_image_url: string | null; visualization_image_url: string | null;
    artist: { full_name: string | null } | null;
};

// --- PROPS INTERFACE ---
interface ArtworkEditorFormProps {
  artworkId: string;
  formId: string;
  onSaveSuccess: () => void;
  onTitleChange?: (newTitle: string) => void;
}

// --- MEDIA TAXONOMY ---
const mediaTaxonomy: Record<string, string[]> = {
    'Drawing': ['Graphite (pencil, powder, mechanical)', 'Charcoal (vine, compressed)', 'Chalk (red/white/black, sanguine)', 'Conté (sticks, pencils)', 'Pastel (soft, hard, oil, pan)', 'Ink (India, sumi, iron-gall; brush/pen; wash)', 'Markers (alcohol/water/paint)', 'Silverpoint/metalpoint', 'Colored pencil (wax/oil/water-soluble)'],
    'Painting': ['Oil (alla prima, glazing, impasto, grisaille)', 'Acrylic (impasto, pouring, airbrush, glazing)', 'Watercolor (transparent, wet-on-wet, drybrush)', 'Gouache (opaque watercolor)', 'Tempera (egg tempera, casein)', 'Encaustic (hot wax)', 'Fresco (buon fresco, fresco secco)', 'Ink painting (sumi-e)', 'Spray/Aerosol (stencil, freehand)', 'Vitreous enamel'],
    'Printmaking': ['Relief (woodcut, linocut, wood engraving)', 'Intaglio (engraving, etching, drypoint, aquatint, mezzotint, photogravure)', 'Planographic (lithography)', 'Stencil (screenprint/serigraph, pochoir)', 'Monotype/monoprint', 'Collagraph', 'Digital print (inkjet/pigment/giclée, UV flatbed)', 'Risograph'],
    'Sculpture': ['Stone (carving)', 'Wood (carving, turning)', 'Metal (lost-wax bronze, sand casting, forging, fabrication/welding)', 'Clay/Terracotta (modeling, casting)', 'Plaster (modeling, molds)', 'Resin & plastics (casting, vacuum forming, 3D printing)', 'Found-object/assemblage', 'Kinetic', 'Soft sculpture'],
    'Ceramics & Glass': ['Ceramics (earthenware, stoneware, porcelain, raku, terra sigillata; wheel-thrown, handbuilt/coil/slab, slip-cast; sgraffito, inlay/mishima; glaze/underglaze)', 'Glass (blown, cast, kiln-formed/fused, stained, lampworking)'],
    'Textile / Fiber': ['Weaving (tapestry)', 'Knitting', 'Crochet', 'Embroidery (including culturally specific forms like tatreez)', 'Quilting (patchwork, appliqué)', 'Felting (wet/needle/nuno)', 'Macramé', 'Resist dyeing (batik, shibori, tie-dye, ikat)'],
    'Photography': ['Analog: daguerreotype, ambrotype, tintype/ferrotype, salt print, albumen print, gelatin silver, platinum/palladium, cyanotype, gum bichromate, carbon print', 'Color: chromogenic (C-print/RA-4), dye transfer, Cibachrome/Ilfochrome, autochrome', 'Digital: pigment inkjet, LightJet/laser exposure, dye-sublimation', 'Cameraless: photogram, chemigram, lumen'],
    'Time-based Media (Film/Video/Animation/Sound)': ['Film (8mm/Super 8, 16mm, 35mm, hand-processed)', 'Video (single-channel, multichannel installation, projection mapping)', 'Animation (stop-motion, hand-drawn, CGI)', 'Sound (field recording, electroacoustic, sound installation, generative audio)'],
    'Digital / Computational / New Media': ['Digital painting (raster/vector)', '3D modeling (polygon/NURBS/sculpting)', 'Generative/code art (algorithmic, Processing/p5.js)', 'Interactive/realtime (game art, sensor-based install, projection mapping)', 'XR (VR/AR/MR)', 'AI-assisted (text-to-image, image-to-image, style transfer)', 'Net art (website/networked performance)'],
    'Book & Text Arts': ['Artist’s books, zines, altered books', 'Letterpress (and historical linotype/monotype)', 'Calligraphy/illumination (Western/Arabic/brush lettering)'],
    'Street / Public / Environmental': ['Street art (graffiti, stencil, wheatpaste, sticker art, murals)', 'Public art (monumental sculpture, light/environmental)', 'Land art/earthworks (site interventions, stone arrangements, earth mounds, ice/snow)'],
    'Mixed / Hybrid & Non-traditional / Experimental': ['Collage (paper/photo/digital)', 'Assemblage (found materials, shadow boxes)', 'Material painting (sand/soil/cement with binder)', 'Light-based (neon, LED, projection, holography)', 'Bio-art (living cultures, DNA, mycelium)', 'Ephemeral (ice, sand, chalk, smoke, soap bubbles, food)'],
};

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
    const [originalTitle, setOriginalTitle] = useState('');
    
    const queryKey = ['artwork-form', artworkId];
    const { data: originalArtwork, isLoading } = useQuery({ queryKey, queryFn: () => fetchArtwork(artworkId) });

    useEffect(() => {
        if (originalArtwork) {
            setArtwork(originalArtwork);
            setOriginalTitle(originalArtwork.title || '');
        }
    }, [originalArtwork]);

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
            
            let finalSlug = formData.slug;
            if (formData.title !== originalTitle) {
                const { data: slugData } = await supabase.rpc('generate_unique_slug', { input_text: formData.title, table_name: 'artworks' });
                finalSlug = slugData;
            }

            const { artist, ...dataToUpdate } = formData;
            const payload = { ...dataToUpdate, slug: finalSlug };

            const { error } = await supabase.from('artworks').update(payload).eq('id', artworkId);
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
        if (parent && Object.keys(mediaTaxonomy).includes(parent)) {
            return { parentMedium: parent, childMedium: child || '' };
        }
        return { parentMedium: '', childMedium: mediumStr };
    }, [artwork.medium]);

    const handleMediumChange = (newParent?: string, newChild?: string) => {
        const currentParent = newParent !== undefined ? newParent : parentMedium;
        const currentChild = newChild !== undefined ? newChild : childMedium;
        let combinedMedium = '';
        if (currentParent) {
            combinedMedium = newChild !== undefined ? (currentChild ? `${currentParent}: ${currentChild}` : currentParent) : currentParent;
        } else {
            combinedMedium = currentChild;
        }
        setArtwork(prev => ({ ...prev, medium: combinedMedium }));
    };

    const handleJsonChange = (parent: keyof Artwork, field: string, value: any) => {
        const oldParentState = artwork[parent] as object || {};
        if (parent === 'edition_info' && field === 'is_edition' && value === false) {
            setArtwork(prev => ({ ...prev, edition_info: { ...(prev.edition_info || {}), is_edition: false, numeric_size: undefined, ap_size: undefined } }));
        } else {
            setArtwork(prev => ({ ...prev, [parent]: { ...oldParentState, [field]: value } }));
        }
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

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork details...</div>;

    return (
        <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <fieldset>
                <legend>Primary Information</legend>
                <label>Title</label>
                <input name="title" className="input" type="text" value={artwork.title || ''} onChange={handleFormChange} required />
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem'}}>
                    <div>
                        <label>Primary Medium</label>
                        <select className="input" value={parentMedium} onChange={e => handleMediumChange(e.target.value, '')} required>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                    <label className="toggle-switch">
                        <input type="checkbox" checked={!!artwork.edition_info?.is_edition} onChange={e => handleJsonChange('edition_info', 'is_edition', e.target.checked)} />
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
                            <input type="number" value={artwork.edition_info?.numeric_size || ''} onChange={e => handleJsonChange('edition_info', 'numeric_size', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="input" placeholder="e.g., 50" required />
                        </div>
                        <div>
                            <label>Total Artist's Proofs (APs)</label>
                            <input type="number" value={artwork.edition_info?.ap_size || ''} onChange={e => handleJsonChange('edition_info', 'ap_size', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="input" placeholder="e.g., 5" />
                        </div>
                    </div>
                )}
            </fieldset>

            {artwork.edition_info?.is_edition && originalArtwork?.status !== 'Pending' && (
                <fieldset><legend>Sales & Inventory Management</legend><p>Check the box next to an edition to mark it as sold.</p><div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--card)'}}>{allEditions.map(id => (<label key={id} style={{display: 'flex', gap: '0.5rem', cursor: 'pointer'}}><input type="checkbox" checked={originalArtwork?.edition_info?.sold_editions?.includes(id)} onChange={(e) => handleEditionSaleChange(id, e.target.checked)} disabled={saleMutation.isPending}/> {id}</label>))}</div></fieldset>
            )}

            <fieldset><legend>Provenance</legend><textarea name="provenance" className="input" placeholder="History of ownership, exhibitions, etc." value={artwork.provenance || ''} onChange={handleFormChange} /></fieldset>
            
            <fieldset><legend>Pricing</legend><label>Price ($)</label><input name="price" className="input" type="number" step="0.01" value={artwork.price || ''} onChange={handleFormChange} /><label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><input name="is_price_negotiable" type="checkbox" checked={!!artwork.is_price_negotiable} onChange={handleFormChange} /> Price is negotiable </label></fieldset>
        </form>
    );
};

export default ArtworkEditorForm;