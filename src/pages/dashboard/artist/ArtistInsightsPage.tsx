// src/pages/dashboard/artist/ArtistInsightsPage.tsx

import React, { useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useAuth } from '../../../contexts/AuthProvider';
import { supabase } from '../../../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend as PieLegend } from 'recharts';
import { Eye, MessageSquare, DollarSign, Package, TrendingUp } from 'lucide-react';

// --- Data Fetching ---

// Fetches all necessary data in one go
const fetchInsightsData = async (artistId: string) => {
    // 1. Basic engagement stats
    const { count: profileViews } = await supabase.from('profile_views').select('id', { count: 'exact' }).eq('artist_id', artistId);
    const { count: artworkViews } = await supabase.from('artwork_views').select('id', { count: 'exact' }).eq('artist_id', artistId);
    const { count: inquiries } = await supabase.from('conversations').select('id', { count: 'exact' }).eq('artist_id', artistId);

    // 2. Sales data for financial insights
    const { data: salesData, error: salesError } = await supabase
        .from('artworks')
        .select('title, price, medium, location, created_at') // Use a 'sold_at' timestamp if you add one later
        .eq('user_id', artistId)
        .eq('status', 'Sold');
    
    if (salesError) throw salesError;

    return {
        engagement: [
            { name: 'Profile Views', count: profileViews || 0 },
            { name: 'Total Artwork Views', count: artworkViews || 0 },
            { name: 'Total Inquiries', count: inquiries || 0 },
        ],
        sales: salesData || []
    };
};


// --- Helper Components ---

const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <div style={styles.statCard}>
        <div style={styles.statIcon}>{icon}</div>
        <div>
            <h3 style={styles.statValue}>{value}</h3>
            <p style={styles.statTitle}>{title}</p>
        </div>
    </div>
);

const InsightSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div style={styles.insightSection}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {children}
    </div>
);


// --- Main Insights Page ---

const ArtistInsightsPage = () => {
    const { user } = useAuth();
    
    const { data, isLoading } = useQuery({
        queryKey: ['artistInsights', user?.id],
        queryFn: () => fetchInsightsData(user!.id),
        enabled: !!user,
    });

    // --- Memoized Data Processing ---
    const financialKpis = useMemo(() => {
        if (!data?.sales) return { totalRevenue: 0, artworksSold: 0, averagePrice: 0 };
        const artworksSold = data.sales.length;
        const totalRevenue = data.sales.reduce((acc, art) => acc + (art.price || 0), 0);
        const averagePrice = artworksSold > 0 ? totalRevenue / artworksSold : 0;
        return { totalRevenue, artworksSold, averagePrice };
    }, [data]);

    const salesOverTime = useMemo(() => {
        if (!data?.sales) return [];
        const monthlySales: { [key: string]: number } = {};
        data.sales.forEach(sale => {
            const month = new Date(sale.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
            if (!monthlySales[month]) monthlySales[month] = 0;
            monthlySales[month] += sale.price || 0;
        });
        // Format for recharts, and sort by date
        return Object.entries(monthlySales)
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => new Date(a.name) > new Date(b.name) ? 1 : -1);
    }, [data]);
    
    const salesByMedium = useMemo(() => {
        if (!data?.sales) return [];
        const mediumCounts: { [key: string]: number } = {};
        data.sales.forEach(sale => {
            const medium = sale.medium || 'Uncategorized';
            if (!mediumCounts[medium]) mediumCounts[medium] = 0;
            mediumCounts[medium]++;
        });
        return Object.entries(mediumCounts).map(([name, value]) => ({ name, value }));
    }, [data]);


    if (isLoading) return <p>Loading insights...</p>;

    return (
        <div>
            <h1>Your Insights</h1>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>An overview of your audience engagement and sales performance.</p>

            {/* KPI Cards */}
            <div style={styles.kpiGrid}>
                <StatCard title="Total Revenue" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(financialKpis.totalRevenue)} icon={<DollarSign />} />
                <StatCard title="Artworks Sold" value={financialKpis.artworksSold} icon={<Package />} />
                <StatCard title="Average Sale Price" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(financialKpis.averagePrice)} icon={<TrendingUp />} />
            </div>

            <div style={styles.insightsGrid}>
                {/* Sales Trends */}
                <InsightSection title="Sales Trends Over Time">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesOverTime}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)} />
                            <Legend />
                            <Line type="monotone" dataKey="sales" stroke="var(--primary)" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </InsightSection>
                
                {/* Sales by Medium */}
                <InsightSection title="Most In-Demand Mediums">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={salesByMedium} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="var(--primary)">
                                {salesByMedium.map((entry, index) => <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff8042'][index % 4]} />)}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value} sale(s)`} />
                            <PieLegend />
                        </PieChart>
                    </ResponsiveContainer>
                </InsightSection>

                {/* Top Performing Artworks */}
                <InsightSection title="Fastest Selling Artworks (Most Recent)">
                     <div style={{maxHeight: 300, overflowY: 'auto'}}>
                        {data?.sales.slice(0, 5).map(art => (
                            <div key={art.title} style={styles.listItem}>
                                <span>{art.title}</span>
                                <span style={{textAlign: 'right'}}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(art.price || 0)}</span>
                            </div>
                        ))}
                    </div>
                </InsightSection>
                
                {/* Basic Engagement */}
                <InsightSection title="Audience Engagement">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data?.engagement}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="var(--primary)" />
                        </BarChart>
                    </ResponsiveContainer>
                </InsightSection>

                {/* Placeholder for Profitability */}
                <InsightSection title="Profitability (Coming Soon)">
                    <div style={styles.placeholder}>Track income vs. expenses to understand your true profitability per piece and over time. This requires an expense tracking feature.</div>
                </InsightSection>
                
                {/* Placeholder for Contact Insights */}
                <InsightSection title="Collector Insights (Coming Soon)">
                    <div style={styles.placeholder}>Identify repeat collectors and analyze purchasing patterns to build stronger relationships. This requires linking sales to your contact list.</div>
                </InsightSection>
            </div>
        </div>
    );
};

// --- Styles ---
const styles: { [key: string]: React.CSSProperties } = {
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' },
    insightsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' },
    statCard: { display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)' },
    statIcon: { background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '50%', padding: '0.75rem' },
    statValue: { fontSize: '2rem', fontWeight: 'bold', margin: 0 },
    statTitle: { color: 'var(--muted-foreground)', margin: 0 },
    insightSection: { background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)' },
    sectionTitle: { marginTop: 0, marginBottom: '1.5rem' },
    listItem: { display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' },
    placeholder: { color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '150px', textAlign: 'center' }
};

export default ArtistInsightsPage;