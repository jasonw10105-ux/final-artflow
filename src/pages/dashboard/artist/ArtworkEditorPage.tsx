// src/pages/dashboard/artist/ArtworkEditorPage.tsx

import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trash2, CheckCircle } from 'lucide-react';
import ArtworkEditorForm from '@/components/dashboard/ArtworkEditorForm';
import { Database } from '@/types/database.types';

type Artwork = Database['public']['Tables']['artworks']['Row'];

const ArtworkEditorPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { artworkId } = useParams<{ artworkId: string }>();

    const queryKey = ['artwork-editor', artworkId];
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
        mutationFn: async (formData: Partial<Artwork>) => {
            if (!artworkId) throw new Error("Artwork ID is missing");
            const { error } = await supabase.from('artworks').update(formData).eq('id', artworkId);
            if (error) throw error;
        },
        onSuccess: () => {
            handleSaveSuccess();
        }
    });

    const deleteMutation = useMutation({ /* ... */ });
    const soldMutation = useMutation({ /* ... */ });

    const handleDelete = () => { /* ... */ };
    const handleMarkAsSold = () => { /* ... */ };

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
            <Link to="/artist/artworks" className="button-secondary">Back</Link>
            
            <main>
                {/* FIX: Passing the full 'artwork' object as a prop */}
                <ArtworkEditorForm
                    artwork={artwork}
                    onSave={(formData) => updateMutation.mutate(formData)}
                    isLoading={updateMutation.isPending} // FIX: Use isPending
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button onClick={handleDelete} disabled={deleteMutation.isPending}>Delete</button>
                    <button type="submit" form={FORM_ID} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </main>
        </div>
    );
};

export default ArtworkEditorPage;