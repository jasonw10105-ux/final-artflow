import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- MUI Imports for Searchable Dropdowns ---
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

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
    artist: { full_name: string | null } | null;
};

// --- PROPS INTERFACE ---
interface ArtworkEditorFormProps {
  artworkId: string;
  formId: string;
  onSaveSuccess: () => void;
  onTitleChange?: (newTitle: string) => void;
}

// --- MEDIA TAXONOMY (ensure this is complete) ---
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

// --- API FUNCTIONS --- (No changes needed here)
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
    
    // (All other hooks like useMutation, etc. are unchanged)
    const haveDimensionsChanged = (oldDim: any, newDim: any): boolean => { /* ... */ };
    const saleMutation = useMutation({ /* ... */ });
    const updateMutation = useMutation({ /* ... */ });
    
    // --- MEDIUM SELECTION LOGIC (UPDATED) ---
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
            newChild = ''; // Reset child when parent changes
        } else {
            newChild = newValue || '';
        }

        let combinedMedium = '';
        if (newParent) {
            combinedMedium = newChild ? `${newParent}: ${newChild}` : newParent;
        }
        setArtwork(prev => ({ ...prev, medium: combinedMedium }));
    };

    // Prepare options for the Autocomplete components
    const primaryMediumOptions = Object.keys(mediaTaxonomy).map(key => ({ label: key }));
    const secondaryMediumOptions = useMemo(() => {
        return parentMedium && mediaTaxonomy[parentMedium]
            ? mediaTaxonomy[parentMedium].map(key => ({ label: key }))
            : [];
    }, [parentMedium]);
    
    // --- (All other handlers like handleJsonChange, handleFormChange, etc. are unchanged) ---
    const handleJsonChange = (parent: keyof Artwork, field: string, value: any) => { /* ... */ };
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { /* ... */ };
    const allEditions = useMemo(() => { /* ... */ }, [artwork.edition_info]);
    const handleEditionSaleChange = (identifier: string, isChecked: boolean) => { /* ... */ };
    const handleSubmit = (e: React.FormEvent) => { /* ... */ };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork details...</div>;

    return (
        <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <fieldset>
                <legend>Primary Information</legend>
                <label className="label">Title</label>
                <input name="title" className="input" type="text" value={artwork.title || ''} onChange={handleFormChange} required />
                
                {/* --- REVISED: Searchable Medium Dropdowns --- */}
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem'}}>
                    <div>
                        <label className="label">Primary Medium</label>
                        <Autocomplete
                            options={primaryMediumOptions}
                            value={parentMedium ? { label: parentMedium } : null}
                            onChange={(event, newValue) => handleMediumChange('parent', newValue?.label ?? null)}
                            isOptionEqualToValue={(option, value) => option.label === value.label}
                            renderInput={(params) => <TextField {...params} placeholder="Search categories..." required={!parentMedium} />}
                        />
                    </div>
                    <div>
                        <label className="label">Secondary Medium (Optional)</label>
                        <Autocomplete
                            options={secondaryMediumOptions}
                            value={childMedium ? { label: childMedium } : null}
                            onChange={(event, newValue) => handleMediumChange('child', newValue?.label ?? null)}
                            isOptionEqualToValue={(option, value) => option.label === value.label}
                            disabled={!parentMedium}
                            renderInput={(params) => <TextField {...params} placeholder={parentMedium ? "Search details..." : "Select a primary medium first"} />}
                        />
                    </div>
                </div>

                <label className="label" style={{marginTop: '1rem'}}>Description</label>
                <textarea name="description" className="textarea" value={artwork.description || ''} onChange={handleFormChange} />
            </fieldset>

            {/* --- (Artwork Details Fieldset is unchanged) --- */}
            <fieldset>
                {/* ... */}
            </fieldset>

            {/* --- REVISED: Edition Information Fieldset with Dropdown --- */}
            <fieldset>
                <legend>Edition Information</legend>
                <label className="label">Is this a unique work or part of an edition?</label>
                <select
                    className="select"
                    value={artwork.edition_info?.is_edition ? 'edition' : 'unique'}
                    onChange={(e) => handleJsonChange('edition_info', 'is_edition', e.target.value === 'edition')}
                >
                    <option value="unique">Unique Work</option>
                    <option value="edition">A Set of Editions</option>
                </select>

                {artwork.edition_info?.is_edition && (
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        <div>
                            <label className="label">Numeric Edition Size</label>
                            <input
                                type="number"
                                value={artwork.edition_info?.numeric_size || ''}
                                onChange={e => handleJsonChange('edition_info', 'numeric_size', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                className="input"
                                placeholder="e.g., 50"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Total Artist's Proofs (APs)</label>
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

            {/* --- Sales & Inventory Management Section (RESTORED) --- */}
            {artwork.edition_info?.is_edition && originalArtwork?.status !== 'Pending' && (
                <fieldset>
                    <legend>Sales & Inventory Management</legend>
                    <p>Check the box next to an edition to mark it as sold. The artwork's main status will update automatically.</p>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                        {allEditions.map(identifier => (
                            <label key={identifier} style={{display: 'flex', gap: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--card)', cursor: 'pointer'}}>
                                <input type="checkbox" checked={originalArtwork?.edition_info?.sold_editions?.includes(identifier)} onChange={(e) => handleEditionSaleChange(identifier, e.target.checked)} disabled={saleMutation.isPending}/>
                                {identifier}
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}

            {/* --- (Provenance and Pricing fieldsets are unchanged) --- */}
            <fieldset>
                {/* ... */}
            </fieldset>
        </form>
    );
};

export default ArtworkEditorForm;