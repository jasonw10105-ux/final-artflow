import { supabase } from '../lib/supabaseClient';

export const fetchArtistAnalytics = async (artistId: string) => {
    const { count: profileViews } = await supabase.from('profile_views').select('id', { count: 'exact' }).eq('artist_id', artistId);
    const { count: artworkViews } = await supabase.from('artwork_views').select('id', { count: 'exact' }).eq('artist_id', artistId);
    const { count: inquiries } = await supabase.from('conversations').select('id', { count: 'exact' }).eq('artist_id', artistId);
    
    return [
        { name: 'Profile Views', count: profileViews || 0 },
        { name: 'Total Artwork Views', count: artworkViews || 0 },
        { name: 'Total Inquiries', count: inquiries || 0 },
    ];
};
