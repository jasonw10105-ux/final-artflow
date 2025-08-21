// src/pages/dashboard/artist/ArtworkEditorPage.tsx

import React, { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const fetchArtwork = async (artworkId: string) => {
    const { data, error } = await supabase.from('artworks').select('*').eq('id', artworkId).single();
    if (error) throw new Error("Artwork not found");
    return data;
}

const ArtworkEditorPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { artworkId } = useParams<{ artworkId: string }>();
    const isEditing = !!artworkId;

    const [title, setTitle] = useState('');
    const [originalTitle, setOriginalTitle] = useState('');
    const [price, setPrice] = useState<number | string>('');
    const [status, setStatus] = useState('Pending');
    const [imageUrl, setImageUrl] = useState('');
    const [description, setDescription] = useState('');

    // FIXED: Switched to the object syntax for useQuery
    useQuery({
        queryKey: ['artwork', artworkId],
        queryFn: () => fetchArtwork(artworkId!),
        enabled: isEditing,
        onSuccess: (data) => {
            if (data) {
                setTitle(data.title || '');
                setOriginalTitle(data.title || '');
                setPrice(data.price || '');
                setImageUrl(data.image_url || '');
                setDescription(data.description || '');
                setStatus(data.status || 'Pending');
            }
        }
    });
    
    // FIXED: Switched to the object syntax for useMutation
    const mutation = useMutation({
        mutationFn: async () => {
            if (!user || !title) throw new Error("Title is required.");

            let finalSlug = null;
            if (!isEditing || (isEditing && title !== originalTitle)) {
                const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug', { input_text: title, table_name: 'artworks' });
                if (slugError) throw new Error("Error generating unique URL.");
                finalSlug = slugData;
            }

            const artworkData = {
                user_id: user.id, title, description, image_url: imageUrl, price: parseFloat(price as string) || null,
                status,
                ...(finalSlug && { slug: finalSlug }),
            };

            const { error } = isEditing 
                ? await supabase.from('artworks').update(artworkData).eq('id', artworkId!)
                : await supabase.from('artworks').insert(artworkData);
            
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            alert(`Artwork ${isEditing ? 'updated' : 'created'}!`);
            navigate('/artist/artworks');
        },
        onError: (error: any) => alert(`Error: ${error.message}`)
    });

    return (
        <div>
            <h1>{isEditing ? 'Edit Artwork' : 'Add Artwork Details'}</h1>
            <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <fieldset>
                    <legend>Primary Information</legend>
                    {imageUrl && <img src={imageUrl} alt="Artwork preview" style={{width: '100px', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius)'}} />}
                    <label>Title</label>
                    <input className="input" type="text" value={title} onChange={e => setTitle(e.target.value)} required />
                    <label>Description</label>
                    <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} />
                    <label>Price ($)</label>
                    <input className="input" type="number" value={price} onChange={e => setPrice(e.target.value)} />
                     <label>Status</label>
                    <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="Pending">Pending (Not Public)</option>
                        <option value="Active">Active (Public)</option>
                        <option value="Sold">Sold</option>
                    </select>
                </fieldset>
                <button type="submit" className="button button-primary" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving...' : 'Save Artwork'}
                </button>
            </form>
        </div>
    );
};
export default ArtworkEditorPage;