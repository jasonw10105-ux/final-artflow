// src/pages/dashboard/artist/ArtistInsightsPage.tsx
import React, { useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useAuth } from '../../../contexts/AuthProvider';
import { supabase } from '../../../lib/supabaseClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Eye, MessageSquare, DollarSign, Package, Users, Share2, TrendingUp } from 'lucide-react';

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

const InsightSection = ({ title, children, suggestion }: { title: string, children: React.ReactNode, suggestion?: string }) => (
  <div style={styles.insightSection}>
    <h2 style={styles.sectionTitle}>{title}</h2>
    {suggestion && <p style={{ fontStyle: 'italic', color: 'var(--muted-foreground)' }}>{suggestion}</p>}
    {children}
  </div>
);

// --- Main Page ---
const ArtistInsightsPage = () => {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['artistInsights', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc('get_artist_insights_full', { artist_uuid: user.id });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  if (isLoading) return <p>Loading insights...</p>;
  if (error) return <p>Error loading insights: {(error as any).message}</p>;
  if (!data) return <p>No data available.</p>;

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28'];

  // --- Derived Metrics ---
  const repeatCollectorRatio = data.total_followers ? (data.repeat_collectors_count / data.total_followers) : 0;
  const totalShares = Object.values(data.shares_by_platform || {}).reduce((a,b)=>a+b,0);

  return (
    <div>
      <h1>Your Insights</h1>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Audience engagement, sales, collector trends, and sharing overview.</p>

      {/* KPI Grid */}
      <div style={styles.kpiGrid}>
        <StatCard title="Profile Views" value={data.profile_views} icon={<Eye />} />
        <StatCard title="Artwork Views" value={data.artwork_views} icon={<Eye />} />
        <StatCard title="Total Inquiries" value={data.total_inquiries} icon={<MessageSquare />} />
        <StatCard title="Total Followers" value={data.total_followers} icon={<Users />} />
        <StatCard title="Total Revenue" value={new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(data.total_revenue)} icon={<DollarSign />} />
        <StatCard title="Artworks Sold" value={data.total_sales} icon={<Package />} />
        <StatCard title="Repeat Collectors" value={data.repeat_collectors_count} icon={<TrendingUp />} />
        <StatCard title="Shares" value={totalShares} icon={<Share2 />} />
        <StatCard title="Repeat Collector Ratio" value={`${(repeatCollectorRatio*100).toFixed(1)}%`} icon={<Users />} />
      </div>

      {/* Insights Grid */}
      <div style={styles.insightsGrid}>
        {/* Follower Growth */}
        <InsightSection title="Follower Growth Over Time" suggestion="Track which months gain the most followers. Focus engagement efforts there.">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.followers_over_time}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </InsightSection>

        {/* Trending Artworks */}
        <InsightSection title="Top Trending Artworks" suggestion="Focus promotion on artworks with high combined engagement (views, inquiries, sales, shares).">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.top_trending}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </InsightSection>

        {/* Demand Trends */}
        <InsightSection title="Demand Trends by Genre / Medium" suggestion="Consider producing more works in trending genres or media.">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.demand_trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="monthly_views" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </InsightSection>

        {/* Shares by Platform */}
        <InsightSection title="Shares by Platform" suggestion="Promote artworks on the platforms your audience shares the most.">
          <PieChart width={300} height={300}>
            <Pie
              data={Object.entries(data.shares_by_platform || {}).map(([platform, count])=>({ name: platform, value: count }))}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
            >
              {Object.entries(data.shares_by_platform || {}).map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </InsightSection>

        {/* Conversion Rates */}
        <InsightSection title="Inquiry → Sales Conversion" suggestion="Identify artworks that generate inquiries but no sales and adjust pricing or promotion.">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.conversion_rates}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="artwork_id" />
              <YAxis />
              <Tooltip formatter={(value:number) => `${(value*100).toFixed(1)}%`} />
              <Bar dataKey="conversion_rate" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </InsightSection>

        {/* Engagement per Artwork */}
        <InsightSection title="Engagement per Artwork" suggestion="See which artworks convert interest into inquiries and sales. Promote high-converting artworks more.">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.artwork_engagement}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="views" stackId="a" fill="#8884d8" />
              <Bar dataKey="inquiries" stackId="a" fill="#82ca9d" />
              <Bar dataKey="sales" stackId="a" fill="#ffc658" />
              <Bar dataKey="shares" stackId="a" fill="#ff8042" />
            </BarChart>
          </ResponsiveContainer>
        </InsightSection>
      </div>
    </div>
  );
};

// --- Styles ---
const styles: { [key: string]: React.CSSProperties } = {
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  insightsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' },
  statCard: { display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card)', padding: '1rem', borderRadius: 'var(--radius)' },
  statIcon: { background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '50%', padding: '0.5rem' },
  statValue: { fontSize: '1.5rem', fontWeight: 'bold', margin: 0 },
  statTitle: { color: 'var(--muted-foreground)', margin: 0 },
  insightSection: { background: 'var(--card)', padding: '1rem', borderRadius: 'var(--radius)' },
  sectionTitle: { marginTop: 0, marginBottom: '1rem' }
};

export default ArtistInsightsPage;
