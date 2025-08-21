// src/pages/dashboard/artist/ArtworkEditorPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';

// --- TYPE DEFINITIONS ---
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
    signature_info: { is_signed?: boolean; location?: 'Front' | 'Back' | '' } | null;
    framing_info: { is_framed?: boolean; details?: string } | null;
    provenance: string | null;
    edition_info: EditionInfo | null;
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
    
    const handleJsonChange = (parent: keyof Artwork, field: string, value: any) => { setArtwork(prev => ({ ...prev, [parent]: { ...(prev[parent] as object || {}), [field]: value } })); };
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
                        <fieldset><legend>Primary Information</legend><label>Title</label><input name="title" className="input" type="text" value={artwork.title || ''} onChange={(e) => setArtwork({...artwork, title: e.target.value})} required /><label>Medium</label><input name="medium" className="input" type="text" value={artwork.medium || ''} onChange={(e) => setArtwork({...artwork, medium: e.target.value})} required /><label>Description</label><textarea name="description" className="input" value={artwork.description || ''} onChange={(e) => setArtwork({...artwork, description: e.target.value})} /></fieldset>
                        
                        <fieldset>
                            <legend>Artwork Details</legend>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem'}}>
                                <div><label>Height</label><input type="number" value={artwork.dimensions?.height || ''} onChange={e => handleJsonChange('dimensions', 'height', e.target.value)} className="input" required /></div>
                                <div><label>Width</label><input type="number" value={artwork.dimensions?.width || ''} onChange={e => handleJsonChange('dimensions', 'width', e.target.value)} className="input" required /></div>
                                <div><label>Depth</label><input type="number" value={artwork.dimensions?.depth || ''} onChange={e => handleJsonChange('dimensions', 'depth', e.target.value)} className="input" /></div>
                                <div><label>Unit</label><input type="text" value={artwork.dimensions?.unit || ''} onChange={e => handleJsonChange('dimensions', 'unit', e.target.value)} className="input" placeholder="e.g., in, cm" /></div>
                            </div>
                            
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem'}}>
                                <div>
                                    <label>Is the work signed?</label>
                                    <div style={{display: 'flex', gap: '1rem'}}><label><input type="radio" name="is_signed" checked={artwork.signature_info?.is_signed === true} onChange={() => handleJsonChange('signature_info', 'is_signed', true)}/> Yes</label><label><input type="radio" name="is_signed" checked={!artwork.signature_info?.is_signed} onChange={() => handleJsonChange('signature_info', 'is_signed', false)}/> No</label></div>
                                    {artwork.signature_info?.is_signed && (<div style={{marginTop: '0.5rem'}}><label>Signature Location</label><select className="input" value={artwork.signature_info?.location || ''} onChange={e => handleJsonChange('signature_info', 'location', e.target.value)}><option value="">Select location</option><option value="Front">Front</option><option value="Back">Back</option></select></div>)}
                                </div>
                                <div>
                                    <label>Is the work framed?</label>
                                    <div style={{display: 'flex', gap: '1rem'}}><label><input type="radio" name="is_framed" checked={artwork.framing_info?.is_framed === true} onChange={() => handleJsonChange('framing_info', 'is_framed', true)}/> Yes</label><label><input type="radio" name="is_framed" checked={!artwork.framing_info?.is_framed} onChange={() => handleJsonChange('framing_info', 'is_framed', false)}/> No</label></div>
                                    {artwork.framing_info?.is_framed && (<div style={{marginTop: '0.5rem'}}><label>Framing Details</label><textarea className="input" value={artwork.framing_info?.details || ''} onChange={e => handleJsonChange('framing_info', 'details', e.target.value)} placeholder="e.g., Oak frame with museum glass"/></div>)}
                                </div>
                            </div>
                        </fieldset>

                        <fieldset><legend>Edition Information</legend><label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><input type="checkbox" checked={!!artwork.edition_info?.is_edition} onChange={e => handleJsonChange('edition_info', 'is_edition', e.target.checked)} />This work is part of an edition</label>{artwork.edition_info?.is_edition && (<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem'}}><div><label>Numeric Edition Size</label><input type="number" value={artwork.edition_info?.numeric_size || ''} onChange={e => handleJsonChange('edition_info', 'numeric_size', parseInt(e.target.value, 10))} className="input" placeholder="e.g., 50"/></div><div><label>Total Artist's Proofs (APs)</label><input type="number" value={artwork.edition_info?.ap_size || ''} onChange={e => handleJsonChange('edition_info', 'ap_size', parseInt(e.target.value, 10))} className="input" placeholder="e.g., 5"/></div></div>)}</fieldset>
                        {artwork.edition_info?.is_edition && fetchedArtwork?.status !== 'Pending' && (<fieldset><legend>Sales & Inventory Management</legend><p>Check the box next to an edition to mark it as sold. The artwork's main status will update automatically.</p><div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)' }}>{allEditions.map(identifier => (<label key={identifier} style={{display: 'flex', gap: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius)', background: 'var(--card)', cursor: 'pointer'}}><input type="checkbox" checked={fetchedArtwork?.edition_info?.sold_editions?.includes(identifier)} onChange={(e) => handleEditionSaleChange(identifier, e.target.checked)} disabled={saleMutation.isPending}/>{identifier}</label>))}</div></fieldset>)}
                        <fieldset><legend>Provenance</legend><textarea name="provenance" className="input" placeholder="History of ownership, exhibitions, etc." value={artwork.provenance || ''} onChange={(e) => setArtwork({...artwork, provenance: e.target.value})} /></fieldset>
                        <fieldset><legend>Pricing</legend><label>Price ($)</label><input name="price" className="input" type="number" step="0.01" value={artwork.price || ''} onChange={(e) => setArtwork({...artwork, price: parseFloat(e.target.value)})} required /><label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><input name="is_price_negotiable" type="checkbox" checked={!!artwork.is_price_negotiable} onChange={(e) => setArtwork({...artwork, is_price_negotiable: e.target.checked})} /> Price is negotiable </label></fieldset>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                            <button type="button" onClick={handleDelete} className="button button-danger" disabled={deleteMutation.isPending}>{deleteMutation.isPending ? 'Deleting...' : <><Trash2 size={14} /> Delete Artwork</>}</button>
                            <button type="submit" className="button button-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
};
export default ArtworkEditorPage;