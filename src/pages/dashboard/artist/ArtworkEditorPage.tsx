// src/pages/dashboard/artist/ArtworkEditorPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TextTagManager from '../../../components/dashboard/TextTagManager';
import CatalogueSelectionModal from '../../../components/dashboard/CatalogueSelectionModal';
import { ArrowLeft, Folder, Info } from 'lucide-react';

// Form state no longer includes 'status'
interface ArtworkFormState {
    title: string;
    description: string;
    price: number | string;
    catalogue_id: string | null;
    is_price_negotiable: boolean;
    location: string;
    medium: string;
    dimensions: { height: string; width: string; depth: string; unit: string; };
    date_info: { type: string; year: string; era: string; };
    signature_info: { is_signed: boolean; type: string; location: string; };
}

const initialFormState: ArtworkFormState = {
    title: '',
    description: '',
    price: '',
    catalogue_id: null,
    is_price_negotiable: false,
    location: '',
    medium: '',
    dimensions: { height: '', width: '', depth: '', unit: 'in' },
    date_info: { type: 'Exact', year: '', era: 'AD' },
    signature_info: { is_signed: false, type: 'Signature', location: '' },
};

const fetchArtwork = async (artworkId: string) => {
    const { data, error } = await supabase
        .from('artworks')
        .select('*, catalogue:catalogues(title)')
        .eq('id', artworkId)
        .single();
    if (error) throw new Error("Artwork not found");
    const { data: tagsData } = await supabase.from('artwork_tags').select('tag').eq('artwork_id', artworkId);
    const tags = tagsData ? tagsData.map(t => t.tag) : [];
    return { ...data, tags };
}

const fetchAllUserTags = async (userId: string) => {
    const { data, error } = await supabase.rpc('get_distinct_user_tags', { p_user_id: userId });
    if (error) { console.error("RPC Error:", error); return []; }
    return data;
}

const ArtworkEditorPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { artworkId } = useParams<{ artworkId: string }>();
    const isEditing = !!artworkId;

    const [formData, setFormData] = useState<ArtworkFormState>(initialFormState);
    const [initialData, setInitialData] = useState<ArtworkFormState>(initialFormState);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [initialTags, setInitialTags] = useState<string[]>([]);
    const [isCatalogueModalOpen, setIsCatalogueModalOpen] = useState(false);
    const [catalogueName, setCatalogueName] = useState<string | null>(null);
    const [currentStatus, setCurrentStatus] = useState<string>('Pending');

    const { data: artworkData, isLoading: isLoadingArtwork } = useQuery({
        queryKey: ['artwork', artworkId],
        queryFn: () => fetchArtwork(artworkId!),
        enabled: isEditing,
        onSuccess: (data) => {
            if (data) {
                const loadedData = {
                    title: data.title || '',
                    description: data.description || '',
                    price: data.price || '',
                    catalogue_id: data.catalogue_id || null,
                    is_price_negotiable: data.is_price_negotiable || false,
                    location: data.location || '',
                    medium: data.medium || '',
                    dimensions: data.dimensions || initialFormState.dimensions,
                    date_info: data.date_info || initialFormState.date_info,
                    signature_info: data.signature_info || initialFormState.signature_info,
                };
                setFormData(loadedData);
                setInitialData(loadedData);
                setSelectedTags(data.tags || []);
                setInitialTags(data.tags || []);
                setCatalogueName((data.catalogue as any)?.title || null);
                setCurrentStatus(data.status || 'Pending');
            }
        }
    });

    const { data: allUserTags, isLoading: isLoadingTags } = useQuery({
        queryKey: ['allUserTags', user?.id],
        queryFn: () => fetchAllUserTags(user!.id),
        enabled: !!user
    });

    const isSold = currentStatus === 'Sold';

    const handleSelectCatalogue = (catalogueId: string | null) => {
        setFormData(prev => ({ ...prev, catalogue_id: catalogueId }));
        
        if (catalogueId) {
            const catalogues = queryClient.getQueryData<any[]>(['artist_catalogues', user?.id]);
            const selectedCatalogue = catalogues?.find(c => c.id === catalogueId);
            setCatalogueName(selectedCatalogue?.title || null);
        } else {
            setCatalogueName(null);
        }
    };
    
     const isDirty = useMemo(() => {
        return JSON.stringify(formData) !== JSON.stringify(initialData) || JSON.stringify(selectedTags) !== JSON.stringify(initialTags);
    }, [formData, initialData, selectedTags, initialTags]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const handleNestedChange = (group: keyof ArtworkFormState, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({
            ...prev,
            [group]: {
                ...prev[group] as any,
                [name]: type === 'checkbox' ? checked : value
            }
        }));
    };

    const handleDiscardChanges = () => {
        setFormData(initialData);
        setSelectedTags(initialTags);
    };

    const mainMutation = useMutation({
        mutationFn: async ({ artworkCoreData, newTags }: { artworkCoreData: any, newTags: string[] }) => {
            let savedArtwork;

            if (isEditing) {
                const { data, error } = await supabase.from('artworks').update(artworkCoreData).eq('id', artworkId!).select().single();
                if (error) throw error;
                savedArtwork = data;
            } else {
                const { data, error } = await supabase.from('artworks').insert(artworkCoreData).select().single();
                if (error) throw error;
                savedArtwork = data;
            }

            const currentArtworkId = savedArtwork.id;
            const tagsToAdd = newTags.filter(tag => !initialTags.includes(tag));
            const tagsToRemove = initialTags.filter(tag => !newTags.includes(tag));

            if (tagsToRemove.length > 0) {
                await supabase.from('artwork_tags').delete().eq('artwork_id', currentArtworkId).in('tag', tagsToRemove);
            }

            if (tagsToAdd.length > 0) {
                const newTagObjects = tagsToAdd.map(tag => ({ artwork_id: currentArtworkId, tag, user_id: user!.id }));
                await supabase.from('artwork_tags').insert(newTagObjects);
            }

            return savedArtwork;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            queryClient.invalidateQueries({ queryKey: ['artwork', data.id] });
            queryClient.invalidateQueries({ queryKey: ['allUserTags', user?.id] });
            alert('Artwork saved successfully!');
            navigate('/artist/artworks');
        },
        onError: (error: any) => alert(`Error saving artwork: ${error.message}`)
    });

    const relistMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('artworks')
                .update({ status: 'Available' })
                .eq('id', artworkId!);
            if (error) throw error;
        },
        onSuccess: () => {
            alert('Artwork has been marked as Available. You can now edit its details.');
            queryClient.invalidateQueries({ queryKey: ['artwork', artworkId] });
        },
        onError: (error: any) => {
            alert(`Failed to update status: ${error.message}`);
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formData.title) {
            alert("Title is required.");
            return;
        }

        let finalSlug = artworkData?.slug;
        if (!isEditing || (isEditing && formData.title !== initialData.title)) {
            const { data: slugData } = await supabase.rpc('generate_unique_slug', { input_text: formData.title, table_name: 'artworks' });
            finalSlug = slugData;
        }
        
        const finalStatus = isEditing ? currentStatus : 'Available';
        const artworkCoreData = {
            ...formData,
            status: finalStatus,
            price: formData.price || null,
            slug: finalSlug,
        };

        if (!isEditing) {
            artworkCoreData.user_id = user.id;
        }
        
        mainMutation.mutate({ artworkCoreData, newTags: selectedTags });
    };

    if (isLoadingArtwork || isLoadingTags) return <div className="loading-fullscreen">Loading Artwork Editor...</div>;

    return (
        <>
            <CatalogueSelectionModal 
                isOpen={isCatalogueModalOpen}
                onClose={() => setIsCatalogueModalOpen(false)}
                onSelectCatalogue={handleSelectCatalogue}
                currentCatalogueId={formData.catalogue_id}
            />

            <div className="editor-container">
                <header className="editor-header">
                     <Link to="/artist/artworks" className="back-link"><ArrowLeft size={20} /> Back to Artworks</Link>
                    <div className="editor-actions">
                        <button onClick={handleDiscardChanges} className="button-secondary" disabled={!isDirty || isSold}>Discard</button>
                        <button onClick={handleSubmit} className="button-primary" disabled={mainMutation.isPending || !isDirty || isSold}>
                            {mainMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </header>

                <main className="editor-main">
                    {isSold && (
                        <div style={{ 
                            gridColumn: '1 / -1', 
                            background: 'var(--accent)', 
                            border: '1px solid var(--border)', 
                            padding: '1rem 1.5rem', 
                            borderRadius: 'var(--radius)', 
                            marginBottom: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem'
                        }}>
                            <Info size={20} />
                            <p style={{margin: 0, fontWeight: 500}}>This artwork is marked as "Sold" and cannot be edited. To make changes, first mark it as available.</p>
                        </div>
                    )}

                    <div className="editor-form-column">
                        <div className="form-section">
                            <h3>Basic Information</h3>
                            <input name="title" value={formData.title} onChange={handleInputChange} placeholder="Artwork Title" className="input-large" disabled={isSold} />
                            <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Enter a description..." rows={6} disabled={isSold} />
                        </div>
                         <div className="form-section">
                            <h3>Pricing</h3>
                            <div className="input-group">
                                <span className="input-prefix">$</span>
                                <input name="price" type="number" value={formData.price} onChange={handleInputChange} placeholder="Enter price" disabled={isSold}/>
                            </div>
                            <label className="checkbox-label">
                                <input name="is_price_negotiable" type="checkbox" checked={formData.is_price_negotiable} onChange={handleInputChange} disabled={isSold}/>
                                Price is negotiable
                            </label>
                        </div>
                    </div>
                    <div className="editor-sidebar-column">
                        {isEditing && (
                             <div className="form-section">
                                <h3>Status Management</h3>
                                {isSold ? (
                                    <button 
                                        className="button button-secondary" 
                                        style={{width: '100%'}} 
                                        onClick={() => relistMutation.mutate()}
                                        disabled={relistMutation.isPending}
                                    >
                                        {relistMutation.isPending ? 'Updating...' : 'Mark as Available'}
                                    </button>
                                ) : (
                                    <p style={{color: 'var(--muted-foreground)'}}>Current status: {currentStatus}</p>
                                )}
                            </div>
                        )}
                       
                        <div className="form-section">
                            <h3>Catalogue</h3>
                            <div style={{
                                background: 'var(--input)', 
                                padding: '1rem', 
                                borderRadius: 'var(--radius)', 
                                border: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', color: catalogueName ? 'inherit' : 'var(--muted-foreground)'}}>
                                    <Folder size={18} />
                                    <span>{catalogueName || 'Not assigned'}</span>
                                </div>
                                <button className="button-secondary" onClick={() => setIsCatalogueModalOpen(true)} disabled={isSold}>
                                    Change
                                </button>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Tags</h3>
                            <TextTagManager 
                                allTags={allUserTags || []}
                                selectedTags={selectedTags}
                                onSelectedTagsChange={setSelectedTags}
                                disabled={isSold}
                            />
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default ArtworkEditorPage;