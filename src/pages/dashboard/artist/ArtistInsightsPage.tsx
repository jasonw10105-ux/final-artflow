// src/pages/dashboard/artist/ArtistInsightsPage.tsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthProvider';
import { supabase } from '../../../lib/supabaseClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Eye, MessageSquare, DollarSign, Package, TrendingUp, Users } from 'lucide-react';

const fetchArtistInsights = async (artistId: string) => {
  const { data, error } = await supabase.rpc('get_artist_insights', { p_artist_id: artistId });
  if (error) throw error;
  return data;
};

const StatCard = ({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) => (
  <div style={styles.statCard}>
    <div style={styles.statIcon}>{icon}</div>
    <div>
      <h3 style={styles.statValue}>{value}</h3>
      <p style={styles.statTitle}>{title}</p>
    </div>
  </div>
);

const InsightSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={styles.insightSection}>
    <h2 style={styles.sectionTitle}>{title}</h2>
    {children}
  </div>
);

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c'];

const ArtistInsightsPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery(['artistInsights', user?.id], () => fetchArtistInsights(user!.id), {
    enabled: !!user,
  });

  if (isLoading) return <p>Loading insights...</p>;

  const stats = data;

  return (
    <div>
      <h1>Your Insights</h1>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>
        Audience engagement, sales, and collector trends.
      </p>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <StatCard title="Profile Views" value={stats.profile_views} icon={<Eye />} />
        <StatCard title="Artwork Views" value={stats.artwork_views} icon={<Eye />} />
        <StatCard title="Total Inquiries" value={stats.inquiries} icon={<MessageSquare />} />
        <StatCard title="Total Followers" value={stats.followers_count} icon={<Users />} />
        <StatCard
          title="Total Revenue"
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.total_revenue)}
          icon={<DollarSign />}
        />
        <StatCard title="Artworks Sold" value={stats.artworks_sold} icon={<Package />} />
      </div>

      <div style={styles.insightsGrid}>
        {/* Followers Over Time */}
        <InsightSection title="Follower Growth Over Time">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.followers_over_time}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </InsightSection>

        {/* Popular Genres */}
        <InsightSection title="Popular Genres (Sales)">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={stats.popular_genres} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {stats.popular_genres.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </InsightSection>

        {/* Popular Mediums */}
        <InsightSection title="Popular Mediums">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={stats.popular_media} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {stats.popular_media.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </InsightSection>

        {/* Popular Sizes */}
        <InsightSection title="Popular Sizes">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={stats.popular_sizes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {stats.popular_sizes.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </InsightSection>

        {/* Trending Artworks */}
        <InsightSection title="Top Trending Artworks">
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {stats.trending_artworks.map((art: any) => (
              <div key={art.artwork_id} style={styles.listItem}>
                <span>{art.title}</span>
                <span>
                  Views: {art.views}, Inquiries: {art.inquiries}, Sales: {art.sales}, Score: {art.score}, Conversion:{' '}
                  {art.conversion_rate}%
                </span>
              </div>
            ))}
          </div>
        </InsightSection>

        {/* Inquiry-to-View Ratio */}
        <InsightSection title="Inquiry-to-View Ratios">
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {stats.inquiry_to_view.map((item: any) => (
              <div key={item.artwork_title} style={styles.listItem}>
                <span>{item.artwork_title}</span>
                <span>{(item.ratio * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </InsightSection>

        {/* Collector Insights */}
        <InsightSection title="Collector Insights">
          <div style={{ padding: '1rem' }}>
            <p>Total Followers: {stats.collector_stats.total_followers}</p>
            <p>Repeat Collector Ratio: {stats.collector_stats.repeat_ratio}%</p>
          </div>
        </InsightSection>

        {/* Demand Trends */}
        <InsightSection title="Demand Trends by Genre">
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {stats.demand_trends.map((trend: any, index: number) => (
              <div key={index} style={styles.listItem}>
                <span>
                  {trend.month} — {trend.genre}
                </span>
                <span>Views: {trend.views}</span>
              </div>
            ))}
          </div>
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
  sectionTitle: { marginTop: 0, marginBottom: '1rem' },
  listItem: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' },
};

export default ArtistInsightsPage;
