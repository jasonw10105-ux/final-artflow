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
    'Drawing': ['Graphite (pencil, powder, mechanical)', 'Charcoal (vine, compressed)', 'Chalk (red/white/black, sanguine)', 'Conté (sticks, pencils)', 'Pastel (soft, hard, oil, pan)', 'Ink (India, sumi, iron-gall; brush/pen; wash)', 'Markers (alcohol/water/paint)', 'Silverpoint/metalpoint', 'Colored pencil (wax/oil/water-soluble)'],
    'Painting': ['Oil (alla prima, glazing, impasto, grisaille)', 'Acrylic (impasto, pouring, airbrush, glazing)', 'Watercolor (transparent, wet-on-wet, drybrush)', 'Gouache (opaque watercolor)', 'Tempera (egg tempera, casein)', 'Encaustic (hot wax)', 'Fresco (buon fresco, fresco secco)', 'Ink painting (sumi-e)', 'Spray/Aerosol (stencil, freehand)', 'Vitreous enamel'],
    'Printmaking': ['Relief (woodcut, linocut, wood engraving)', 'Intaglio (engraving, etching, drypoint, aquint, mezzotint, photogravure)', 'Planographic (lithography)', 'Stencil (screenprint/serigraph, pochoir)', 'Monotype/monoprint', 'Collagraph', 'Digital print (inkjet/pigment/giclée, UV flatbed)', 'Risograph'],
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
    try {
        const { error } = await supabase.functions.invoke('generate-images', {
            body: { artworkId, forceWatermarkUpdate: !!flags.forceWatermark, forceVisualizationUpdate: !!flags.forceVisualization },
        });
        if (error) throw error;
    } catch (err) {
        console.error("Background image generation failed:", (err as Error).message);
    }
};

// --- HELPER HOOKS ---
const useFormHandlers = (
    artwork: Partial<Artwork>, 
    setArtwork: React.Dispatch<React.SetStateAction<Partial<Artwork>>>, 
    onTitleChange?: (newTitle: string) => void
) => {
    const handleJsonChange = (parent: keyof Omit<Artwork, 'artist' | 'id' | 'user_id' | 'created_at' | 'updated_at' | 'slug'>, field: string, value: any) => {
        const oldParentState = artwork[parent] as object || {};
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
        const newArtworkState = { ...artwork, [name]: checked !== undefined ? checked : value };
        setArtwork(newArtworkState);
        if (name === 'title' && onTitleChange) onTitleChange(value);
    };
    
    return { handleFormChange, handleJsonChange };
};

const useMediumSelection = (artwork: Partial<Artwork>, setArtwork: React.Dispatch<React.SetStateAction<Partial<Artwork>>>) => {
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
        if (type === 'parent') {
            newParent = newValue || '';
            newChild = '';
        } else {
            newChild = newValue || '';
        }
        let combinedMedium = newParent ? (newChild ? `${newParent}: ${newChild}` : newParent) : '';
        setArtwork(prev => ({ ...prev, medium: combinedMedium }));
    };

    const primaryMediumOptions = Object.keys(mediaTaxonomy);
    const secondaryMediumOptions = useMemo(() => {
        return parentMedium && mediaTaxonomy[parentMedium] ? mediaTaxonomy[parentMedium] : [];
    }, [parentMedium]);

    return { parentMedium, childMedium, handleMediumChange, primaryMediumOptions, secondaryMediumOptions };
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
            if (assignedCatalogues.length === 0 && systemCatalogue && artworkData.status === 'Active') {
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
    
    const { parentMedium, childMedium, handleMediumChange, primaryMediumOptions, secondaryMediumOptions } = useMediumSelection(artwork, setArtwork);
    const { handleFormChange, handleJsonChange } = useFormHandlers(artwork, setArtwork, onTitleChange);
    
    const allEditions = useMemo(() => {
        if (!(artwork.edition_info as any)?.is_edition) return [];
        const editions = [];
        const numericSize = (artwork.edition_info as any)?.numeric_size || 0;
        const apSize = (artwork.edition_info as any)?.ap_size || 0;
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
        if (data?.artworkData?.status === 'Pending') payload.status = 'Active';
        
        const newCatalogueIds = selectedCatalogues.map(cat => cat.id);
        updateMutation.mutate({ formData: payload, newCatalogueIds });
    };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork details...</div>;

    const userSelectableCatalogues = allCatalogues.filter(cat => !cat.is_system_catalogue);

    return (
        <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <fieldset className="fieldset">
                <legend className="legend">Primary Information</legend>
                <label className="label">Title</label>
                <input name="title" className="input" type="text" value={artwork.title || ''} onChange={handleFormChange} required />
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem'}}>
                    <div>
                        <label className="label">Primary Medium</label>
                        <Autocomplete options={primaryMediumOptions} value={parentMedium || null} onChange={(_, newValue) => handleMediumChange('parent', newValue)} isOptionEqualToValue={(option, value) => option === value} renderInput={(params) => <TextField {...params} placeholder="Search categories..." required={!parentMedium} />}/>
                    </div>
                    <div>
                        <label className="label">Secondary Medium (Optional)</label>
                        <Autocomplete freeSolo options={secondaryMediumOptions} value={childMedium || null} onInputChange={(_, newInputValue) => handleMediumChange('child', newInputValue)} disabled={!parentMedium} renderInput={(params) => <TextField {...params} placeholder={parentMedium ? "Search or type..." : "Select a primary medium"} />}/>
                    </div>
                </div>
                <label className="label" style={{marginTop: '1rem'}}>Description</label>
                <textarea name="description" className="textarea" value={artwork.description || ''} onChange={handleFormChange} />
            </fieldset>

            <fieldset className="fieldset">
                <legend className="legend">Artwork Details</legend>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem'}}>
                    <div><label className="label">Height</label><input type="text" value={(artwork.dimensions as any)?.height || ''} onChange={e => handleJsonChange('dimensions', 'height', e.target.value)} className="input" placeholder="e.g., 24" required /></div>
                    <div><label className="label">Width</label><input type="text" value={(artwork.dimensions as any)?.width || ''} onChange={e => handleJsonChange('dimensions', 'width', e.target.value)} className="input" placeholder="e.g., 18" required /></div>
                    <div><label className="label">Depth (Optional)</label><input type="text" value={(artwork.dimensions as any)?.depth || ''} onChange={e => handleJsonChange('dimensions', 'depth', e.target.value)} className="input" /></div>
                    <div><label className="label">Unit</label><input type="text" value={(artwork.dimensions as any)?.unit || ''} onChange={e => handleJsonChange('dimensions', 'unit', e.target.value)} className="input" placeholder="e.g., in, cm" /></div>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem'}}>
                    <div>
                        <label className="label" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}><input type="checkbox" checked={!!(artwork.framing_info as any)?.is_framed} onChange={e => handleJsonChange('framing_info', 'is_framed', e.target.checked)} /> Framed</label>
                        {(artwork.framing_info as any)?.is_framed && (<div><label className="label">Frame Details</label><textarea className="textarea" placeholder="e.g., Black gallery frame" value={(artwork.framing_info as any)?.details || ''} onChange={e => handleJsonChange('framing_info', 'details', e.target.value)} required /></div>)}
                    </div>
                    <div>
                        <label className="label" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}><input type="checkbox" checked={!!(artwork.signature_info as any)?.is_signed} onChange={e => handleJsonChange('signature_info', 'is_signed', e.target.checked)} /> Signed</label>
                        {(artwork.signature_info as any)?.is_signed && (<div><label className="label">Signature Location & Details</label><input type="text" className="input" placeholder="e.g., Verso, bottom right" value={(artwork.signature_info as any)?.location || ''} onChange={e => handleJsonChange('signature_info', 'location', e.target.value)} required /></div>)}
                    </div>
                </div>
            </fieldset>

            <fieldset className="fieldset">
                <legend className="legend">Catalogue Assignment</legend>
                <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
                    This artwork will automatically be in "Available Work" when active. You can also add it to your custom catalogues.
                </p>
                <Autocomplete
                    multiple
                    options={userSelectableCatalogues}
                    getOptionLabel={(option) => option.title}
                    value={selectedCatalogues.filter(cat => !cat.is_system_catalogue)}
                    onChange={(_, newValue) => {
                        const systemCatalogue = allCatalogues.find(cat => cat.is_system_catalogue);
                        const finalSelection = systemCatalogue ? [systemCatalogue, ...newValue] : newValue;
                        if (artwork.status !== 'Active' && systemCatalogue) {
                            setSelectedCatalogues(newValue);
                        } else {
                            setSelectedCatalogues(finalSelection);
                        }
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (<TextField {...params} placeholder="Select catalogues..." />)}
                    renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option.title} {...getTagProps({ index })} />))}
                />
            </fieldset>

            <fieldset className="fieldset">
                <legend className="legend">Edition Information</legend>
                <label className="label">Is this a unique work or part of an edition?</label>
                <select
                    className="select"
                    value={(artwork.edition_info as any)?.is_edition ? 'edition' : 'unique'}
                    onChange={(e) => handleJsonChange('edition_info', 'is_edition', e.target.value === 'edition')}
                >
                    <option value="unique">Unique Work</option>
                    <option value="edition">A Set of Editions</option>
                </select>
                {(artwork.edition_info as any)?.is_edition && (
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        <div><label className="label">Numeric Edition Size</label><input type="number" value={(artwork.edition_info as any)?.numeric_size || ''} onChange={e => handleJsonChange('edition_info', 'numeric_size', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="input" placeholder="e.g., 50" required /></div>
                        <div><label className="label">Total Artist's Proofs (APs)</label><input type="number" value={(artwork.edition_info as any)?.ap_size || ''} onChange={e => handleJsonChange('edition_info', 'ap_size', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="input" placeholder="e.g., 5" /></div>
                    </div>
                )}
            </fieldset>

            {(artwork.edition_info as any)?.is_edition && data?.artworkData?.status !== 'Pending' && (
                <fieldset className="fieldset">
                    <legend className="legend">Sales & Inventory Management</legend>
                    <p>Check the box next to an edition to mark it as sold.</p>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                        {allEditions.length > 0 ? allEditions.map(identifier => (
                            <label key={identifier} style={{display: 'flex', gap: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--card)', cursor: 'pointer'}}>
                                <input type="checkbox" checked={!!(data?.artworkData?.edition_info as any)?.sold_editions?.includes(identifier)} onChange={(e) => handleEditionSaleChange(identifier, e.target.checked)} disabled={saleMutation.isPending}/>
                                {identifier}
                            </label>
                        )) : <p>No editions defined for this artwork.</p>}
                    </div>
                </fieldset>
            )}

            <fieldset className="fieldset">
                <legend className="legend">Provenance</legend>
                <textarea name="provenance" className="textarea" placeholder="History of ownership, exhibitions, etc." value={artwork.provenance || ''} onChange={handleFormChange} />
            </fieldset>
            
            <fieldset className="fieldset">
                <legend className="legend">Pricing</legend>
                <label className="label">Price ($)</label>
                <input name="price" className="input" type="number" step="0.01" value={artwork.price || ''} onChange={handleFormChange} />
                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem'}}>
                    <input name="is_price_negotiable" type="checkbox" checked={!!artwork.is_price_negotiable} onChange={handleFormChange} /> Price is negotiable
                </label>
            </fieldset>
        </form>
    );
};