import React, { useState, useRef } from 'react'; 
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthProvider';
import AnalyticsChart from '../../../components/dashboard/AnalyticsChart';
import RecentActivityWidget from '../../../components/dashboard/RecentActivityWidget';
import { PlusCircle } from 'lucide-react';
import ArtworkUploadModal from '../../../components/dashboard/ArtworkUploadModal';
import { useArtworkUploadStore } from '../../../stores/artworkUploadStore';
import { supabase } from '../../../lib/supabaseClient';
import dayjs from 'dayjs';

const ArtistDashboardPage = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [showUploadModal, setShowUploadModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addFiles, clearStore } = useArtworkUploadStore();

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            addFiles(Array.from(event.target.files));
            setShowUploadModal(true);
            event.target.value = '';
        }
    };

    const handleUploadComplete = (artworkIds: string[]) => {
        setShowUploadModal(false);
        clearStore();
        queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
        navigate(`/artist/artworks/wizard?ids=${artworkIds.join(',')}`);
    };

    // --- Trending Artworks (last 7 days) ---
    const { data: trendingArtworks, isLoading: trendingLoading } = useQuery({
        queryKey: ['artistTrendingArtworks', user?.id],
        queryFn: async () => {
            if (!user) return [];

            // Get 7-day cutoff
            const sevenDaysAgo = dayjs().subtract(7, 'day').toISOString();

            // Aggregate views and inquiries in the last 7 days
            const { data: artworks, error } = await supabase
                .from('artworks')
                .select(`
                    id,
                    title,
                    slug,
                    status,
                    artwork_images (image_url),
                    profile_views:profile_views!inner(viewed_at),
                    artwork_views:artwork_views!inner(viewed_at),
                    inquiries:conversations!inner(created_at)
                `)
                .eq('user_id', user.id)
                .eq('status', 'Available')
                .limit(50); // fetch more to calculate trends

            if (error) throw error;

            // Compute engagement in last 7 days
            return artworks
                .map(art => {
                    const recentProfileViews = art.profile_views?.filter((v: any) => v.viewed_at >= sevenDaysAgo).length || 0;
                    const recentArtworkViews = art.artwork_views?.filter((v: any) => v.viewed_at >= sevenDaysAgo).length || 0;
                    const recentInquiries = art.inquiries?.filter((i: any) => i.created_at >= sevenDaysAgo).length || 0;
                    return {
                        ...art,
                        trendScore: recentProfileViews + recentArtworkViews + recentInquiries
                    };
                })
                .sort((a, b) => b.trendScore - a.trendScore)
                .slice(0, 10);
        },
        enabled: !!user
    });

    return (
        <div>
            {showUploadModal && <ArtworkUploadModal onUploadComplete={handleUploadComplete} />}
            <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1>Dashboard</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link to={`/${profile?.slug}`} className="button button-secondary" target="_blank">View Public Profile</Link>
                    <button onClick={() => fileInputRef.current?.click()} className="button button-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <PlusCircle size={16} /> Create New Artwork
                    </button>
                </div>
            </div>

            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Welcome back, {profile?.full_name}!</p>

            <div>
                <h3 style={{ marginBottom: '1rem' }}>Global Insights</h3>
                <AnalyticsChart />
            </div>

            <div>
                <RecentActivityWidget />
            </div>

            {/* Trending Artworks Carousel */}
            <div style={{ marginTop: '2rem' }}>
                <h3>Trending Artworks (Last 7 Days)</h3>
                {trendingLoading ? <p>Loading trending artworks...</p> : (
                    <div style={{ display: 'flex', overflowX: 'auto', gap: '1rem', paddingBottom: '1rem' }}>
                        {trendingArtworks.map(art => (
                            <Link to={`/artist/artworks/${art.slug}`} key={art.id} className="scroll-card" style={{ minWidth: 200 }}>
                                <img src={art.artwork_images?.[0]?.image_url || '/placeholder.png'} alt={art.title} style={{ width: '100%', borderRadius: 'var(--radius)' }} />
                                <p>{art.title}</p>
                                <small style={{ color: 'var(--muted-foreground)' }}>Trend Score: {art.trendScore}</small>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArtistDashboardPage;
