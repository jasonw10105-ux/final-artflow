// src/components/dashboard/CatalogueSelectionModal.tsx

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { X } from 'lucide-react';

interface Catalogue {
  id: string;
  title: string;
}

interface CatalogueSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCatalogue: (catalogueId: string | null) => void;
  currentCatalogueId: string | null;
}

const fetchArtistCatalogues = async (userId: string) => {
    const { data, error } = await supabase.from('catalogues').select('id, title').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw new Error("Could not fetch catalogues");
    return data;
}

const CatalogueSelectionModal = ({ isOpen, onClose, onSelectCatalogue, currentCatalogueId }: CatalogueSelectionModalProps) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<string | null>(currentCatalogueId);
    const [newCatalogueTitle, setNewCatalogueTitle] = useState('');

    const { data: catalogues, isLoading } = useQuery({
        queryKey: ['artist_catalogues', user?.id],
        queryFn: () => fetchArtistCatalogues(user!.id),
        enabled: !!user && isOpen, // Only fetch when the modal is open
    });
    
    // Mutation to create a new catalogue
    const createCatalogueMutation = useMutation({
        mutationFn: async (title: string) => {
            if (!user) throw new Error("User not found");
            if (!title.trim()) throw new Error("Title is required");

            const { data, error } = await supabase
                .from('catalogues')
                .insert({ title, user_id: user.id })
                .select('id, title')
                .single();
            
            if (error) throw error;
            return data;
        },
        onSuccess: (newCatalogue) => {
            queryClient.invalidateQueries({ queryKey: ['artist_catalogues', user?.id] });
            onSelectCatalogue(newCatalogue.id);
            onClose();
        },
        onError: (error: any) => {
            alert(`Error creating catalogue: ${error.message}`);
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
                    <button onClick={onClose} className="button-secondary" style={{padding: '0.5rem'}}><X size={18} /></button>
                </div>

                <div style={{margin: '1.5rem 0'}}>
                    <h4>Create New</h4>
                    <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
                        <input 
                            className="input" 
                            placeholder="New catalogue title..." 
                            value={newCatalogueTitle}
                            onChange={e => setNewCatalogueTitle(e.target.value)}
                            style={{flexGrow: 1}}
                        />
                        <button 
                            className="button button-secondary"
                            onClick={handleCreateAndSelect}
                            disabled={!newCatalogueTitle.trim() || createCatalogueMutation.isPending}
                        >
                            {createCatalogueMutation.isPending ? 'Creating...' : 'Create & Select'}
                        </button>
                    </div>
                </div>

                <div style={{borderTop: '1px solid var(--border)', paddingTop: '1.5rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h4>Existing Catalogues</h4>
                        <button onClick={handleClearSelection} className="button-link" style={{fontSize: '0.875rem'}}>Clear Selection</button>
                    </div>
                    {isLoading ? <p>Loading catalogues...</p> : (
                        <div style={{maxHeight: '250px', overflowY: 'auto', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                            {catalogues?.map(cat => (
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
                            ))}
                            {catalogues?.length === 0 && <p style={{color: 'var(--muted-foreground)'}}>No existing catalogues found.</p>}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <button className="button-secondary" onClick={onClose}>Cancel</button>
                    <button className="button button-primary" onClick={handleConfirm}>Confirm Selection</button>
                </div>
            </div>
        </div>
    );
};

export default CatalogueSelectionModal;