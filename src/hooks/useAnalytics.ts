// src/hooks/useAnalytics.ts

import { useQuery } from "@tanstack/react-query";
import { useAuth } from '../contexts/AuthProvider'
import { supabase } from '../lib/supabaseClient';

const fetchArtistAnalytics = async (artistId: string) => {
    // These requests can be run in parallel for better performance
    const [profileViewsRes, artworkViewsRes, inquiriesRes] = await Promise.all([
        supabase.from('profile_views').select('id', { count: 'exact' }).eq('artist_id', artistId),
        supabase.from('artwork_views').select('id', { count: 'exact' }).eq('artist_id', artistId),
        supabase.from('conversations').select('id', { count: 'exact' }).eq('artist_id', artistId)
    ]);

    // Error handling for each request can be added here if needed

    return [
        { name: 'Profile Views', count: profileViewsRes.count || 0 },
        { name: 'Total Artwork Views', count: artworkViewsRes.count || 0 },
        { name: 'Total Inquiries', count: inquiriesRes.count || 0 },
    ];
};

export const useAnalytics = () => {
    const { user } = useAuth();

    // UPDATED SYNTAX: useQuery now takes a single object
    const { data, isLoading } = useQuery({
        // The query key should be an array that uniquely identifies this query
        queryKey: ['artistAnalytics', user?.id],
        // The query function is the async function that fetches the data
        queryFn: () => fetchArtistAnalytics(user!.id),
        // Options like 'enabled' are properties of the same object
        enabled: !!user,
    });

    return { data, isLoading };
};