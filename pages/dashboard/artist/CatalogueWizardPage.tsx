// src/pages/dashboard/artist/CatalogueWizardPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { ArrowLeft, CheckCircle, PlusCircle, Trash2 } from 'lucide-react';

// --- API FUNCTIONS ---
const fetchAllUserArtworks = async (userId: string) => {
    const { data, error } = await supabase
        .from('artworks')
        .select('id, title, image_url, dimensions, price, catalogue_id')
        .eq('user_id', userId)
        .in('status', ['Active', 'Sold'])
        .order('created_at', { ascending: false });
    if (error) throw new Error("Could not fetch user's artworks.");
    return data || [];
};

const fetchExistingCatalogue = async (catalogueId: string) => {
    const { data, error } = await supabase.from('catalogues').select('*').eq('id', catalogueId).single();
    if (error) throw new Error("Could not fetch catalogue details.");
    return data;
};

// --- COMPONENT ---
const CatalogueWizardPage = () => {
    const { catalogueId } = useParams<{ catalogueId: string }>();
    const isEditing = !!catalogueId;
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedArtworkIds, setSelectedArtworkIds] = useState<Set<string>>(new Set());
    const [coverArtworkId, setCoverArtworkId] = useState<string | null>(null);

    // Query 1: Fetch ALL artworks for the user. This is our single source of truth.
    const { data: allArtworks, isLoading: artworksLoading } = useQuery({
        queryKey: ['allUserArtworksForCatalogue', user?.id],
        queryFn: () => fetchAllUserArtworks(user!.id),
        enabled: !!user,
    });

    // Query 2: If editing, fetch just the catalogue's own details.
    const { data: existingCatalogue, isLoading: catalogueLoading } = useQuery({
        queryKey: ['catalogueDetails', catalogueId],
        queryFn: () => fetchExistingCatalogue(catalogueId!),
        enabled: isEditing,
    });

    // Effect to populate state when editing
    useEffect(() => {
        if (isEditing && existingCatalogue && allArtworks) {
            setTitle(existingCatalogue.title);
            setDescription(existingCatalogue.description || '');
            
            // Populate selected artworks based on their catalogue_id
            const inCatalogueIds = allArtworks.filter(art => art.catalogue_id === catalogueId).map(art => art.id);
            setSelectedArtworkIds(new Set(inCatalogueIds));

            const coverArt = allArtworks.find(art => art.image_url === existingCatalogue.cover_image_url);
            setCoverArtworkId(coverArt?.id || null);
        }
    }, [isEditing, existingCatalogue, allArtworks, catalogueId]);

    // Derive available and selected lists from the single source of truth to prevent duplicates
    const [availableArtworks, selectedArtworks] = useMemo(() => {
        if (!allArtworks) return [[], []];
        const available = allArtworks.filter(art => !selectedArtworkIds.has(art.id));
        const selected = allArtworks.filter(art => selectedArtworkIds.has(art.id));
        return [available, selected];
    }, [allArtworks, selectedArtworkIds]);

    const mutation = useMutation({
        mutationFn: async () => {
            if (!user || !title) throw new Error("Title is required.");
        
            let finalCoverImageUrl = null;
            if (coverArtworkId) {
                const coverArt = allArtworks?.find(art => art.id === coverArtworkId);
                finalCoverImageUrl = coverArt?.image_url || null;
            } else if (selectedArtworks.length > 0) {
                const randomArt = selectedArtworks[Math.floor(Math.random() * selectedArtworks.length)];
                finalCoverImageUrl = randomArt.image_url;
            }

            let slug = existingCatalogue?.slug;
            if (!isEditing) {
                const { data: slugData } = await supabase.rpc('generate_unique_slug', { input_text: title, table_name: 'catalogues' });
                slug = slugData;
            }

            const catalogueData = { title, description, is_published: true, user_id: user.id, slug, cover_image_url: finalCoverImageUrl };
            
            const { data: savedCatalogue, error } = isEditing 
                ? await supabase.from('catalogues').update(catalogueData).eq('id', catalogueId!).select().single()
                : await supabase.from('catalogues').insert(catalogueData).select().single();
            if (error) throw error;

            const currentCatalogueId = savedCatalogue.id;
            const originalArtworkIds = allArtworks?.filter(art => art.catalogue_id === catalogueId).map(art => art.id) || [];
            const artworkIdsToUnlink = originalArtworkIds.filter(id => !selectedArtworkIds.has(id));

            if (artworkIdsToUnlink.length > 0) {
                await supabase.from('artworks').update({ catalogue_id: null }).in('id', artworkIdsToUnlink);
            }
            if (selectedArtworkIds.size > 0) {
                await supabase.from('artworks').update({ catalogue_id: currentCatalogueId }).in('id', Array.from(selectedArtworkIds));
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cataloguesWithCounts'] });
            alert(`Catalogue ${isEditing ? 'updated' : 'published'}!`);
            navigate('/artist/catalogues');
        },
        onError: (error: any) => alert(`Error: ${error.message}`)
    });

    const addArtwork = (artworkId: string) => setSelectedArtworkIds(prev => new Set(prev).add(artworkId));
    const removeArtwork = (artworkId: string) => {
        if (coverArtworkId === artworkId) setCoverArtworkId(null);
        setSelectedArtworkIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(artworkId);
            return newSet;
        });
    };

    if (catalogueLoading || artworksLoading) return <div style={{padding: '2rem'}}>Loading Catalogue Editor...</div>;

    return (
        <div style={{ padding: '2rem' }}>
            <Link to="/artist/catalogues" className="button-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Back to Catalogues
            </Link>
            <h1>{isEditing ? `Editing "${existingCatalogue?.title}"` : 'Create New Catalogue'}</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginTop: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <fieldset>
                        <legend>Catalogue Details</legend>
                        <label>Title</label><input className="input" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Spring Collection 2025" required/>
                        <label>Description (Optional)</label><textarea className="input" value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="A short summary of this collection." />
                    </fieldset>
                    <button className="button button-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !title.trim()}>{mutation.isPending ? 'Saving...' : 'Save Catalogue'}</button>
                </div>
                <fieldset>
                    <legend>Manage Artworks</legend>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <h4>Available to Add</h4>
                            <div className="item-list-box">
                                {availableArtworks.map(art => (
                                    <div key={art.id} className="item-list-row">
                                        <img src={art.image_url} alt={art.title!} style={{width: 40, height: 40, borderRadius: 4, objectFit: 'cover'}}/>
                                        <div style={{flexGrow: 1}}>
                                            <span>{art.title}</span>
                                            <p style={{fontSize: '0.75rem', color: 'var(--muted-foreground)'}}>{art.dimensions ? `${art.dimensions.height}x${art.dimensions.width} ${art.dimensions.unit || ''}` : ''} - ${art.price || 'N/A'}</p>
                                        </div>
                                        <button onClick={() => addArtwork(art.id)}><PlusCircle size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4>In This Catalogue ({selectedArtworks.length})</h4>
                            <div className="item-list-box">
                                {selectedArtworks.map(art => (
                                    <div key={art.id} className={`item-list-row selected ${coverArtworkId === art.id ? 'is-cover' : ''}`}>
                                        <img src={art.image_url} alt={art.title!} style={{width: 40, height: 40, borderRadius: 4, objectFit: 'cover'}}/>
                                        <span style={{flexGrow: 1}}>{art.title}</span>
                                        <button onClick={() => setCoverArtworkId(art.id)} className="button-secondary button-sm" disabled={coverArtworkId === art.id}>{coverArtworkId === art.id ? <CheckCircle size={14}/> : 'Set Cover'}</button>
                                        <button onClick={() => removeArtwork(art.id)}><Trash2 size={16} color="red"/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </fieldset>
            </div>
            <style>{`.item-list-box { border: 1px solid var(--border); border-radius: var(--radius); height: 400px; overflow-y: auto; padding: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; } .item-list-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; border-radius: var(--radius); background: var(--card); } .item-list-row span { font-size: 0.875rem; } .item-list-row button { background: none; border: none; cursor: pointer; color: var(--muted-foreground); padding: 0.25rem; } .item-list-row.selected { border: 1px solid var(--primary); } .item-list-row.is-cover { border-color: green; background: var(--accent); } .item-list-row button.button-sm { font-size: 0.75rem; padding: 0.25rem 0.5rem; line-height: 1; height: auto; }`}</style>
        </div>
    );
};
export default CatalogueWizardPage;