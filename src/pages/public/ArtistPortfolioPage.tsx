import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft, MapPin } from 'lucide-react';
import InquiryModal from '../../components/public/InquiryModal';
import { useAuth } from '../../contexts/AuthProvider';

const fetchArtistPortfolio = async (slug: string) => {
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, bio, short_bio, location, slug, avatar_url')
        .eq('slug', slug)
        .single();
    if (profileError) throw new Error('Artist not found');

    const { data: artworks, error: artworksError } = await supabase
        .from('artworks')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'Active')
        .order('created_at', { ascending: false });
    if (artworksError) throw new Error('Could not fetch artworks');

    supabase.rpc('log_profile_view', { p_artist_id: profile.id }).then();

    return { profile, artworks };
};

type ArtworkForModal = {
    id: string;
    title: string | null;
    image_url: string | null;
    slug: string;
};

const ArtistPortfolioPage = () => {
    const { profileSlug } = useParams<{ profileSlug: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { profile: currentUserProfile } = useAuth();
    const queryClient = useQueryClient();

    const [inquiryArtwork, setInquiryArtwork] = useState<ArtworkForModal | null>(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['artistPortfolio', profileSlug],
        queryFn: () => fetchArtistPortfolio(profileSlug!),
        enabled: !!profileSlug,
    });

    const showBackButton = location.state?.from === '/artists';
    const profile = data?.profile;
    const artworks = data?.artworks || [];
    const isOwner = currentUserProfile?.id === profile?.id;

    // Follow system
    const { data: isFollowing } = useQuery({
        queryKey: ['isFollowing', currentUserProfile?.id, profile?.id],
        queryFn: async () => {
            if (!currentUserProfile || !profile) return false;
            const { data, error } = await supabase.rpc('is_following_artist', {
                p_follower: currentUserProfile.id,
                p_artist: profile.id
            });
            if (error) throw error;
            return data as boolean;
        },
        enabled: !!currentUserProfile && !!profile,
    });

    const followMutation = useMutation({
        mutationFn: async () => {
            if (!currentUserProfile || !profile) return;
            await supabase.rpc('follow_artist', {
                p_follower: currentUserProfile.id,
                p_artist: profile.id
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['isFollowing', currentUserProfile?.id, profile?.id] })
    });

    const unfollowMutation = useMutation({
        mutationFn: async () => {
            if (!currentUserProfile || !profile) return;
            await supabase.rpc('unfollow_artist', {
                p_follower: currentUserProfile.id,
                p_artist: profile.id
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['isFollowing', currentUserProfile?.id, profile?.id] })
    });

    const handleFollowClick = () => {
        if (isFollowing) {
            unfollowMutation.mutate();
        } else {
            followMutation.mutate();
        }
    };

    const formatLocation = (loc: any) => {
        if (!loc) return null;
        const parts = [loc.city, loc.country].filter(Boolean);
        return parts.join(', ');
    };
    const locationString = formatLocation(profile?.location);

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading Artist Portfolio...</p>;
    if (isError || !data) return (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
            <h1>404 - Artist Not Found</h1>
            <p>The artist you are looking for does not exist or has moved.</p>
            <Link to="/artists" className="button button-primary">Browse Artists</Link>
        </div>
    );

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            {showBackButton && (
                <button onClick={() => navigate('/artists')} className="button button-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={16} /> All Artists
                </button>
            )}

            <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <img src={profile?.avatar_url || 'https://placehold.co/128x128'} alt={profile?.full_name || ''} style={{ width: '128px', height: '128px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', margin: '0 auto' }} />
                <h1 style={{ fontSize: '2.5rem', marginTop: '1.5rem' }}>{profile?.full_name}</h1>

                {locationString && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
                        <MapPin size={16} />
                        <span>{locationString}</span>
                    </div>
                )}

                <p style={{ fontSize: '1.1rem', color: 'var(--muted-foreground)', marginTop: '1rem', maxWidth: '800px', margin: '1rem auto' }}>
                    {profile?.short_bio || profile?.bio}
                </p>

                {!isOwner && currentUserProfile && (
                    <button
                        className={`button ${isFollowing ? 'button-secondary' : 'button-primary'}`}
                        onClick={handleFollowClick}
                        style={{ marginTop: '1rem' }}
                    >
                        {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                )}
            </header>

            {profile?.bio && (
                <div className="artwork-details-section">
                    <h3>About the Artist</h3>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{profile.bio}</p>
                </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginTop: '3rem' }}>
                <h3 style={{ textAlign: 'center', marginBottom: '2rem' }}>Available Works</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                    {artworks.map(art => (
                        <div key={art.id} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
                            <Link to={`/${profile.slug}/artwork/${art.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <img src={art.image_url || 'https://placehold.co/600x400'} alt={art.title || ''} style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
                                <div style={{ padding: '1rem' }}>
                                    <h4 style={{ fontWeight: 600, fontStyle: 'italic' }}>{art.title}</h4>
                                    <p style={{ fontWeight: 'bold', marginTop: '0.5rem' }}>
                                        {art.price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(art.price) : 'Price on request'}
                                    </p>
                                </div>
                            </Link>
                            {!isOwner && (
                                <div style={{ padding: '0
