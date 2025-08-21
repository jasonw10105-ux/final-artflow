import { useQuery } from "@tanstack/react-query";
import { useAuth } from '../contexts/AuthProvider';
import { supabase } from '../lib/supabaseClient';

const fetchArtistAnalytics = async (artistId: string) => {
    const { data: views } = await supabase.from('profile_views').select('viewed_at', { count: 'exact' }).eq('artist_id', artistId);
    const { data: inquiries } = await supabase.from('conversations').select('created_at', { count: 'exact' }).eq('artist_id', artistId);
    
    // In a real app, you would query a 'sales' table.
    const chartData = [
        { name: 'Profile Views', value: views?.length || 0 },
        { name: 'Total Inquiries', value: inquiries?.length || 0 },
        { name: 'Total Sales', value: 0 }, // Placeholder
    ];
    return chartData;
};

export const useAnalytics = () => {
    const { user } = useAuth();
    const { data, isLoading } = useQuery(['artistAnalytics', user?.id], () => fetchArtistAnalytics(user!.id), {
        enabled: !!user,
    });

    return { data, isLoading };
};