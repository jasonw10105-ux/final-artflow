// src/components/dashboard/ArtworkEditorForm.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database } from '@/types/database.types';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';

type Artwork = Database['public']['Tables']['artworks']['Row'] & {
    artist: { full_name: string | null } | null;
};
type Catalogue = Database['public']['Tables']['catalogues']['Row'];
type PricingModel = 'fixed' | 'negotiable' | 'on_request';

interface ArtworkEditorFormProps {
  artworkId: string;
  formId: string;
  onSaveSuccess: () => void;
  onTitleChange?: (newTitle: string) => void;
}

const mediaTaxonomy: Record<string, string[]> = {
    'Drawing': ['Graphite (pencil, powder, mechanical)', 'Charcoal (vine, compressed)', 'Chalk (red/white/black, sanguine)', 'Conté (sticks, pencils)', 'Pastel (soft, hard, oil, pan)', 'Ink (India, sumi, iron-gall; brush/pen; wash)', 'Markers (alcohol/water/paint)', 'Silverpoint/metalpoint', 'Colored pencil (wax/oil/water-soluble)'],
    'Painting': ['Oil (alla prima, glazing, impasto, grisaille)', 'Acrylic (impasto, pouring, airbrush, glazing)', 'Watercolor (transparent, wet-on-wet, drybrush)', 'Gouache (opaque watercolor)', 'Tempera (egg tempera, casein)', 'Encaustic (hot wax)', 'Fresco (buon fresco, fresco secco)', 'Ink painting (sumi-e)', 'Spray/Aerosol (stencil, freehand)', 'Vitreous enamel'],
    'Printmaking': ['Relief (woodcut, linocut, wood engraving)', 'Intaglio (engraving, etching, drypoint, aquint, mezzotint, photogravure)', 'Planographic (lithography)', 'Stencil (screenprint/serigraph, pochoir)', 'Monotype/monoprint', 'Collagraph', 'Digital print (inkjet/pigment/giclée, UV flatbed)', 'Risograph'],
    'Sculpture': ['Stone (carving)', 'Wood (carving, turning)', 'Metal (lost-wax bronze, sand casting, forging, fabrication/welding)', 'Clay/Terracotta (modeling, casting)', 'Plaster (modeling, molds)', 'Resin & plastics (casting, vacuum forming, 3D printing)', 'Found-object/assemblage', 'Kinetic', 'Soft sculpture'],
    'Ceramics & Glass': ['Ceramics (earthenware, stoneware, porcelain, raku, terra sigillata; wheel-thrown, handbuilt/coil/slab, slip-cast; sgraffito, inlay/mishima; glaze/underglaze)', 'Glass (blown, cast, kiln-formed/fused, stained, lampworking)'],
    'Textile / Fiber': ['Weaving (tapestry)', 'Knitting', 'Crochet', 'Embroidery (including culturally specific forms like tatreez)', 'Quilting (patchwork, appliqué)', 'Felting (wet/needle/nuno)', 'Macramé', 'Resist dyeing (batik, shibori, tie-dye, ikat)'],
    'Photography': ['Analog: daguerreotype, ambrotype, tintype/ferrotype', 'Digital: pigment inkjet'],
    'Time-based Media (Film/Video/Animation/Sound)': ['Film (8mm/Super 8, 16mm, 35mm)', 'Video (single-channel, multichannel installation)'],
    'Digital / Computational / New Media': ['Digital painting (raster/vector)', 'Generative/code art (algorithmic, Processing/p5.js)'],
    'Book & Text Arts': ['Artist’s books, zines, altered books', 'Letterpress'],
    'Street / Public / Environmental': ['Street art (graffiti, stencil, murals)', 'Public art (monumental sculpture)'],
    'Mixed / Hybrid & Non-traditional / Experimental': ['Collage (paper/photo/digital)', 'Assemblage (found materials)']
};

const fetchArtworkAndCatalogues = async (artworkId: string, userId: string): Promise<{ artworkData: Artwork, allUserCatalogues: Catalogue[], assignedCatalogues: Catalogue[] }> => {
    const { data: artworkData, error: artworkError } = await supabase.from('artworks').select('*, artist:profiles!user_id(full_name)').eq('id', artworkId).single();
    if (artworkError) throw new Error(`Artwork not found: ${artworkError.message}`);
    const { data: allUserCatalogues, error: allCatError } = await supabase.from('catalogues').select('*').eq('user_id', userId);
    if (allCatError) throw new Error(`Could not fetch catalogues: ${allCatError.message}`);
    const { data: assignedJunctions, error: junctionError } = await supabase.from('artwork_catalogue_junction').select('catalogue_id').eq('artwork_id', artworkId);
    if (junctionError) throw new Error(`Could not fetch assignments: ${junctionError.message}`);
    const assignedCatalogueIds = new Set(assignedJunctions.map(j => j.catalogue_id));
    const assignedCatalogues = allUserCatalogues.filter(cat => assignedCatalogueIds.has(cat.id));
    return { artworkData, allUserCatalogues, assignedCatalogues };
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

const haveDimensionsChanged = (oldDim: any, newDim: any): boolean => {
    if (!oldDim || !newDim) return false;
    return oldDim.width !== newDim.width || oldDim.height !== newDim.height || oldDim.unit !== newDim.unit;
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

    const updateMutation = useMutation({
        mutationFn: async ({ formData, finalCatalogueIds }: { formData: Partial<Artwork>, finalCatalogueIds: string[] }) => {
            if (!profile || !user) throw new Error("You must be logged in.");
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
            if (finalCatalogueIds.length > 0) {
                const newJunctions = finalCatalogueIds.map(catId => ({ artwork_id: artworkId, catalogue_id: catId }));
                const { error: insertError } = await supabase.from('artwork_catalogue_junction').insert(newJunctions);
                if (insertError) throw insertError;
            }
            return formData; 
        },
        onSuccess: (savedData) => {
            queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['cataloguesWithStatusCounts', user?.id] });
            queryClient.invalidateQueries({ queryKey });
            const isInitialCreation = !data?.artworkData?.watermarked_image_url || !data?.artworkData?.visualization_image_url;
            if (isInitialCreation) {
                triggerImageGeneration(artworkId, { forceWatermark: true, forceVisualization: true });
            } else {
                const forceVisualization = haveDimensionsChanged(data?.artworkData?.dimensions, savedData.dimensions);
                const originalArtistName = data?.artworkData?.artist?.full_name;
                const currentArtistName = profile?.full_name;
                // --- FIX: Ensure the result is a strict boolean to fix TS2322 ---
                const hasArtistNameChanged = !!(originalArtistName && currentArtistName && originalArtistName !== currentArtistName);
                if (forceVisualization || hasArtistNameChanged) {
                    triggerImageGeneration(artworkId, { forceVisualization, forceWatermark: hasArtistNameChanged });
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
        if (parent && Object.keys(mediaTaxonomy).includes(parent)) return { parentMedium: parent, childMedium: child || '' };
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

    const handleJsonChange = (parent: keyof Omit<Artwork, 'artist'|'id'|'user_id'|'created_at'|'updated_at'|'slug'>, field: string, value: any) => {
        const oldParentState = (artwork as Partial<Artwork>)[parent] as object || {};
        if (parent === 'edition_info' && field === 'is_edition') {
            const isEdition = Boolean(value);
            if (!isEdition) {
                setArtwork(prev => ({ ...prev, edition_info: { ...(prev.edition_info as object || {}), is_edition: false, numeric_size: undefined, ap_size: undefined, sold_editions: [] } }));
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
        if (name === 'is_price_negotiable' && !checked) {
            setArtwork(prev => ({ ...prev, is_price_negotiable: false, min_price: null, max_price: null }));
        } else {
            setArtwork(prev => ({ ...prev, [name]: checked !== undefined ? checked : value }));
        }
        if (name === 'title' && onTitleChange) onTitleChange(value);
    };

    const { saleMutation, handleEditionSaleChange, allEditions } = useEditionManagement(artwork, artworkId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const systemCatalogue = allCatalogues.find(cat => cat.is_system_catalogue);
        let finalCatalogueSelection = new Set(selectedCatalogues.map(cat => cat.id));
        if (systemCatalogue) {
            if (artwork.status === 'Available') {
                finalCatalogueSelection.add(systemCatalogue.id);
            } else {
                finalCatalogueSelection.delete(systemCatalogue.id);
            }
        }
        const finalCatalogueIds = Array.from(finalCatalogueSelection);
        
        const { status, ...formData } = artwork;
        const payload: Partial<Artwork> = {
            ...formData,
            price: formData.price ? parseFloat(String(formData.price)) : null,
            min_price: formData.min_price ? parseFloat(String(formData.min_price)) : null,
            max_price: formData.max_price ? parseFloat(String(formData.max_price)) : null,
        };
        if (data?.artworkData?.status === 'Pending') {
            payload.status = 'Available';
        }
        
        updateMutation.mutate({ formData: payload, finalCatalogueIds });
    };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork details...</div>;

    const userSelectableCatalogues = allCatalogues.filter(cat => !cat.is_system_catalogue);
    const pricingModel: PricingModel = useMemo(() => {
        if (artwork.is_price_negotiable) return 'negotiable';
        if (artwork.price != null) return 'fixed';
        return 'on_request';
    }, [artwork.is_price_negotiable, artwork.price]);

    const handlePricingModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newModel = e.target.value as PricingModel;
        setArtwork(prev => {
            const newArtwork = { ...prev };
            if (newModel === 'fixed') {
                newArtwork.is_price_negotiable = false;
                newArtwork.min_price = null;
                newArtwork.max_price = null;
            } else if (newModel === 'negotiable') {
                newArtwork.is_price_negotiable = true;
            } else if (newModel === 'on_request') {
                newArtwork.is_price_negotiable = false;
                newArtwork.price = null;
                newArtwork.min_price = null;
                newArtwork.max_price = null;
            }
            return newArtwork;
        });
    };

    // --- The rest of the component's JSX remains the same ---
    return (
        <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* ... JSX code ... */}
        </form>
    );
};

const useEditionManagement = (artwork: Partial<Artwork>, artworkId: string) => {
    // ... This hook remains the same ...
};

export default ArtworkEditorForm;