import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';

// Define the structure of an analytics data point
interface AnalyticsDataPoint {
  name: string; // e.g., 'Jan 01' (formatted date)
  count: number; // The number of events for that date
}

// Hook to fetch analytics data directly from Supabase
const useAnalytics = () => {
    const { user } = useAuth();
    const { data, isPending, error } = useQuery<AnalyticsDataPoint[], Error>({ // UPDATED: isLoading to isPending
        queryKey: ['dashboardAnalytics', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];

            // Example: Fetch daily artwork views for the last 30 days
            const { data: analyticsData, error: fetchError } = await supabase
                .from('analytics_events')
                .select('event_date, count(id) as count_id') // Renamed count to count_id to avoid conflict with `count` in PostgrestFilterBuilder
                .eq('user_id', user.id) // Filter by the artist's own events
                .eq('event_name', 'artwork_view') // Only count artwork views for simplicity
                .gte('event_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 30 days, ensure date format
                .groupBy('event_date') // UPDATED: .group to .groupBy
                .order('event_date', { ascending: true });

            if (fetchError) throw fetchError;

            // Map results to the expected format
            return analyticsData.map((item: { event_date: string; count_id: number }) => ({ // UPDATED: item type
                name: new Date(item.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), // Format date for display
                count: item.count_id || 0 // Use count_id
            })) as AnalyticsDataPoint[];
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
    });

    return { data, isPending, error }; // UPDATED: isLoading to isPending
};


const AnalyticsChart = () => {
    const { data, isPending, error } = useAnalytics(); // UPDATED: isLoading to isPending

    if (isPending) return <p className="loading-message">Loading analytics...</p>; // UPDATED: isLoading to isPending
    if (error) return <p className="error-message">Error loading analytics: {error.message}</p>;
    if (!data || data.length === 0) return <p className="empty-state-message">No analytics data available for display.</p>;

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                    <Legend />
                    <Bar dataKey="count" fill="var(--primary)" name="Artwork Views" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
export default AnalyticsChart;