// src/pages/dashboard/artist/MarketTrendsPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { BarChart, Flame, TrendingUp } from 'lucide-react';
import '@/styles/app.css';

interface TrendItem { name: string; count: number; }
interface PriceTrendItem { bracket: string; activity_count: number; }
interface MarketTrends {
    top_mediums: TrendItem[];
    top_styles: TrendItem[];
    price_brackets: PriceTrendItem[];
}

const fetchMarketTrends = async (): Promise<MarketTrends> => {
    const { data, error } = await supabase.rpc('get_collector_market_trends');
    if (error) throw new Error(error.message);
    return data;
};

const TrendCard = ({ title, data, icon }: { title: string; data: any[]; icon: React.ReactNode }) => (
    <div className="stat-card p-6">
        <div className="stat-icon-secondary">{icon}</div>
        <div>
            <h3 className="stat-title mb-4">{title}</h3>
            <ul className="space-y-2">
                {data.map((item, index) => (
                    <li key={index} className="flex justify-between items-center">
                        <span className="font-medium">{item.name || item.bracket}</span>
                        <span className="text-muted-foreground text-sm">{item.count || item.activity_count} engagements</span>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

const MarketTrendsPage = () => {
    const { data: trends, isLoading, error } = useQuery<MarketTrends, Error>({
        queryKey: ['marketTrends'],
        queryFn: fetchMarketTrends,
    });

    if (isLoading) return <div className="page-container"><p className="loading-message">Analyzing market data...</p></div>;
    if (error) return <div className="page-container"><p className="error-message">Error: {error.message}</p></div>;

    return (
        <div className="page-container">
            <h1>Collector Market Trends</h1>
            <p className="page-subtitle">Proprietary insights based on collector activity across the platform in the last 30 days.</p>
            <div className="kpi-grid mt-8">
                <TrendCard title="Top Searched Mediums" data={trends?.top_mediums || []} icon={<Flame />} />
                <TrendCard title="Top Liked Styles" data={trends?.top_styles || []} icon={<Heart />} />
                <TrendCard title="Most Active Price Brackets" data={trends?.price_brackets || []} icon={<TrendingUp />} />
            </div>
        </div>
    );
};

export default MarketTrendsPage;