import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trash2, CheckCircle } from 'lucide-react';
import ArtworkEditorForm from '@/components/dashboard/ArtworkEditorForm'; // Assuming default export

const ArtworkEditorPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { artworkId } = useParams<{ artworkId: string }>();

    // This check is important for type safety
    if (!artworkId) {
        // You can render a message or redirect
        return <p>Artwork ID is missing. <Link to="/artist/artworks">Go back</Link></p>;
    }

    const queryKey = ['artwork-editor-page', artworkId];
    const { data: artworkData, isLoading } = useQuery({
        queryKey: queryKey,
        queryFn: async () => {
            const { data, error } = await supabase.from('artworks').select('image_url, title, status').eq('id', artworkId).single();
            if (error) throw new Error(error.message);
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

    const soldMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('artworks').update({ status: 'Sold' }).eq('id', artworkId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKey });
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            queryClient.invalidateQueries({ queryKey: ['artwork-form', artworkId]});
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
        alert('Artwork saved successfully! Images may be regenerating in the background.');
        navigate('/artist/artworks');
    };

    const FORM_ID = 'artwork-editor-form';

    if (isLoading) return <div style={{padding: '2rem'}}>Loading editor...</div>;

    return (
        <div style={{ padding: '2rem' }}>
            <Link to="/artist/artworks" className="button-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Back to Artworks
            </Link>
            
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '3rem', alignItems: 'start' }}>
                <aside style={{ position: 'sticky', top: '2rem' }}>
                    {artworkData?.image_url && (
                        <img src={artworkData.image_url} alt={artworkData.title || "Artwork"} style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 'var(--radius)' }} />
                    )}
                </aside>
                
                <main>
                    {/* The form is now self-contained. We just give it the ID it needs to work with. */}
                    <ArtworkEditorForm
                        artworkId={artworkId}
                        formId={FORM_ID}
                        onSaveSuccess={handleSaveSuccess}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                        <button type="button" onClick={handleDelete} className="button button-danger" disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? 'Deleting...' : <><Trash2 size={14} /> Delete Artwork</>}
                        </button>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {/* Corrected status check from 'Available' to 'Active' to match your schema/previous components */}
                            {artworkData?.status === 'Active' && (
                                <button type="button" onClick={handleMarkAsSold} className="button button-secondary" disabled={soldMutation.isPending}>
                                    {soldMutation.isPending ? 'Updating...' : <><CheckCircle size={14} /> Mark as Sold</>}
                                </button>
                            )}
                            {/* This button triggers the 'submit' event on the form with the matching ID */}
                            <button type="submit" form={FORM_ID} className="button button-primary">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ArtworkEditorPage;