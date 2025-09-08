import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Database } from '@/types/database.types';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

// Re-using Database type for clarity
type Artwork = Database['public']['Tables']['artworks']['Row'];
type Catalogue = Database['public']['Tables']['catalogues']['Row'];
type ArtworkCatalogueJunction = Database['public']['Tables']['artwork_catalogue_junction']['Row'];

interface AssignCatalogueModalProps {
    artwork: Artwork;
    onClose: () => void;
}

const fetchUserCatalogues = async (userId: string): Promise<Catalogue[]> => {
    const { data, error } = await supabase
        .from('catalogues')
        .select('id, title, is_system_catalogue')
        .eq('user_id', userId)
        .order('title', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
};

// Fetch current assignments for the artwork
const fetchArtworkAssignments = async (artworkId: string): Promise<string[]> => {
    const { data, error } = await supabase
        .from('artwork_catalogue_junction')
        .select('catalogue_id')
        .eq('artwork_id', artworkId);
    if (error) throw new Error(error.message);
    return data?.map(item => item.catalogue_id) || [];
};

const AssignCatalogueModal = ({ artwork, onClose }: AssignCatalogueModalProps) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedCatalogueIds, setSelectedCatalogueIds] = useState<Set<string>>(new Set());

    const { data: allUserCatalogues, isLoading: isLoadingCatalogues } = useQuery<Catalogue[], Error>({
        queryKey: ['userCataloguesForAssignment', user?.id],
        queryFn: () => fetchUserCatalogues(user!.id),
        enabled: !!user,
    });

    const { data: currentAssignments, isLoading: isLoadingAssignments } = useQuery<string[], Error>({
        queryKey: ['artworkAssignments', artwork.id],
        queryFn: () => fetchArtworkAssignments(artwork.id),
        enabled: !!artwork.id,
    });

    // Initialize selectedCatalogueIds when currentAssignments load
    useEffect(() => {
        if (currentAssignments) {
            setSelectedCatalogueIds(new Set(currentAssignments));
        }
    }, [currentAssignments]);

    const mutation = useMutation({
        mutationFn: async (newCatalogueIds: Set<string>) => {
            if (!user) throw new Error("User not authenticated.");

            const operations: Promise<any>[] = [];

            // Add/Remove system catalogue automatically based on artwork status
            const systemCatalogue = allUserCatalogues?.find(cat => cat.is_system_catalogue);
            if (systemCatalogue) {
                if (artwork.status === 'available' || artwork.status === 'sold') {
                    newCatalogueIds.add(systemCatalogue.id);
                } else {
                    newCatalogueIds.delete(systemCatalogue.id);
                }
            }

            const currentIds = new Set(currentAssignments || []);

            // Identify additions
            for (const id of newCatalogueIds) {
                if (!currentIds.has(id)) {
                    operations.push(
                        supabase.from('artwork_catalogue_junction').insert({
                            artwork_id: artwork.id,
                            catalogue_id: id,
                            position: 0, // Default position, could be improved
                        })
                    );
                }
            }

            // Identify removals
            for (const id of currentIds) {
                if (!newCatalogueIds.has(id)) {
                    operations.push(
                        supabase.from('artwork_catalogue_junction').delete()
                            .eq('artwork_id', artwork.id)
                            .eq('catalogue_id', id)
                    );
                }
            }
            
            await Promise.all(operations);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            queryClient.invalidateQueries({ queryKey: ['artworkAssignments', artwork.id] });
            queryClient.invalidateQueries({ queryKey: ['userCataloguesForAssignment'] });
            queryClient.invalidateQueries({ queryKey: ['cataloguesWithStatusCounts'] });
            toast.success('Artwork catalogue assignments updated successfully!');
            onClose();
        },
        onError: (error: any) => {
            toast.error(`Error updating assignments: ${error.message}`);
        },
    });

    const handleToggleCatalogue = (catalogueId: string, isSystem: boolean) => {
        if (isSystem) {
            toast.info("System catalogues are assigned automatically based on artwork status.");
            return;
        }
        setSelectedCatalogueIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(catalogueId)) {
                newSet.delete(catalogueId);
            } else {
                newSet.add(catalogueId);
            }
            return newSet;
        });
    };

    const handleSave = () => {
        mutation.mutate(selectedCatalogueIds);
    };

    const isLoadingCombined = isLoadingCatalogues || isLoadingAssignments;

    return (
        <div className="modal-backdrop">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3>Assign "{artwork.title}" to Catalogues</h3>
                    <button onClick={onClose} className="button-icon-secondary"><X size={20} /></button>
                </div>

                {isLoadingCombined ? <p className="loading-message">Loading catalogues...</p> : (
                    <div className="modal-body space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Select the custom catalogues you want this artwork to be part of.
                            System catalogues (like "Available Work") are managed automatically based on artwork status.
                        </p>
                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2">
                            {allUserCatalogues?.map((cat) => (
                                <label key={cat.id} className={`flex items-center p-3 rounded-md border cursor-pointer 
                                    ${selectedCatalogueIds.has(cat.id) ? 'border-primary bg-primary-subtle' : 'border-border'}`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedCatalogueIds.has(cat.id)}
                                        onChange={() => handleToggleCatalogue(cat.id, cat.is_system_catalogue)}
                                        disabled={cat.is_system_catalogue}
                                        className="mr-3"
                                    />
                                    <span className="flex-grow">{cat.title}</span>
                                    {cat.is_system_catalogue && (
                                        <span className="text-xs text-muted-foreground ml-2">(System)</span>
                                    )}
                                </label>
                            ))}
                            {allUserCatalogues?.length === 0 && (
                                <p className="text-muted-foreground text-center">No custom catalogues available.</p>
                            )}
                        </div>
                    </div>
                )}

                <div className="modal-footer">
                    <button className="button button-secondary" onClick={onClose}>Cancel</button>
                    <button className="button button-primary" onClick={handleSave} disabled={mutation.isPending || isLoadingCombined}>
                        {mutation.isPending ? 'Saving...' : 'Save Assignments'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignCatalogueModal;