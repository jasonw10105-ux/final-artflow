// src/pages/dashboard/artist/ArtistInsightsPage.tsx
import React, { useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useAuth } from '../../../contexts/AuthProvider';
import { supabase } from '../../../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Eye, MessageSquare, DollarSign, Package, Users, Share2 } from 'lucide-react';

// --- Data Fetching ---
const fetchArtistInsights = async (artistId: string) => {
  const { data, error } = await supabase.rpc('artist_insights', { artist_uuid: artistId }).single();
  if (error) throw error;
  return data;
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

// --- Main Page ---
const ArtistInsightsPage = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['artistInsights', user?.id],
    queryFn: () => fetchArtistInsights(user!.id),
    enabled: !!user
  });

  // --- Memoized Computations ---
  const followersOverTime = useMemo(() => {
    if (!data?.followers || data.followers.length === 0) return [];
    const map: { [month: string]: number } = {};
    data.followers.forEach((f: any) => {
      const month = new Date(f.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
      map[month] = (map[month] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => new Date(a.name) > new Date(b.name) ? 1 : -1);
  }, [data]);

  const repeatCollectorRatio = useMemo(() => {
    if (!data?.collectorStats) return 0;
    const repeat = data.collectorStats.filter((c: any) => c.purchases > 1).length;
    const total = data.collectorStats.length;
    return total > 0 ? (repeat / total) * 100 : 0;
  }, [data]);

  const totalShares = useMemo(() => {
    if (!data?.shares) return 0;
    return data.shares.reduce((acc: number, s: any) => acc + s.count, 0);
  }, [data]);

  if (isLoading) return <p>Loading insights...</p>;

  if (!data || Object.keys(data).length < 1) return (
    <p>We're still gathering data for your profile. Check back soon!</p>
  );

  return (
    <div>
      <h1>Your Insights</h1>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Audience engagement, sales, and sharing overview.</p>

      <div style={styles.kpiGrid}>
        <StatCard title="Profile Views" value={data.profileViews || 0} icon={<Eye />} />
        <StatCard title="Artwork Views" value={data.artworkViews || 0} icon={<Eye />} />
        <StatCard title="Total Inquiries" value={data.inquiries || 0} icon={<MessageSquare />} />
        <StatCard title="Total Followers" value={data.followers?.length || 0} icon={<Users />} />
        <StatCard title="Total Revenue" value={data.sales?.reduce((acc: number, s: any) => acc + (s.price || 0), 0) || 0} icon={<DollarSign />} />
        <StatCard title="Artworks Sold" value={data.sales?.length || 0} icon={<Package />} />
        <StatCard title="Total Shares" value={totalShares} icon={<Share2 />} />
        <StatCard title="Repeat Collector Ratio" value={`${repeatCollectorRatio.toFixed(1)}%`} icon={<Users />} />
      </div>

      <div style={styles.insightsGrid}>
        {/* Followers Over Time */}
        <InsightSection title="Follower Growth Over Time">
          {followersOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={followersOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p>No follower data yet.</p>}
        </InsightSection>

        {/* Top Trending Artworks */}
        <InsightSection title="Top Trending Artworks">
          {data.trendingArtworks?.length > 0 ? (
            <ul>
              {data.trendingArtworks.map((art: any) => (
                <li key={art.id}>{art.title} (Score: {art.score})</li>
              ))}
            </ul>
          ) : <p>Trending data not available yet.</p>}
        </InsightSection>

        {/* Repeat Collector Stats */}
        <InsightSection title="Repeat Collectors">
          {data.collectorStats?.length > 0 ? (
            <p>{repeatCollectorRatio.toFixed(1)}% of collectors have purchased more than once.</p>
          ) : <p>Collector data not available yet.</p>}
        </InsightSection>

        {/* Popular Genres */}
        <InsightSection title="Popular Genres (Sales)">
          {data.sales?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={aggregateByField(data.sales, 'genre')}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  {aggregateByField(data.sales, 'genre').map((entry, index) => (
                    <Cell key={index} fill={['#8884d8','#82ca9d','#ffc658','#ff8042'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p>No sales data yet.</p>}
        </InsightSection>

      </div>
    </div>
  );
};

// --- Utility to aggregate sales by a field ---
const aggregateByField = (items: any[], field: string) => {
  const map: { [key: string]: number } = {};
  items.forEach(item => {
    const val = item[field] || 'Uncategorized';
    map[val] = (map[val] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
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
