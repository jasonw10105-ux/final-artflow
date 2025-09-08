import React, { useMemo, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useAuth } from '../../../contexts/AuthProvider';
import { supabase } from '../../../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Rectangle } from 'recharts';
import { Eye, MessageSquare, DollarSign, Package, Users, Share2, TrendingUp, TrendingDown, Lightbulb, Zap, Download, Flame, Heart as HeartIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import { ArtistInsightsRPCResult } from '@/types/app-specific.types';
import '@/styles/app.css';

// --- Market Trends Interfaces ---
interface TrendItem { name: string; count: number; }
interface PriceTrendItem { bracket: string; activity_count: number; }
interface MarketTrends {
    top_mediums: TrendItem[];
    top_styles: TrendItem[];
    price_brackets: PriceTrendItem[];
}

// --- Data Fetching ---
const fetchArtistInsights = async (artistId: string): Promise<ArtistInsightsRPCResult> => {
  const { data, error } = await supabase.rpc('artist_insights', { artist_uuid: artistId }).single();
  if (error) {
    console.error("Error fetching artist insights:", error);
    toast.error(`Error fetching insights: ${error.message}`);
    throw error;
  }
  return data as ArtistInsightsRPCResult;
};

const fetchArtistRecommendations = async (artistId: string): Promise<string[]> => {
  const { data, error } = await supabase.rpc('get_artist_recommendations', { artist_uuid: artistId });
  if (error) {
    console.error("Error fetching artist recommendations:", error);
    toast.error(`Error fetching recommendations: ${error.message}`);
    throw error;
  }
  return data as string[];
};

const fetchMarketTrends = async (): Promise<MarketTrends> => {
    const { data, error } = await supabase.rpc('get_collector_market_trends');
    if (error) throw new Error(error.message);
    return data as MarketTrends;
};

// --- Helper Components ---
const StatCard = ({ title, value, icon, trendChange, trend }: { title: string, value: string | number, icon: React.ReactNode, trendChange?: number | null, trend?: 'up' | 'down' | 'neutral' | null }) => (
  <div className="stat-card">
    <div className="stat-icon">{icon}</div>
    <div>
      <h3 className="stat-value">{value}</h3>
      <p className="stat-title">{title}</p>
      {trend !== null && trendChange !== undefined && (
        <span className={`stat-trend ${trend}`}>
          {trendChange > 0 && <TrendingUp size={14} />}
          {trendChange < 0 && <TrendingDown size={14} />}
          {trendChange !== 0 && (
            <span>{trendChange > 0 ? '+' : ''}{trendChange.toFixed(1)}%</span>
          )}
          {trendChange === 0 && ' (No Change)'}
        </span>
    )}
    </div>
  </div>
);

const InsightSection = ({ title, children, description }: { title: string, children: React.ReactNode, description?: string }) => (
  <div className="insight-section">
    <h2 className="section-title">{title}</h2>
    {description && <p className="section-description">{description}</p>}
    {children}
  </div>
);

const LoadingSkeleton = () => (
    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md h-48 w-full"></div>
);

const aggregateByField = (items: any[], field: string) => {
  const map: { [key: string]: number } = {};
  items.forEach(item => {
    const val = item[field] || 'Uncategorized';
    map[val] = (map[val] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
};

const getPieChartColors = (count: number) => {
  const baseColors = ['#6b46c1', '#a78bfa', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57', '#808080', '#c2c2c2'];
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
};

const exportToCsv = (filename: string, rows: string[][]) => {
  const csvContent = rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    document.body.removeChild(link);
    toast.success("Report downloaded successfully!");
  } else {
    toast('Your browser does not support downloading files directly.', { icon: '⚠️' });
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-muted-foreground">{`${payload[0].name}: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const CustomBar = (props: any) => {
  const { x, y, width, height, fill } = props;
  return <Rectangle x={x} y={y} width={width} height={height} fill={fill} radius={[4, 4, 0, 0]} />; // Fixed radius prop
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


// --- Main Page ---
const ArtistInsightsPage = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<'30_days' | '90_days' | '1_year'>('30_days');
  const [activeTab, setActiveTab] = useState<'your_insights' | 'market_trends'>('your_insights'); // NEW: Tab state

  const { data, isLoading, error } = useQuery<ArtistInsightsRPCResult, Error>({
    queryKey: ['artistInsights', user?.id, dateRange],
    queryFn: () => fetchArtistInsights(user!.id),
    enabled: !!user
  });

  const { data: recommendations, isLoading: isLoadingRecommendations } = useQuery<string[], Error>({
    queryKey: ['artistRecommendations', user?.id],
    queryFn: () => fetchArtistRecommendations(user!.id),
    enabled: !!user && !!data
  });

  const { data: trends, isLoading: isLoadingTrends, error: trendsError } = useQuery<MarketTrends, Error>({
    queryKey: ['marketTrends'],
    queryFn: fetchMarketTrends,
  });

  const isLoadingCombined = isLoading || isLoadingRecommendations || isLoadingTrends;
  const hasCombinedError = error || trendsError;

  // --- Memoized Computations for Your Insights ---
  const followersOverTime = useMemo(() => {
    if (!data?.followers || data.followers.length === 0) return [];
    const map: { [monthYear: string]: number } = {};
    data.followers.forEach((f: any) => {
      const date = new Date(f.created_at);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const monthYearKey = `${month}-${year}`;
      map[monthYearKey] = (map[monthYearKey] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        const dateA = new Date(a.name.replace('-', ' 1, ') + ' 1');
        const dateB = new Date(b.name.replace('-', ' 1, ') + ' 1');
        return dateA.getTime() - dateB.getTime();
      });
  }, [data]);

  const repeatCollectorRatio = useMemo(() => {
    if (!data?.collectorStats) return 0;
    const repeat = data.collectorStats.filter((c: any) => c.purchases > 1).length;
    const total = data.collectorStats.length;
    return total > 0 ? (repeat / total) * 100 : 0;
  }, [data]);

  const totalShares = useMemo(() => {
    if (!data?.shares) return 0;
    return data.shares.length || 0;
  }, [data]);

  const formattedTotalRevenue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    data?.sales?.reduce((acc: number, s: any) => acc + (s.sale_price ?? 0), 0) || 0
  );

  const popularGenresData = aggregateByField(data?.sales || [], 'genre');
  const pieColors = getPieChartColors(popularGenresData.length);

  const periodComparisonData = useMemo(() => {
    if (!data) return [];
    const currentRevenue = data.sales?.reduce((acc: number, s: any) => acc + (s.sale_price ?? 0), 0) || 0;
    const currentProfileViews = data.profileViews || 0;
    const currentArtworkViews = data.artworkViews || 0;
    const currentFollowers = data.followers?.length || 0;
    const currentSalesCount = data.sales?.length || 0;
    const metrics = [
      { title: 'Total Revenue', current: currentRevenue, previous: data.previousTotalRevenue || 0 },
      { title: 'Profile Views', current: currentProfileViews, previous: data.previousProfileViews || 0 },
      { title: 'Artwork Views', current: currentArtworkViews, previous: data.previousArtworkViews || 0 },
      { title: 'Total Followers', current: currentFollowers, previous: data.previousFollowersCount || 0 },
      { title: 'Artworks Sold', current: currentSalesCount, previous: data.previousSalesCount || 0 },
      { title: 'Total Inquiries', current: data.inquiries || 0, previous: data.previousInquiries || 0 }
    ];
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) {
        return { value: current, change: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'neutral' };
      }
      const change = ((current - previous) / previous) * 100;
      return {
        value: current,
        change: parseFloat(change.toFixed(1)),
        trend: change > 0 ? 'up' : (change < 0 ? 'down' : 'neutral')
      };
    };
    return metrics.map(m => ({
        title: m.title,
        ...calculateTrend(m.current, m.previous)
    }));
  }, [data]);

  const engagementFunnelData = useMemo(() => {
    if (!data) return [];
    const profileViews = data.profileViews || 0;
    const artworkViews = data.artworkViews || 0;
    const inquiries = data.inquiries || 0;
    const sales = data.sales?.length || 0;
    return [
      { name: 'Profile Views', value: Math.max(0, profileViews) },
      { name: 'Artwork Views', value: Math.max(0, artworkViews) },
      { name: 'Inquiries', value: Math.max(0, inquiries) },
      { name: 'Sales', value: Math.max(0, sales) },
    ];
  }, [data]);


  // --- Exportable Reports Logic (Combined) ---
  const handleExportReport = () => {
    if (!data && !trends) {
      toast('No data available to export.', { icon: '⚠️' });
      return;
    }

    const rows: string[][] = [];

    // Your Insights
    if (data) {
        rows.push(['--- Your Insights ---']);
        rows.push(['Metric', 'Value']);
        rows.push(['Profile Views (Current Period)', (data.profileViews || 0).toString()]);
        rows.push(['Profile Views (Previous Period)', (data.previousProfileViews || 0).toString()]);
        rows.push(['Artwork Views (Current Period)', (data.artworkViews || 0).toString()]);
        rows.push(['Artwork Views (Previous Period)', (data.previousArtworkViews || 0).toString()]);
        rows.push(['Total Inquiries (Current Period)', (data.inquiries || 0).toString()]);
        rows.push(['Total Inquiries (Previous Period)', (data.previousInquiries || 0).toString()]);
        rows.push(['Total Followers (Overall)', (data.followers?.length || 0).toString()]);
        rows.push(['Total Followers (Previous Period)', (data.previousFollowersCount || 0).toString()]);
        rows.push(['Total Revenue (USD, Current Period)', (data.sales?.reduce((acc: number, s: any) => acc + (s.sale_price ?? 0), 0) || 0).toString()]);
        rows.push(['Total Revenue (USD, Previous Period)', (data.previousTotalRevenue || 0).toString()]);
        rows.push(['Artworks Sold (Current Period)', (data.sales?.length || 0).toString()]);
        rows.push(['Artworks Sold (Previous Period)', (data.previousSalesCount || 0).toString()]);
        rows.push(['Total Shares (Overall)', totalShares.toString()]);
        rows.push(['Repeat Collector Ratio (%)', repeatCollectorRatio.toFixed(1)]);

        // Detailed sales data
        rows.push([]);
        rows.push(['Sales Details (All Time)']);
        rows.push(['Sale ID', 'Artwork ID', 'Collector ID', 'Sale Price', 'Sale Date', 'Genre']);
        data.sales?.forEach((sale: any) => {
            rows.push([
                sale.id,
                sale.artwork_id,
                sale.collector_id,
                sale.sale_price.toString(),
                sale.sale_date,
                sale.genre || 'N/A'
            ]);
        });

        // Trending artworks
        rows.push([]);
        rows.push(['Trending Artworks']);
        rows.push(['Artwork ID', 'Title', 'Engagement Score']);
        data.trendingArtworks?.forEach((art: any) => {
            rows.push([
                art.id,
                art.title,
                art.score.toString()
            ]);
        });

        // Recommendations
        if (recommendations && recommendations.length > 0) {
            rows.push([]);
            rows.push(['AI Recommendations']);
            recommendations.forEach((rec: string) => {
                rows.push([rec]);
            });
        }
    }

    // Market Trends
    if (trends) {
        rows.push([]);
        rows.push(['--- Market Trends ---']);
        if (trends.top_mediums && trends.top_mediums.length > 0) {
            rows.push([]);
            rows.push(['Top Searched Mediums']);
            trends.top_mediums.forEach(item => rows.push([item.name, item.count.toString()]));
        }
        if (trends.top_styles && trends.top_styles.length > 0) {
            rows.push([]);
            rows.push(['Top Liked Styles']);
            trends.top_styles.forEach(item => rows.push([item.name, item.count.toString()]));
        }
        if (trends.price_brackets && trends.price_brackets.length > 0) {
            rows.push([]);
            rows.push(['Most Active Price Brackets']);
            trends.price_brackets.forEach(item => rows.push([item.bracket, item.activity_count.toString()]));
        }
    }

    exportToCsv('artist_insights_report.csv', rows);
  };

  if (isLoadingCombined) return (
    <div className="page-container">
      <h1>Your Insights</h1>
      <p className="page-subtitle">Audience engagement, sales, and sharing overview.</p>
      <div className="kpi-grid">
        {[...Array(8)].map((_, i) => <LoadingSkeleton key={i} />)}
      </div>
      <div className="insights-grid">
        {[...Array(6)].map((_, i) => <LoadingSkeleton key={i} />)}
      </div>
      <p className="loading-message mt-8">Loading insights...</p>
    </div>
  );

  if (hasCombinedError) return (
    <p className="empty-state-message text-red-500">Error loading insights: {hasCombinedError?.message}</p>
  );

  if (!data && !trends) return ( // If no data for either, show empty state
    <p className="empty-state-message">We're still gathering data for your profile and market trends. Check back soon!</p>
  );

  return (
    <div className="page-container">
      <h1>Your Insights</h1>
      <p className="page-subtitle">Audience engagement, sales, and sharing overview.</p>

      {/* NEW: Tabs for Insights and Market Trends */}
      <div className="tabs-container mb-6">
        <button
          className={`tab-button ${activeTab === 'your_insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('your_insights')}
        >
          Your Performance
        </button>
        <button
          className={`tab-button ${activeTab === 'market_trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('market_trends')}
        >
          Market Trends
        </button>
      </div>

      {activeTab === 'your_insights' && data && (
        <>
            {/* Date Range Selector */}
            <div className="flex justify-end mb-6">
                <select
                className="select"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as '30_days' | '90_days' | '1_year')}
                >
                <option value="30_days">Last 30 Days</option>
                <option value="90_days">Last 90 Days</option>
                <option value="1_year">Last Year</option>
                </select>
            </div>

            <div className="kpi-grid">
                <StatCard title="Profile Views" value={data.profileViews || 0} icon={<Eye />}
                    trendChange={periodComparisonData.find(m => m.title === 'Profile Views')?.change}
                    trend={periodComparisonData.find(m => m.title === 'Profile Views')?.trend} />
                <StatCard title="Artwork Views" value={data.artworkViews || 0} icon={<Eye />}
                    trendChange={periodComparisonData.find(m => m.title === 'Artwork Views')?.change}
                    trend={periodComparisonData.find(m => m.title === 'Artwork Views')?.trend} />
                <StatCard title="Total Inquiries" value={data.inquiries || 0} icon={<MessageSquare />}
                    trendChange={periodComparisonData.find(m => m.title === 'Total Inquiries')?.change}
                    trend={periodComparisonData.find(m => m.title === 'Total Inquiries')?.trend} />
                <StatCard title="Total Followers" value={data.followers?.length || 0} icon={<Users />}
                    trendChange={periodComparisonData.find(m => m.title === 'Total Followers')?.change}
                    trend={periodComparisonData.find(m => m.title === 'Total Followers')?.trend} />
                <StatCard title="Total Revenue" value={formattedTotalRevenue} icon={<DollarSign />}
                    trendChange={periodComparisonData.find(m => m.title === 'Total Revenue')?.change}
                    trend={periodComparisonData.find(m => m.title === 'Total Revenue')?.trend} />
                <StatCard title="Artworks Sold" value={data.sales?.length || 0} icon={<Package />}
                    trendChange={periodComparisonData.find(m => m.title === 'Artworks Sold')?.change}
                    trend={periodComparisonData.find(m => m.title === 'Artworks Sold')?.trend} />
                <StatCard title="Total Shares" value={totalShares} icon={<Share2 />} trend={null} />
                <StatCard title="Repeat Collector Ratio" value={`${repeatCollectorRatio.toFixed(1)}%`} icon={<Users />} trend={null} />
            </div>

            <div className="insights-grid">
                <InsightSection title="Follower Growth Over Time">
                {followersOverTime.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={followersOverTime}>
                        <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
                        <XAxis dataKey="name" className="chart-axis-text" />
                        <YAxis className="chart-axis-text" />
                        <Tooltip cursor={{ fill: 'var(--accent)' }} content={CustomTooltip} />
                        <Bar dataKey="count" fill="var(--primary)" shape={<CustomBar />} />
                    </BarChart>
                    </ResponsiveContainer>
                ) : <p className="empty-chart-message">No follower data yet.</p>}
                </InsightSection>

                <InsightSection title="Top Trending Artworks" description="Artworks with the most engagement (views, inquiries, shares).">
                {data.trendingArtworks?.length > 0 ? (
                    <ul className="trending-artworks-list">
                    {data.trendingArtworks.map((art: any) => (
                        <li key={art.id}>{art.title} <span className="text-muted-foreground">(Score: {art.score})</span></li>
                    ))}
                    </ul>
                ) : <p className="empty-chart-message">Trending data not available yet.</p>}
                </InsightSection>

                <InsightSection title="Repeat Collectors" description="Percentage of collectors who have purchased more than one artwork.">
                {data.collectorStats?.length > 0 ? (
                    <p className="text-lg">{repeatCollectorRatio.toFixed(1)}% of collectors have purchased more than once.</p>
                ) : <p className="empty-chart-message">Collector data not available yet.</p>}
                </InsightSection>

                <InsightSection title="Popular Genres (Sales)" description="Breakdown of genres based on artwork sales.">
                {popularGenresData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie
                        data={popularGenresData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                        {popularGenresData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index]} />
                        ))}
                        </Pie>
                        <Tooltip content={CustomTooltip} />
                    </PieChart>
                    </ResponsiveContainer>
                ) : <p className="empty-chart-message">No sales data yet to analyze genres.</p>}
                </InsightSection>

                <InsightSection title="Period-over-Period Comparison" description="Compare key metrics against the previous period (e.g., last 30 days vs. previous 30 days).">
                {periodComparisonData.length > 0 && periodComparisonData.some(item => item.change !== 0) ? (
                    <ul className="comparison-list">
                    {periodComparisonData.map((item, index) => (
                        <li key={index} className="comparison-item">
                        <span>{item.title}:</span>
                        <span className={`comparison-value ${item.trend === 'up' ? 'text-green-500' : item.trend === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
                            {item.change}% {item.trend === 'up' && <TrendingUp size={16} />}
                            {item.trend === 'down' && <TrendingDown size={16} />}
                            {item.change === 0 && <span className="text-gray-500"> (No Change)</span>}
                        </span>
                        </li>
                    ))}
                    </ul>
                ) : (
                    <p className="empty-chart-message">Not enough historical data available for comparison or no significant changes.</p>
                )}
                </InsightSection>

                <InsightSection title="Engagement Funnel" description="Visualize the journey from profile views to sales.">
                {engagementFunnelData.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={engagementFunnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
                        <XAxis type="number" className="chart-axis-text" />
                        <YAxis dataKey="name" type="category" className="chart-axis-text" />
                        <Tooltip cursor={{ fill: 'var(--accent)' }} content={CustomTooltip} />
                        <Bar dataKey="value" fill="var(--primary)" barSize={40} shape={<CustomBar />} />
                    </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="empty-chart-message">Not enough data to build the engagement funnel.</p>
                )}
                </InsightSection>

                <InsightSection title="AI-Driven Recommendations" description="Actionable suggestions to boost your engagement and sales.">
                {isLoadingRecommendations ? (
                    <p className="loading-message">Generating recommendations...</p>
                ) : recommendations && recommendations.length > 0 ? (
                    <ul className="ai-recommendations-list">
                    {recommendations.map((rec, index) => (
                        <li key={index} className="ai-recommendation-item">
                        <Zap size={16} className="inline-block mr-2 text-primary" /> {rec}
                        </li>
                    ))}
                    </ul>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Lightbulb size={36} className="mb-2" />
                    <p>No specific recommendations at this time. Keep up the great work!</p>
                    </div>
                )}
                </InsightSection>
            </div>
        </>
      )}

      {activeTab === 'market_trends' && trends && (
        <>
            <p className="page-subtitle">Proprietary insights based on collector activity across the platform in the last 30 days.</p>
            <div className="kpi-grid mt-8">
                <TrendCard title="Top Searched Mediums" data={trends?.top_mediums || []} icon={<Flame />} />
                <TrendCard title="Top Liked Styles" data={trends?.top_styles || []} icon={<HeartIcon />} />
                <TrendCard title="Most Active Price Brackets" data={trends?.price_brackets || []} icon={<TrendingUp />} />
            </div>
        </>
      )}

      {/* Exportable Reports - Remains outside tabs, applies to all data */}
      <InsightSection title="Exportable Reports" description="Download your insights for deeper analysis.">
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Download size={36} className="mb-2" />
          <p>Click below to download a CSV report of your current insights.</p>
          <button
            onClick={handleExportReport}
            className="button button-secondary mt-4"
            disabled={!data && !trends}
          >
            <Download size={16} className="inline-block mr-2" /> Generate Report (CSV)
          </button>
        </div>
      </InsightSection>

    </div>
  );
};

export default ArtistInsightsPage;