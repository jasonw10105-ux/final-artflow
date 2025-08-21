// src/pages/dashboard/artist/CatalogueWizardPage.tsx

import React, { useState } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';

const SortableArtwork = ({ artwork, onRemove }: { artwork: any, onRemove: (id: string) => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: artwork.id });
    const style = { transform: CSS.Transform.toString(transform), transition, padding: '10px', border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 'var(--radius)', cursor: 'grab', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <span>{artwork.title}</span>
            <button onClick={() => onRemove(artwork.id)} style={{background: 'transparent', border: 'none', color: 'var(--muted-foreground)'}}>X</button>
        </div>
    );
};

const CatalogueWizardPage = () => {
    const { catalogueId } = useParams<{ catalogueId: string }>();
    const isEditing = !!catalogueId;
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [step, setStep] = useState(1);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedArtworks, setSelectedArtworks] = useState<any[]>([]);
    
    useQuery({
        queryKey: ['catalogue', catalogueId],
        queryFn: async () => {
            if (!catalogueId) return null;
            const { data } = await supabase.from('catalogues').select('*, artworks:catalogue_artworks(position, artwork:artworks(*))').eq('id', catalogueId).single();
            if (data) {
                setTitle(data.title);
                setDescription(data.description || '');
                const sortedArtworks = (data.artworks as any[]).sort((a,b) => a.position - b.position).map(item => item.artwork);
                setSelectedArtworks(sortedArtworks);
            }
            return data;
        },
        enabled: isEditing
    });

    const { data: allArtworks, isLoading: artworksLoading } = useQuery({
        queryKey: ['allArtworks', user?.id],
        queryFn: async () => {
            const { data } = await supabase.from('artworks').select('id, title').eq('user_id', user!.id).eq('status', 'Active');
            return data || [];
        },
        enabled: !!user
    });

    const availableArtworks = allArtworks?.filter(art => !selectedArtworks.some(sel => sel.id === art.id));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSelectedArtworks((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };
    
    const mutation = useMutation({
        mutationFn: async () => {
            if (!user || !title) throw new Error("Title is required.");
            
            let slug = undefined;
            if (!isEditing) {
                const { data: slugData } = await supabase.rpc('generate_unique_slug', { input_text: title, table_name: 'catalogues' });
                slug = slugData;
            }

            const catalogueData = { user_id: user.id, title, description, ...(slug && { slug }), status: 'Active', is_published: true };

            const { data: savedCatalogue, error } = isEditing 
                ? await supabase.from('catalogues').update(catalogueData).eq('id', catalogueId!).select().single()
                : await supabase.from('catalogues').insert(catalogueData).select().single();
                
            if (error || !savedCatalogue) throw error || new Error("Failed to save catalogue");

            await supabase.from('catalogue_artworks').delete().eq('catalogue_id', savedCatalogue.id);
            if (selectedArtworks.length > 0) {
                const artworkLinks = selectedArtworks.map((art, index) => ({
                    catalogue_id: savedCatalogue.id, artwork_id: art.id, position: index
                }));
                const { error: linkError } = await supabase.from('catalogue_artworks').insert(artworkLinks);
                if (linkError) throw linkError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['catalogues'] });
            alert(`Catalogue ${isEditing ? 'updated' : 'published'}!`);
            navigate('/artist/catalogues');
        },
        onError: (error: any) => alert(`Error: ${error.message}`)
    });

    return (
        <div>
            <h1>{isEditing ? 'Edit' : 'Create'} Catalogue</h1>
            <div style={{ margin: '2rem 0', display: 'flex', gap: '1rem' }}>
                <button className="button-secondary" disabled={step === 1} onClick={() => setStep(s => s - 1)}>Previous</button>
                {step < 2 && <button className="button-secondary" onClick={() => setStep(s => s + 1)}>Next</button>}
                {step === 2 && <button className="button button-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? 'Publishing...' : 'Save & Publish'}</button>}
            </div>

            {step === 1 && (
                <fieldset>
                    <label>Catalogue Title</label>
                    <input className="input" type="text" value={title} onChange={e => setTitle(e.target.value)} />
                    <label>Description</label>
                    <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} />
                </fieldset>
            )}
            {step === 2 && (
                <fieldset>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <h4>Your Collection (Click to add)</h4>
                            <div>
                                {artworksLoading ? <p>Loading...</p> : availableArtworks?.map(art => (
                                    <button key={art.id} className="button-secondary" onClick={() => setSelectedArtworks(s => [...s, art])}>
                                        {art.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4>In Catalogue (Drag to Reorder)</h4>
                            <div>
                                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={selectedArtworks} strategy={verticalListSortingStrategy}>
                                        {selectedArtworks.map(art => <SortableArtwork key={art.id} artwork={art} onRemove={(id) => setSelectedArtworks(s => s.filter(a => a.id !== id))} />)}
                                    </SortableContext>
                                </DndContext>
                            </div>
                        </div>
                    </div>
                </fieldset>
            )}
        </div>
    );
};
export default CatalogueWizardPage;