import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { X, PlusCircle } from 'lucide-react'; // Added PlusCircle icon
import toast from 'react-hot-toast'; // Assuming you use react-hot-toast

interface Catalogue {
  id: string;
  title: string;
  is_system_catalogue: boolean; // Include this to filter user-assignable catalogues
}

interface CatalogueSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCatalogue: (catalogueId: string | null) => void;
  currentCatalogueId: string | null;
}

const fetchArtistCatalogues = async (userId: string) => {
    // Fetch all catalogues, then filter out system ones for user selection
    const { data, error } = await supabase.from('catalogues').select('id, title, is_system_catalogue').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw new Error("Could not fetch catalogues");
    return data;
}

const CatalogueSelectionModal = ({ isOpen, onClose, onSelectCatalogue, currentCatalogueId }: CatalogueSelectionModalProps) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<string | null>(currentCatalogueId);
    const [newCatalogueTitle, setNewCatalogueTitle] = useState('');

    const { data: catalogues, isLoading } = useQuery<Catalogue[] | null, Error>({
        queryKey: ['artist_catalogues', user?.id],
        queryFn: () => fetchArtistCatalogues(user!.id),
        enabled: !!user && isOpen,
    });
    
    // Filter out system catalogues for display/selection by the user
    const userAssignableCatalogues = catalogues?.filter(cat => !cat.is_system_catalogue) || [];

    // Mutation to create a new catalogue
    const createCatalogueMutation = useMutation({
        mutationFn: async (title: string) => {
            if (!user) throw new Error("User not found");
            if (!title.trim()) throw new Error("Title is required");

            const { data, error } = await supabase
                .from('catalogues')
                .insert({ title, user_id: user.id, is_system_catalogue: false }) // Explicitly not a system catalogue
                .select('id, title')
                .single();
            
            if (error) throw error;
            return data;
        },
        onSuccess: (newCatalogue) => {
            queryClient.invalidateQueries({ queryKey: ['artist_catalogues', user?.id] });
            setSelectedId(newCatalogue.id); // Automatically select the newly created one
            setNewCatalogueTitle(''); // Clear input
            toast.success(`Catalogue "${newCatalogue.title}" created and selected!`);
        },
        onError: (error: any) => {
            toast.error(`Error creating catalogue: ${error.message}`);
        }
    });

    const handleCreateAndSelect = () => {
        createCatalogueMutation.mutate(newCatalogueTitle);
    };

    const handleConfirm = () => {
        onSelectCatalogue(selectedId);
        onClose();
    };

    const handleClearSelection = () => {
        setSelectedId(null);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content" style={{width: '500px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3>Select a Catalogue</h3>
                    <button onClick={onClose} className="button-icon-secondary"><X size={20} /></button>
                </div>

                <div style={{margin: '1.5rem 0'}}>
                    <h4>Create New Catalogue</h4>
                    <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
                        <input 
                            className="input" 
                            placeholder="New catalogue title..." 
                            value={newCatalogueTitle}
                            onChange={e => setNewCatalogueTitle(e.target.value)}
                            style={{flexGrow: 1}}
                            disabled={createCatalogueMutation.isPending}
                        />
                        <button 
                            className="button button-primary button-with-icon" // Use primary button
                            onClick={handleCreateAndSelect}
                            disabled={!newCatalogueTitle.trim() || createCatalogueMutation.isPending}
                        >
                            <PlusCircle size={16} /> {createCatalogueMutation.isPending ? 'Creating...' : 'Create & Select'}
                        </button>
                    </div>
                </div>

                <div style={{borderTop: '1px solid var(--border)', paddingTop: '1.5rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h4>Existing Catalogues</h4>
                        <button onClick={handleClearSelection} className="button-link" style={{fontSize: '0.875rem'}}>Clear Selection</button>
                    </div>
                    {isLoading ? <p className="loading-message">Loading catalogues...</p> : (
                        <div style={{maxHeight: '250px', overflowY: 'auto', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                            {userAssignableCatalogues.length > 0 ? (
                                userAssignableCatalogues.map(cat => (
                                    <label
                                        key={cat.id}
                                        htmlFor={cat.id}
                                        style={{
                                            display: 'block', padding: '1rem', borderRadius: 'var(--radius)',
                                            border: `2px solid ${selectedId === cat.id ? 'var(--primary)' : 'var(--border)'}`,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            id={cat.id}
                                            name="catalogue-selection"
                                            value={cat.id}
                                            checked={selectedId === cat.id}
                                            onChange={() => setSelectedId(cat.id)}
                                            style={{marginRight: '1rem'}}
                                        />
                                        {cat.title}
                                    </label>
                                ))
                            ) : (
                                <p className="text-muted-foreground">No existing custom catalogues found. Create one above!</p>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <button className="button button-secondary" onClick={onClose}>Cancel</button>
                    <button className="button button-primary" onClick={handleConfirm} disabled={createCatalogueMutation.isPending}>Confirm Selection</button>
                </div>
            </div>
        </div>
    );
};

export default CatalogueSelectionModal;