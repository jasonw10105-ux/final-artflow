// src/pages/dashboard/artist/ArtistInsightsPage.tsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthProvider';
import { supabase } from '../../../lib/supabaseClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Eye, MessageSquare, DollarSign, Package, Users, TrendingUp } from 'lucide-react';

// --- Data Fetching ---
const fetchArtistInsights = async (artistId: string) => {
  // Engagement counts
  const { count: profileViews } = await supabase
    .from('profile_views')
    .select('id', { count: 'exact' })
    .eq('artist_id', artistId);

  const { count: artworkViews } = await supabase
    .from('artwork_views')
    .select('id', { count: 'exact' })
    .eq('artwork_id', artistId); // or join later if needed

  const { count: inquiries } = await supabase
    .from('conversations')
    .select('id', { count: 'exact' })
    .eq('artist_id', artistId);

  // Followers
  const { data: followersData } = await supabase
    .from('artist_follows')
    .select('created_at');

  // Sales
  const { data: salesData } = await supabase
    .from('artworks')
    .select('id, title, price, medium, genre, dimensions, created_at')
    .eq('user_id', artistId)
    .eq('status', 'Sold');

  // Collectors (unique collectors who bought artworks)
  const collectorIds = salesData?.map(s => s.id) || [];
  const uniqueCollectors = [...new Set(collectorIds)];

  // Trending artworks: top 5 by views
  const { data: artworkViewData } = await supabase
    .from('artwork_views')
    .select('artwork_id, count:artwork_id')
    .in('artwork_id', collectorIds)
    .group('artwork_id')
    .order('count', { ascending: false })
    .limit(5);

  return { profileViews, artworkViews, inquiries, followersData, salesData, uniqueCollectors, artworkViewData };
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

// --- Main Component ---
const ArtistInsightsPage = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['artistInsights', user?.id],
    queryFn: () => fetchArtistInsights(user!.id),
    enabled: !!user
  });

  // --- Memoized Calculations ---
  const followersOverTime = useMemo(() => {
    if (!data?.followersData) return [];
    const map: { [month: string]: number } = {};
    data.followersData.forEach(f => {
      const month = new Date(f.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
      map[month] = (map[month] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => new Date(a.name) > new Date(b.name) ? 1 : -1);
  }, [data]);

  const salesStats = useMemo(() => {
    if (!data?.salesData) return { totalRevenue: 0, artworksSold: 0, popularGenres: [], popularMediums: [], popularSizes: [] };
    const totalRevenue = data.salesData.reduce((acc, art) => acc + (art.price || 0), 0);
    const artworksSold = data.salesData.length;

    const genreCounts: { [key: string]: number } = {};
    const mediumCounts: { [key: string]: number } = {};
    const sizeCounts: { [key: string]: number } = {};

    data.salesData.forEach(art => {
      const genre = art.genre || 'Uncategorized';
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;

      const medium = art.medium || 'Uncategorized';
      mediumCounts[medium] = (mediumCounts[medium] || 0) + 1;

      const size = art.dimensions?.height && art.dimensions?.width
        ? `${art.dimensions.width}x${art.dimensions.height}`
        : 'Unknown';
      sizeCounts[size] = (sizeCounts[size] || 0) + 1;
    });

    return {
      totalRevenue,
      artworksSold,
      popularGenres: Object.entries(genreCounts).map(([name, value]) => ({ name, value })),
      popularMediums: Object.entries(mediumCounts).map(([name, value]) => ({ name, value })),
      popularSizes: Object.entries(sizeCounts).map(([name, value]) => ({ name, value }))
    };
  }, [data]);

  if (isLoading) return <p>Loading insights...</p>;

  return (
    <div>
      <h1>Your Insights</h1>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Audience engagement, sales, and trending overview.</p>

      <div style={styles.kpiGrid}>
        <StatCard title="Profile Views" value={data?.profileViews || 0} icon={<Eye />} />
        <StatCard title="Artwork Views" value={data?.artworkViews || 0} icon={<Eye />} />
        <StatCard title="Inquiries" value={data?.inquiries || 0} icon={<MessageSquare />} />
        <StatCard title="Followers" value={data?.followersData?.length || 0} icon={<Users />} />
        <StatCard title="Revenue" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(salesStats.totalRevenue)} icon={<DollarSign />} />
        <StatCard title="Artworks Sold" value={salesStats.artworksSold} icon={<Package />} />
      </div>

      <div style={styles.insightsGrid}>
        {/* Followers Over Time */}
        <InsightSection title="Follower Growth Over Time">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={followersOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
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
              <Pie data={salesStats.popularGenres} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {salesStats.popularGenres.map((entry, index) => <Cell key={index} fill={['#8884d8','#82ca9d','#ffc658','#ff8042'][index % 4]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </InsightSection>

        {/* Popular Mediums */}
        <InsightSection title="Popular Mediums">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={salesStats.popularMediums} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {salesStats.popularMediums.map((entry, index) => <Cell key={index} fill={['#8884d8','#82ca9d','#ffc658','#ff8042'][index % 4]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </InsightSection>

        {/* Popular Sizes */}
        <InsightSection title="Popular Sizes">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={salesStats.popularSizes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {salesStats.popularSizes.map((entry, index) => <Cell key={index} fill={['#8884d8','#82ca9d','#ffc658','#ff8042'][index % 4]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </InsightSection>

        {/* Trending Artworks */}
        <InsightSection title="Trending Artworks (Most Viewed)">
          <ul>
            {data.artworkViewData?.map(art => (
              <li key={art.artwork_id}>{art.artwork_id} — {art.count} views</li>
            ))}
          </ul>
        </InsightSection>

        {/* Engagement Overview */}
        <InsightSection title="Engagement Overview">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Profile Views', count: data?.profileViews || 0 },
              { name: 'Artwork Views', count: data?.artworkViews || 0 },
              { name: 'Inquiries', count: data?.inquiries || 0 },
              { name: 'Followers', count: data?.followersData?.length || 0 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </InsightSection>

      </div>
    </div>
  );
};

// --- Styles ---
const styles: { [key: string]: React.CSSProperties } = {
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' },
  insightsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px,1fr))', gap: '2rem' },
  statCard: { display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card)', padding: '1rem', borderRadius: 'var(--radius)' },
  statIcon: { background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '50%',
