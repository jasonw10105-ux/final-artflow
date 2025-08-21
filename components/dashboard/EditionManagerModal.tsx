import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { X } from 'lucide-react';

// --- TYPE DEFINITIONS ---
interface EditionInfo {
    is_edition?: boolean;
    numeric_size?: number;
    ap_size?: number;
    sold_editions?: string[];
}
interface Artwork {
    id: string;
    title: string;
    edition_info: EditionInfo | null;
}
interface EditionManagerModalProps {
    artwork: Artwork;
    onClose: () => void;
}

// --- API FUNCTION ---
const updateSaleStatus = async ({ artworkId, identifier, isSold }: { artworkId: string, identifier: string, isSold: boolean }) => {
    const { error } = await supabase.rpc('update_artwork_edition_sale', {
        p_artwork_id: artworkId,
        p_edition_identifier: identifier,
        p_is_sold: isSold,
    });
    if (error) throw error;
};

// --- COMPONENT ---
const EditionManagerModal = ({ artwork, onClose }: EditionManagerModalProps) => {
    const queryClient = useQueryClient();
    const [localSoldEditions, setLocalSoldEditions] = useState(new Set(artwork.edition_info?.sold_editions || []));

    const mutation = useMutation({
        mutationFn: updateSaleStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            onClose(); // Close modal on successful save
        },
        onError: (error: any) => alert(`Error updating sale: ${error.message}`),
    });

    const allEditions = useMemo(() => {
        const editions = [];
        const numericSize = artwork.edition_info?.numeric_size || 0;
        const apSize = artwork.edition_info?.ap_size || 0;
        for (let i = 1; i <= numericSize; i++) editions.push(`${i}/${numericSize}`);
        for (let i = 1; i <= apSize; i++) editions.push(`AP ${i}/${apSize}`);
        return editions;
    }, [artwork.edition_info]);

    const handleCheckboxChange = (identifier: string, isChecked: boolean) => {
        const newSet = new Set(localSoldEditions);
        if (isChecked) {
            newSet.add(identifier);
        } else {
            newSet.delete(identifier);
        }
        setLocalSoldEditions(newSet);
        // Immediately trigger the mutation
        mutation.mutate({ artworkId: artwork.id, identifier, isSold: isChecked });
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
                <h3>Manage Sales for "{artwork.title}"</h3>
                <p>Check the box next to an edition to mark it as sold.</p>

                <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    {allEditions.length > 0 ? allEditions.map(identifier => (
                        <div key={identifier} style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                            <label style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={localSoldEditions.has(identifier)}
                                    onChange={(e) => handleCheckboxChange(identifier, e.target.checked)}
                                    style={{ width: '1rem', height: '1rem' }}
                                />
                                {identifier}
                            </label>
                        </div>
                    )) : <p>No editions defined for this artwork.</p>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                    <button className="button-secondary" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );
};

export default EditionManagerModal;