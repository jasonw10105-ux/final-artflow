// src/pages/dashboard/artist/ArtworkEditorPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';

// --- TYPE DEFINITIONS (NOW MATCHES YOUR SCHEMA) ---
type EditionInfo = {
    is_edition?: boolean;
    numeric_size?: number;
    ap_size?: number;
    sold_editions?: string[];
};
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
    edition_info: EditionInfo | null;
    is_price_negotiable?: boolean;
    slug?: string;
};

// --- Media Taxonomy ---
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
    const { data, error } = await supabase.from('artworks').select('*').eq('id', artworkId).single();
    if (error) throw new Error("Artwork not found");
    return data as any;
};

const updateSaleStatus = async ({ artworkId, identifier, isSold }: { artworkId: string, identifier: string, isSold: boolean }) => {
    const { error } = await supabase.rpc('update_artwork_edition_sale', { p_artwork_id: artworkId, p_edition_identifier: identifier, p_is_sold: isSold });
    if (error) throw error;
};

// --- COMPONENT ---
const ArtworkEditorPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { artworkId } = useParams<{ artworkId: string }>();

    if (!artworkId) { navigate('/artist/artworks'); return null; }

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [artwork, setArtwork] = useState<Partial<Omit<Artwork, 'id'>>>({});
    const [originalTitle, setOriginalTitle] = useState('');

    const queryKey = ['artwork', artworkId];
    const { data: fetchedArtwork, isLoading } = useQuery({ queryKey, queryFn: () => fetchArtwork(artworkId) });

    useEffect(() => {
        if (fetchedArtwork) {
            setArtwork(fetchedArtwork);
            setOriginalTitle(fetchedArtwork.title || '');
        }
    }, [fetchedArtwork]);

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
            if (!user) throw new Error("You must be logged in.");
            if (!formData.title) throw new Error("Title is required.");
            if (!formData.medium) throw new Error("Primary Medium is required.");
            
            // --- NEW: Validation for conditional requirements ---
            if (formData.framing_info?.is_framed && !formData.framing_info.details) {
                throw new Error("Frame Details are required when 'Framed' is selected.");
            }
            if (formData.signature_info?.is_signed && !formData.signature_info.location) {
                throw new Error("Signature Location & Details are required when 'Signed' is selected.");
            }

            let finalSlug = null;
            if (formData.title !== originalTitle) {
                const { data: slugData } = await supabase.rpc('generate_unique_slug', { input_text: formData.title, table_name: 'artworks' });
                finalSlug = slugData;
            }
            const { status, ...dataToUpdate } = formData;
            const payload: Partial<Artwork> = { ...dataToUpdate, price: dataToUpdate.price ? parseFloat(String(dataToUpdate.price)) : null, ...(finalSlug && { slug: finalSlug }) };
            if (!payload.edition_info?.is_edition && fetchedArtwork?.status !== 'Sold') {
                payload.status = 'Active';
            }
            const { error } = await supabase.from('artworks').update(payload).eq('id', artworkId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            alert('Artwork saved successfully!');
            navigate('/artist/artworks');
        },
        onError: (error: any) => alert(`Error: ${error.message}`),
        onSettled: () => setIsSubmitting(false),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('artworks').delete().eq('id', artworkId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            alert('Artwork deleted successfully.');
            navigate('/artist/artworks');
        },
        onError: (error: any) => alert(`Error deleting artwork: ${error.message}`),
    });
    
    const handleDelete = () => {
        if (window.confirm('Are you sure you want to permanently delete this artwork? This action cannot be undone.')) {
            deleteMutation.mutate();
        }
    };
    
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
            combinedMedium = currentChild ? `${currentParent}: ${currentChild}` : currentParent;
        } else {
            combinedMedium = currentChild;
        }
        setArtwork(prev => ({ ...prev, medium: combinedMedium }));
    };

    // --- UPDATED: Smarter handler for JSON objects and toggles ---
    const handleJsonChange = (parent: keyof Artwork, field: string, value: any) => {
        const oldParentState = artwork[parent] as object || {};

        // If a toggle is being turned OFF, clear its corresponding detail field
        if ((field === 'is_signed' && value === false)) {
            setArtwork(prev => ({ ...prev, [parent]: { ...oldParentState, is_signed: false, location: '' } }));
        } else if (field === 'is_framed' && value === false) {
             setArtwork(prev => ({ ...prev, [parent]: { ...oldParentState, is_framed: false, details: '' } }));
        }
        else {
             setArtwork(prev => ({ ...prev, [parent]: { ...oldParentState, [field]: value } }));
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
        setArtwork(prev => ({ ...prev, [name]: checked !== undefined ? checked : value }));
    };

    const allEditions = useMemo(() => { if (!artwork.edition_info?.is_edition) return []; const editions = []; const numericSize = artwork.edition_info?.numeric_size || 0; const apSize = artwork.edition_info?.ap_size || 0; for (let i = 1; i <= numericSize; i++) editions.push(`${i}/${numericSize}`); for (let i = 1; i <= apSize; i++) editions.push(`AP ${i}/${apSize}`); return editions; }, [artwork.edition_info]);
    const handleEditionSaleChange = (identifier: string, isChecked: boolean) => { saleMutation.mutate({ artworkId, identifier, isSold: isChecked }); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setIsSubmitting(true); updateMutation.mutate(artwork); };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork editor...</div>;

    return (
        <div style={{ padding: '2rem' }}>
            <Link to="/artist/artworks" className="button-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Back to Artworks
            </Link>
            
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '3rem', alignItems: 'start' }}>
                <aside style={{ position: 'sticky', top: '2rem' }}>
                    {fetchedArtwork?.image_url && <img src={fetchedArtwork.image_url} alt={artwork.title || "Artwork"} style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 'var(--radius)' }} />}
                </aside>
                
                <main>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <fieldset>
                            <legend>Primary Information</legend>
                            <label>Title</label>
                            <input name="title" className="input" type="text" value={artwork.title || ''} onChange={handleFormChange} required />
                            
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem'}}>
                                <div>
                                    <label>Primary Medium</label>
                                    <select 
                                        className="input" 
                                        value={parentMedium} 
                                        onChange={e => handleMediumChange(e.target.value, undefined)} 
                                        required
                                    >
                                        <option value="" disabled>Select a category...</option>
                                        {Object.keys(mediaTaxonomy).map(parent => <option key={parent} value={parent}>{parent}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label>Secondary Medium (Optional)</label>
                                    <input 
                                        name="medium_child" 
                                        className="input" 
                                        type="text" 
                                        value={childMedium} 
                                        onChange={e => handleMediumChange(undefined, e.target.value)}
                                        list="media-suggestions"
                                        placeholder="e.g., Oil, Impasto"
                                        disabled={!parentMedium}
                                    />
                                    {parentMedium && mediaTaxonomy[parentMedium] && (
                                        <datalist id="media-suggestions">
                                            {mediaTaxonomy[parentMedium].map(suggestion => <option key={suggestion} value={suggestion} />)}
                                        </datalist>
                                    )}
                                </div>
                            </div>

                            <label style={{marginTop: '1rem'}}>Description</label>
                            <textarea name="description" className="input" value={artwork.description || ''} onChange={handleFormChange} />
                        </fieldset>

                        <fieldset>
                            <legend>Artwork Details</legend>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem'}}>
                                <div>
                                    <label>Height</label>
                                    <input type="text" value={artwork.dimensions?.height || ''} onChange={e => handleJsonChange('dimensions', 'height', e.target.value)} className="input" placeholder="e.g., 24 or Varied" required />
                                </div>
                                <div>
                                    <label>Width</label>
                                    <input type="text" value={artwork.dimensions?.width || ''} onChange={e => handleJsonChange('dimensions', 'width', e.target.value)} className="input" placeholder="e.g., 18 or Varied" required />
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
                            {/* --- UPDATED: Logic now binds to framing_info and signature_info JSONB objects --- */}
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem'}}>
                                <div>
                                    <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                                        <input 
                                            type="checkbox" 
                                            checked={!!artwork.framing_info?.is_framed} 
                                            onChange={e => handleJsonChange('framing_info', 'is_framed', e.target.checked)} 
                                        /> Framed
                                    </label>
                                    {artwork.framing_info?.is_framed && (
                                        <div>
                                            <label>Frame Details</label>
                                            <textarea
                                                className="input"
                                                placeholder="e.g., Black gallery frame, UV-plexiglass"
                                                value={artwork.framing_info?.details || ''}
                                                onChange={e => handleJsonChange('framing_info', 'details', e.target.value)}
                                                required={!!artwork.framing_info?.is_framed}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                                        <input
                                            type="checkbox"
                                            checked={!!artwork.signature_info?.is_signed}
                                            onChange={e => handleJsonChange('signature_info', 'is_signed', e.target.checked)}
                                        /> Signed
                                    </label>
                                    {artwork.signature_info?.is_signed && (
                                        <div>
                                            <label>Signature Location & Details</label>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="e.g., Verso, bottom right"
                                                value={artwork.signature_info?.location || ''}
                                                onChange={e => handleJsonChange('signature_info', 'location', e.target.value)}
                                                required={!!artwork.signature_info?.is_signed}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>Edition Information</legend>
                            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><input type="checkbox" checked={!!artwork.edition_info?.is_edition} onChange={e => handleJsonChange('edition_info', 'is_edition', e.target.checked)} />This work is part of an edition</label>
                            {artwork.edition_info?.is_edition && (
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem'}}>
                                    <div><label>Numeric Edition Size</label><input type="number" value={artwork.edition_info?.numeric_size || ''} onChange={e => handleJsonChange('edition_info', 'numeric_size', parseInt(e.target.value, 10))} className="input" placeholder="e.g., 50"/></div>
                                    <div><label>Total Artist's Proofs (APs)</label><input type="number" value={artwork.edition_info?.ap_size || ''} onChange={e => handleJsonChange('edition_info', 'ap_size', parseInt(e.target.value, 10))} className="input" placeholder="e.g., 5"/></div>
                                </div>
                            )}
                        </fieldset>
                        {artwork.edition_info?.is_edition && fetchedArtwork?.status !== 'Pending' && (<fieldset><legend>Sales & Inventory Management</legend><p>Check the box next to an edition to mark it as sold. The artwork's main status will update automatically.</p><div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)' }}>{allEditions.map(identifier => (<label key={identifier} style={{display: 'flex', gap: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius)', background: 'var(--card)', cursor: 'pointer'}}><input type="checkbox" checked={fetchedArtwork?.edition_info?.sold_editions?.includes(identifier)} onChange={(e) => handleEditionSaleChange(identifier, e.target.checked)} disabled={saleMutation.isPending}/>{identifier}</label>))}</div></fieldset>)}
                        <fieldset><legend>Provenance</legend><textarea name="provenance" className="input" placeholder="History of ownership, exhibitions, etc." value={artwork.provenance || ''} onChange={handleFormChange} /></fieldset>
                        <fieldset><legend>Pricing</legend><label>Price ($)</label><input name="price" className="input" type="number" step="0.01" value={artwork.price || ''} onChange={handleFormChange} required /><label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><input name="is_price_negotiable" type="checkbox" checked={!!artwork.is_price_negotiable} onChange={handleFormChange} /> Price is negotiable </label></fieldset>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                            <button type="button" onClick={handleDelete} className="button button-danger" disabled={deleteMutation.isPending}>
                                {deleteMutation.isPending ? 'Deleting...' : <><Trash2 size={14} /> Delete Artwork</>}
                            </button>
                            <button type="submit" className="button button-primary" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
};
export default ArtworkEditorPage;