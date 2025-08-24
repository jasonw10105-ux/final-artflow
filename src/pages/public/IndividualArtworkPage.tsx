// src/pages/public/IndividualArtworkPage.tsx

import React, { useEffect } from 'react';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const fetchArtwork = async (slug: string) => {
    const { data, error } = await supabase.from('artworks').select('*').eq('slug', slug).single();
    if (error) throw new Error(error.message);
    return data;
};

const IndividualArtworkPage = () => {
    const { artworkSlug } = useParams<{ artworkSlug: string }>();
    const { addArtwork } = useRecentlyViewed(); // FIX: The function is `addArtwork`

    const { data: artwork } = useQuery({
        queryKey: ['artwork', artworkSlug],
        queryFn: () => fetchArtwork(artworkSlug!),
        enabled: !!artworkSlug,
    });

    useEffect(() => {
        if (artwork) {
            addArtwork(artwork as any); // FIX: Call the correct function
        }
    }, [artwork, addArtwork]);

    return (
        <div>
            <h2>{artwork?.title}</h2>
            {/* ... rest of the page */}
        </div>
    );
};

export default IndividualArtworkPage;