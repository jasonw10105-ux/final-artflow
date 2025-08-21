// src/pages/dashboard/artist/CatalogueWizardPage.tsx

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { ArrowLeft, CheckCircle, PlusCircle } from 'lucide-react';

const CatalogueWizardPage = () => {
    const { catalogueId } = useParams<{ catalogueId: string }>();
    const isEditing = !!catalogueId;
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedArtworks, setSelectedArtworks] = useState<any[]>([]);
    const [originalArtworkIds, setOriginalArtworkIds] = useState<string[]>([]);

    // Fetch catalogue details and the artworks already assigned to it
    useQuery({
        queryKey: ['catalogue', catalogueId],
        queryFn: async () => {
            if (!catalogueId) return null;
            const { data: catalogueData, error: catError } = await supabase.from('catalogues').select('*').eq('id', catalogueId).single();
            if (catError) throw catError;

            const { data: artworkData, error: artError } = await supabase.from('artworks').select('id, title').eq('catalogue_id', catalogueId);
            if (artError) throw artError;
            
            setTitle(catalogueData.title);
            setDescription(catalogueData.description || '');
            setSelectedArtworks(artworkData || []);
            setOriginalArtworkIds(artworkData?.map(art => art.id) || []); // Store original state
            return catalogueData;
        },
        enabled: isEditing,
    });

    // Fetch all artworks for the user that are available to be added to a catalogue
    const { data: allArtworks, isLoading: artworksLoading } = useQuery({
        queryKey: ['availableArtworksForCatalogue', catalogueId, user?.id],
        queryFn: async () => {
            const { data } = await supabase.from('artworks')
                .select('id, title')
                .eq('user_id', user!.id)
                .in('status', ['Available', 'Pending'])
                // Exclude artworks that are already in THIS catalogue
                .or(`catalogue_id.is.null,catalogue_id.neq.${catalogueId || '00000000-0000-0000-0000-000000000000'}`);
            return data || [];
        },
        enabled: !!user,
    });
    
    // --- FIXED: Mutation logic now correctly updates the 'artworks' table ---
    const mutation = useMutation({
        mutationFn: async () => {
            if (!user || !title) throw new Error("Title is required.");
        
            let slug = undefined;
            if (!isEditing) {
                const { data: slugData } = await supabase.rpc('generate_unique_slug', { input_text: title, table_name: 'catalogues' });
                slug = slugData;
            }

            const catalogueData = { title, description, status: 'Active', is_published: true, user_id: user.id, slug };
            const { data: savedCatalogue, error } = isEditing 
                ? await supabase.from('catalogues').update(catalogueData).eq('id', catalogueId!).select().single()
                : await supabase.from('catalogues').insert(catalogueData).select().single();
                
            if (error) throw error;
            const currentCatalogueId = savedCatalogue.id;

            // 1. Unlink artworks that were removed from the selection
            const artworkIdsToUnlink = originalArtworkIds.filter(id => !selectedArtworks.some(art => art.id === id));
            if (artworkIdsToUnlink.length > 0) {
                await supabase.from('artworks').update({ catalogue_id: null }).in('id', artworkIdsToUnlink);
            }

            // 2. Link all newly selected artworks to this catalogue
            const selectedArtworkIds = selectedArtworks.map(art => art.id);
            if (selectedArtworkIds.length > 0) {
                await supabase.from('artworks').update({ catalogue_id: currentCatalogueId }).in('id', selectedArtworkIds);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cataloguesWithCounts'] });
            queryClient.invalidateQueries({ queryKey: ['artwork'] }); // Invalidate individual artworks
            alert(`Catalogue ${isEditing ? 'updated' : 'published'}!`);
            navigate('/artist/catalogues');
        },
        onError: (error: any) => alert(`Error: ${error.message}`)
    });

    const addArtwork = (artwork: any) => setSelectedArtworks(prev => [...prev, artwork]);
    const removeArtwork = (artworkId: string) => setSelectedArtworks(prev => prev.filter(art => art.id !== artworkId));

    return (
        <div>
            <Link to="/artist/catalogues" className="button-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Back to Catalogues
            </Link>
            <h1>{isEditing ? `Editing "${title}"` : 'Create New Catalogue'}</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginTop: '2rem' }}>
                {/* LEFT COLUMN -- DETAILS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <fieldset>
                        <legend>Catalogue Details</legend>
                        <label>Title</label>
                        <input className="input" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Spring Collection 2025"/>
                        <label>Description (Optional)</label>
                        <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="A short summary of this collection." />
                    </fieldset>
                    <button className="button button-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !title.trim()}>
                        {mutation.isPending ? 'Saving...' : 'Save Catalogue'}
                    </button>
                </div>

                {/* RIGHT COLUMN -- ARTWORKS */}
                <fieldset>
                    <legend>Manage Artworks</legend>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <h4>Available to Add</h4>
                            <div className="item-list-box">
                                {artworksLoading ? <p>Loading...</p> : allArtworks?.map(art => (
                                    <div key={art.id} className="item-list-row">
                                        <span>{art.title}</span>
                                        <button onClick={() => addArtwork(art)}><PlusCircle size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4>In This Catalogue</h4>
                            <div className="item-list-box">
                                {selectedArtworks.map(art => (
                                    <div key={art.id} className="item-list-row selected">
                                        <span>{art.title}</span>
                                        <button onClick={() => removeArtwork(art.id)}>&times;</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </fieldset>
            </div>
        </div>
    );
};

export default CatalogueWizardPage;