// src/components/dashboard/ArtworkEditorForm.tsx

import React, { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider'; // --- THIS IMPORT WAS MISSING ---
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Folder, Edit } from 'lucide-react';
import CatalogueSelectionModal from './CatalogueSelectionModal';

// Interfaces
interface ArtworkDimensions { height?: number; width?: number; depth?: number; unit?: string; }
interface DateInfo { type?: string; year?: number; }
interface SignatureInfo { is_signed?: boolean; location?: string; }
interface Catalogue { id: string; title: string; }

interface ArtworkEditorFormProps {
    artworkId: string;
    formId: string;
    onSaveSuccess?: (artworkId:string) => void;
    onTitleChange?: (newTitle: string) => void;
}

// Fetching functions
const fetchArtwork = async (artworkId: string) => {
    const { data, error } = await supabase.from('artworks').select('*').eq('id', artworkId).single();
    if (error) throw new Error("Artwork not found");
    return data;
}
const fetchArtworkTags = async (artworkId: string) => {
    const { data, error } = await supabase.from('artwork_tags').select('tag').eq('artwork_id', artworkId);
    if (error) throw new Error("Could not fetch tags");
    return data.map(t => t.tag);
}
const fetchArtistCatalogues = async (userId: string) => {
    const { data, error } = await supabase.from('catalogues').select('id, title').eq('user_id', userId);
    if (error) throw new Error("Could not fetch catalogues");
    return data;
}

const ArtworkEditorForm = ({ artworkId, formId, onSaveSuccess, onTitleChange }: ArtworkEditorFormProps) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // State management
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [catalogueId, setCatalogueId] = useState<string | null>(null);
    const [isCatalogueModalOpen, setIsCatalogueModalOpen] = useState(false);
    const [price, setPrice] = useState<number | ''>('');
    const [isNegotiable, setIsNegotiable] = useState(false);
    const [minPrice, setMinPrice] = useState<number | ''>('');
    const [maxPrice, setMaxPrice] = useState<number | ''>('');
    const [dimensions, setDimensions] = useState<ArtworkDimensions>({ unit: 'in' });
    const [location, setLocation] = useState('');
    const [medium, setMedium] = useState('');
    const [dateInfo, setDateInfo] = useState<DateInfo>({ type: 'Created' });
    const [signatureInfo, setSignatureInfo] = useState<SignatureInfo>({ is_signed: false });
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    // Data Fetching
    const { data: artworkData, isLoading: isLoadingArtwork } = useQuery({
        queryKey: ['artwork', artworkId],
        queryFn: () => fetchArtwork(artworkId),
        enabled: !!artworkId,
        onSuccess: (data) => {
            if (data) {
                setTitle(data.title || '');
                setDescription(data.description || '');
                setCatalogueId(data.catalogue_id || null);
                setPrice(data.price || '');
                setIsNegotiable(data.is_price_negotiable || false);
                setMinPrice(data.min_price || '');
                setMaxPrice(data.max_price || '');
                setDimensions(data.dimensions || { unit: 'in' });
                setLocation(data.location || '');
                setMedium(data.medium || '');
                setDateInfo(data.date_info || { type: 'Created' });
                setSignatureInfo(data.signature_info || { is_signed: false });
            }
        }
    });

    useQuery({
        queryKey: ['artwork_tags', artworkId],
        queryFn: () => fetchArtworkTags(artworkId),
        enabled: !!artworkId,
        onSuccess: (data) => setTags(data || [])
    });

    const { data: catalogues, isLoading: isLoadingCatalogues } = useQuery({
        queryKey: ['artist_catalogues', user?.id],
        queryFn: () => fetchArtistCatalogues(user!.id),
        enabled: !!user,
    });
    
    const selectedCatalogueName = useMemo(() => {
        if (!catalogueId || !catalogues) return "No Catalogue";
        return catalogues.find(cat => cat.id === catalogueId)?.title || "No Catalogue";
    }, [catalogueId, catalogues]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        if (onTitleChange) {
            onTitleChange(newTitle);
        }
    };

    const mutation = useMutation({
        mutationFn: async () => {
            if (!user || !artworkId) throw new Error("User or Artwork ID is missing.");
            if (!title) throw new Error("Title is a required field.");

            const newStatus = artworkData?.status === 'Pending' ? 'Available' : artworkData?.status;

            const artworkUpdateData = {
                title, description, status: newStatus,
                catalogue_id: catalogueId,
                price: price || null,
                is_price_negotiable: isNegotiable,
                min_price: isNegotiable ? (minPrice || null) : null,
                max_price: isNegotiable ? (maxPrice || null) : null,
                dimensions, location, medium, date_info: dateInfo, signature_info: signatureInfo,
            };
            const { error: artworkError } = await supabase.from('artworks').update(artworkUpdateData).eq('id', artworkId);
            if (artworkError) throw artworkError;

            await supabase.from('artwork_tags').delete().eq('artwork_id', artworkId);
            if (tags.length > 0) {
                const newTags = tags.map(tag => ({ artwork_id: artworkId, tag }));
                await supabase.from('artwork_tags').insert(newTags);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artwork', artworkId] });
            queryClient.invalidateQueries({ queryKey: ['artwork_tags', artworkId] });
            queryClient.invalidateQueries({ queryKey: ['artworks-wizard'] });
            if (onSaveSuccess) onSaveSuccess(artworkId);
        },
        onError: (error: any) => alert(`Error saving artwork: ${error.message}`)
    });
    
    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim() !== '') {
            e.preventDefault();
            const newTag = tagInput.trim().toLowerCase();
            if (!tags.includes(newTag)) setTags([...tags, newTag]);
            setTagInput('');
        }
    };
    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };
    const handleSelectCatalogue = (newCatalogueId: string | null) => {
        setCatalogueId(newCatalogueId);
    };

    if (isLoadingArtwork) return <p>Loading artwork details...</p>;

    return (
        <>
            <CatalogueSelectionModal 
                isOpen={isCatalogueModalOpen}
                onClose={() => setIsCatalogueModalOpen(false)}
                onSelectCatalogue={handleSelectCatalogue}
                currentCatalogueId={catalogueId}
            />
            <form id={formId} onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <fieldset>
                    <label>Title*</label>
                    <input className="input" value={title} onChange={handleTitleChange} required />
                    <label>Optional description</label>
                    <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} rows={5}></textarea>
                    
                    <label>Add this to a catalogue</label>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.75rem 1rem', background: 'var(--input)', borderRadius: 'var(--radius)'
                    }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                            <Folder size={18} style={{color: 'var(--muted-foreground)'}}/>
                            <p>{isLoadingCatalogues ? 'Loading...' : selectedCatalogueName}</p>
                        </div>
                        <button type="button" onClick={() => setIsCatalogueModalOpen(true)} className="button-secondary" style={{padding: '0.25rem 0.75rem', display: 'flex', gap: '0.25rem', alignItems: 'center'}}>
                            <Edit size={14}/> Change
                        </button>
                    </div>
                </fieldset>

                {/* All other fieldsets remain the same */}
                <fieldset>
                    <legend>Pricing</legend>
                    <label>List Price (USD)</label>
                    <input className="input" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} placeholder="e.g., 1500" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" id="isNegotiable" checked={isNegotiable} onChange={e => setIsNegotiable(e.target.checked)} />
                        <label htmlFor="isNegotiable" style={{ marginBottom: 0 }}>Price is negotiable</label>
                    </div>
                    {isNegotiable && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div><label>Min Price</label><input className="input" type="number" value={minPrice} onChange={e => setMinPrice(Number(e.target.value))} /></div>
                            <div><label>Max Price</label><input className="input" type="number" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} /></div>
                        </div>
                    )}
                </fieldset>

                <fieldset>
                    <legend>Details</legend>
                    <label>Medium</label>
                    <input className="input" value={medium} onChange={e => setMedium(e.target.value)} placeholder="e.g., Oil on canvas" />
                    <label>Dimensions</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                        <input className="input" type="number" value={dimensions.height || ''} onChange={e => setDimensions(d => ({ ...d, height: Number(e.target.value) }))} placeholder="Height" />
                        <input className="input" type="number" value={dimensions.width || ''} onChange={e => setDimensions(d => ({ ...d, width: Number(e.target.value) }))} placeholder="Width" />
                        <input className="input" type="number" value={dimensions.depth || ''} onChange={e => setDimensions(d => ({ ...d, depth: Number(e.target.value) }))} placeholder="Depth" />
                        <select className="input" value={dimensions.unit} onChange={e => setDimensions(d => ({ ...d, unit: e.target.value }))}><option value="in">in</option><option value="cm">cm</option></select>
                    </div>
                     <label>Artwork Location</label>
                    <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., New York, NY" />
                </fieldset>

                <fieldset>
                    <legend>History</legend>
                    <label>Creation Date</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <select className="input" value={dateInfo.type} onChange={e => setDateInfo(d => ({...d, type: e.target.value}))}><option>Created</option><option>Circa</option></select>
                        <input className="input" type="number" value={dateInfo.year || ''} onChange={e => setDateInfo(d => ({...d, year: Number(e.target.value)}))} placeholder="Year" />
                    </div>
                    <label>Signature</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" id="is_signed" checked={signatureInfo.is_signed} onChange={e => setSignatureInfo(s => ({...s, is_signed: e.target.checked}))} />
                        <label htmlFor="is_signed" style={{marginBottom: 0}}>Artwork is signed by the artist</label>
                    </div>
                    {signatureInfo.is_signed && <><label>Signature Location</label><input className="input" value={signatureInfo.location || ''} onChange={e => setSignatureInfo(s => ({...s, location: e.target.value}))} placeholder="e.g., Bottom right corner" /></>}
                </fieldset>

                <fieldset>
                    <legend>Tags & Keywords</legend>
                    <label>Add tags to improve discovery (press Enter)</label>
                    <input className="input" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="e.g., abstract, landscape, blue" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                        {tags.map(tag => (
                            <div key={tag} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', padding: '0.25rem 0.75rem', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {tag}
                                <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                </fieldset>
            </form>
        </>
    );
};

export default ArtworkEditorForm;
