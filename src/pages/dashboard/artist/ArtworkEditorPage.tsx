import React from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import ArtworkEditorForm from '../../../components/dashboard/ArtworkEditorForm'; // <-- IMPORT THE FORM

const ArtworkEditorPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { artworkId } = useParams<{ artworkId: string }>();

    if (!artworkId) {
        navigate('/artist/artworks');
        return null;
    }
    
    // We only need to fetch the image URL here for the sidebar preview
    const { data: artworkPreview } = useQuery({
        queryKey: ['artwork-preview', artworkId],
        queryFn: async () => {
            const { data, error } = await supabase.from('artworks').select('image_url, title').eq('id', artworkId).single();
            if (error) return null;
            return data;
        },
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

    const handleSaveSuccess = () => {
        // The form now handles the alert and background generation
        // We just need to navigate away after a successful save
        alert('Artwork saved successfully! Images will regenerate in the background if needed.');
        navigate('/artist/artworks');
    };

    const FORM_ID = 'artwork-editor-form';

    return (
        <div style={{ padding: '2rem' }}>
            <Link to="/artist/artworks" className="button-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Back to Artworks
            </Link>
            
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '3rem', alignItems: 'start' }}>
                <aside style={{ position: 'sticky', top: '2rem' }}>
                    {artworkPreview?.image_url && (
                        <img src={artworkPreview.image_url} alt={artworkPreview.title || "Artwork"} style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 'var(--radius)' }} />
                    )}
                </aside>
                
                <main>
                    <ArtworkEditorForm
                        artworkId={artworkId}
                        formId={FORM_ID}
                        onSaveSuccess={handleSaveSuccess}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                        <button type="button" onClick={handleDelete} className="button button-danger" disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? 'Deleting...' : <><Trash2 size={14} /> Delete Artwork</>}
                        </button>
                        <button type="submit" form={FORM_ID} className="button button-primary">
                            Save Changes
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
};
export default ArtworkEditorPage;