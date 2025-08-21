// src/pages/dashboard/artist/ArtistInsightsPage.tsx

import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { useAuth } from '../../../contexts/AuthProvider';
import { supabase } from '../../../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const fetchInsightsData = async (artistId: string) => {
    const { count: profileViews } = await supabase.from('profile_views').select('id', { count: 'exact' }).eq('artist_id', artistId);
    const { count: artworkViews } = await supabase.from('artwork_views').select('id', { count: 'exact' }).eq('artist_id', artistId);
    const { count: inquiries } = await supabase.from('conversations').select('id', { count: 'exact' }).eq('artist_id', artistId);
    
    return [
        { name: 'Profile Views', count: profileViews || 0 },
        { name: 'Total Artwork Views', count: artworkViews || 0 },
        { name: 'Total Inquiries', count: inquiries || 0 },
    ];
};

const ArtistInsightsPage = () => {
    const { user } = useAuth();
    // FIXED: Switched to the object syntax for useQuery
    const { data, isLoading } = useQuery({
        queryKey: ['insights', user?.id],
        queryFn: () => fetchInsightsData(user!.id),
        enabled: !!user,
    });

    if (isLoading) return <p>Loading insights...</p>;

    return (
        <div>
            <h1>Your Insights</h1>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>An overview of your audience engagement across the platform.</p>
            <div style={{ background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                            <YAxis stroke="var(--muted-foreground)" />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                            <Legend />
                            <Bar dataKey="count" fill="var(--primary)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
export default ArtistInsightsPage;