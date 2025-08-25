import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Database } from '@/types/database.types';
import { X } from 'lucide-react';

type Artwork = Database['public']['Tables']['artworks']['Row'];

interface AssignCatalogueModalProps {
    artwork: Artwork;
    onClose: () => void;
}

const fetchUserCatalogues = async (userId: string) => {
    const { data, error } = await supabase
        .from('catalogues')
        .select('id, title')
        .eq('user_id', userId)
        .eq('is_system_catalogue', false); // Users can't manually assign to the system catalogue
    if (error) throw new Error(error.message);
    return data || [];
};

const AssignCatalogueModal = ({ artwork, onClose }: AssignCatalogueModalProps) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedCatalogueId, setSelectedCatalogueId] = useState<string>(artwork.catalogue_id || '');

    const { data: catalogues, isLoading } = useQuery({
        queryKey: ['userCataloguesForAssignment', user?.id],
        queryFn: () => fetchUserCatalogues(user!.id),
        enabled: !!user,
    });

    const mutation = useMutation({
        mutationFn: async (newCatalogueId: string | null) => {
            const { error } = await supabase
                .from('artworks')
                .update({ catalogue_id: newCatalogueId })
                .eq('id', artwork.id);
            if (error) throw error;
        },
        onSuccess: () => {
            // Invalidate artworks and catalogues to refetch all data
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            queryClient.invalidateQueries({ queryKey: ['cataloguesWithStatusCounts'] });
            alert('Artwork assigned successfully!');
            onClose();
        },
        onError: (error: any) => alert(`Error: ${error.message}`),
    });

    const handleSave = () => {
        // Pass null if the user selects the "None" option
        mutation.mutate(selectedCatalogueId === '' ? null : selectedCatalogueId);
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <button onClick={onClose} className="modal-close-button"><X size={24} /></button>
                <h3>Assign "{artwork.title}"</h3>
                
                {isLoading ? <p>Loading catalogues...</p> : (
                    <div style={{ marginTop: '1.5rem' }}>
                        <label className="label">Select a Catalogue</label>
                        <select
                            className="select"
                            value={selectedCatalogueId}
                            onChange={(e) => setSelectedCatalogueId(e.target.value)}
                        >
                            <option value="">None (Remove from catalogue)</option>
                            {catalogues?.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.title}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="modal-actions">
                    <button className="button button-secondary" onClick={onClose}>Cancel</button>
                    <button className="button button-primary" onClick={handleSave} disabled={mutation.isPending}>
                        {mutation.isPending ? 'Saving...' : 'Save Assignment'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignCatalogueModal;