// src/pages/dashboard/artist/ArtworkEditorPage.tsx

import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trash2, CheckCircle } from 'lucide-react';
import ArtworkEditorForm from '@/components/dashboard/ArtworkEditorForm';
import { Database } from '@/types/database.types';

type Artwork = Database['public']['Tables']['artworks']['Row'];
type ArtworkUpdate = Partial<Omit<Artwork, 'id' | 'user_id' | 'created_at'>>;

const ArtworkEditorPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { artworkId } = useParams<{ artworkId: string }>();

    const queryKey = ['artwork-editor-page', artworkId];
    const { data: artwork, isLoading } = useQuery({
        queryKey: queryKey,
        queryFn: async () => {
            if (!artworkId) return null;
            const { data, error } = await supabase.from('artworks').select('*').eq('id', artworkId).single();
            if (error) throw new Error(error.message);
            return data;
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (formData: ArtworkUpdate) => {
            if (!artworkId) throw new Error("Artwork ID is missing");
            const { error } = await supabase.from('artworks').update(formData).eq('id', artworkId);
            if (error) throw error;
        },
        onSuccess: () => {
            handleSaveSuccess();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!artworkId) throw new Error("Artwork ID is missing");
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

    const soldMutation = useMutation({
        mutationFn: async () => {
            if (!artworkId) throw new Error("Artwork ID is missing");
            const { error } = await supabase.from('artworks').update({ status: 'Sold' }).eq('id', artworkId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKey });
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            alert('Artwork has been marked as sold.');
        },
        onError: (error: any) => alert(`Error updating status: ${error.message}`),
    });
    
    const handleDelete = () => {
        if (window.confirm('Are you sure you want to permanently delete this artwork? This action cannot be undone.')) {
            deleteMutation.mutate();
        }
    };

    const handleMarkAsSold = () => {
        if (window.confirm('Are you sure you want to mark this artwork as sold? This will hide pricing and purchase options.')) {
            soldMutation.mutate();
        }
    };

    const handleSaveSuccess = () => {
        alert('Artwork saved successfully!');
        queryClient.invalidateQueries({ queryKey: ['artworks'] });
        navigate('/artist/artworks');
    };

    const FORM_ID = 'artwork-editor-form';

    if (isLoading) return <p>Loading artwork...</p>;
    if (!artwork) return <p>Artwork not found. <Link to="/artist/artworks">Go back</Link></p>;

    return (
        <div style={{ padding: '2rem' }}>
            <Link to="/artist/artworks" className="button-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Back to Artworks
            </Link>
            
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '3rem', alignItems: 'start' }}>
                <aside style={{ position: 'sticky', top: '2rem' }}>
                    <img src={artwork.image_url || ''} alt={artwork.title || "Artwork"} style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 'var(--radius)' }} />
                </aside>
                
                <main>
                    <ArtworkEditorForm
                        artwork={artwork}
                        onSave={(formData) => updateMutation.mutate(formData)}
                        isLoading={updateMutation.isPending}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                        <button type="button" onClick={handleDelete} className="button button-danger" disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? 'Deleting...' : <><Trash2 size={14} /> Delete Artwork</>}
                        </button>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {artwork.status === 'Available' && (
                                <button type="button" onClick={handleMarkAsSold} className="button button-secondary" disabled={soldMutation.isPending}>
                                    {soldMutation.isPending ? 'Updating...' : <><CheckCircle size={14} /> Mark as Sold</>}
                                </button>
                            )}
                            <button type="submit" form={FORM_ID} className="button button-primary" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ArtworkEditorPage;