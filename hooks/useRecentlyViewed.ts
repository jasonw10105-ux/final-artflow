import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
const RECENTLY_VIEWED_KEY = 'recently_viewed_artworks';
const MAX_RECENTLY_VIEWED = 5;

export const useRecentlyViewed = () => {
    const [viewedArtworks, setViewedArtworks] = useState<any[]>([]);

    const addViewedArtwork = useCallback((artworkId: string) => {
        const currentItems: string[] = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
        const newItems = [artworkId, ...currentItems.filter(id => id !== artworkId)].slice(0, MAX_RECENTLY_VIEWED);
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(newItems));
    }, []);

    useEffect(() => {
        const fetchArtworks = async () => {
            const viewedIds = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
            if (viewedIds.length > 0) {
                const { data } = await supabase.from('artworks').select('*, artist:profiles(slug)').in('id', viewedIds);
                setViewedArtworks(data || []);
            }
        };
        fetchArtworks();
    }, []);

    return { recentlyViewedArtworks, addViewedArtwork };
};