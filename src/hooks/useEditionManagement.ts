import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

interface EditionInfo {
    numeric_size?: number;
    ap_size?: number;
    sold_editions?: string[];
}

interface Artwork {
    id: string;
    edition_info: EditionInfo | null;
}

export const useEditionManagement = (artwork: Artwork) => {
    const queryClient = useQueryClient();
    const [localSoldEditions, setLocalSoldEditions] = useState(new Set(artwork.edition_info?.sold_editions || []));

    const mutation = useMutation({
        mutationFn: async ({ identifier, isSold }: { identifier: string; isSold: boolean }) => {
            const { error } = await supabase.rpc('update_artwork_edition_sale', {
                p_artwork_id: artwork.id,
                p_edition_identifier: identifier,
                p_is_sold: isSold,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
        },
        onError: (error: any) => alert(`Error updating sale: ${error.message}`),
    });

    const allEditions = useMemo(() => {
        const editions: string[] = [];
        const numericSize = artwork.edition_info?.numeric_size || 0;
        const apSize = artwork.edition_info?.ap_size || 0;

        for (let i = 1; i <= numericSize; i++) editions.push(`${i}/${numericSize}`);
        for (let i = 1; i <= apSize; i++) editions.push(`AP ${i}/${apSize}`);

        return editions;
    }, [artwork.edition_info]);

    const toggleEdition = (identifier: string, isSold: boolean) => {
        const newSet = new Set(localSoldEditions);
        if (isSold) newSet.add(identifier);
        else newSet.delete(identifier);
        setLocalSoldEditions(newSet);
        mutation.mutate({ identifier, isSold });
    };

    return { allEditions, localSoldEditions, toggleEdition };
};