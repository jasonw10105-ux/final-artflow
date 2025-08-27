// src/pages/dashboard/collector/FavoritesPage.tsx

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { Database } from '@/types/database.types';

type ArtistRow = Database['public']['Tables']['profiles']['Row'];
type ArtworkRow = Database['public']['Tables']['artworks']['Row'];

const FavoritesPage = () => {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState<'artists' | 'artworks'>('artists');

    // Fetch followed artists
    const { data: followedArtists, isLoading: artistsLoading } = useQuery({
        queryKey: ['followedArtists', user?.id],
        queryFn: async (): Promise<ArtistRow[]> => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('artist_follows')
                .select('artist:artist_id(*)')
                .eq('collector_id', user.id);
            if (error) throw error;
            return data?.map(d => d.artist) || [];
        },
        enabled: !!user
    });

    // Fetch liked / saved artworks
    const { data: likedArtworks, isLoading: artworksLoading } = useQuery({
        queryKey: ['likedArtworks', user?.id],
        queryFn: async (): Promise<ArtworkRow[]> => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('artwork_likes')
                .select('artwork:artwork_id(*)')
                .eq('collector_id', user.id);
            if (error) throw error;
            return data?.map(d => d.artwork) || [];
        },
        enabled: !!user
    });

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <h1>Favorites</h1>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>
                {profile?.full_name}, here are your favorite artists and artworks.
            </p>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'artists' ? 'active' : ''}`}
                    onClick={() => setActiveTab('artists')}
                >
                    Artists Followed
                </button>
                <button
                    className={`tab ${activeTab === 'artworks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('artworks')}
                >
                    Artworks Liked
                </button>
            </div>

            {/* Tab Content */}
            <div style={{ marginTop: '1.5rem' }}>
                {activeTab === 'artists' && (
                    <div className="horizontal-scroll-row">
                        {artistsLoading ? (
                            <p>Loading followed artists...</p>
                        ) : followedArtists.length > 0 ? (
                            followedArtists.map(artist => (
                                <Link key={artist.id} to={`/${artist.artist_slug}`} className="scroll-card-artist">
                                    <img src={artist.avatar_url || '/placeholder.png'} alt={artist.full_name || 'Artist'} />
                                    <p>{artist.full_name}</p>
                                </Link>
                            ))
                        ) : (
                            <p style={{ color: 'var(--muted-foreground)' }}>
                                You are not following any artists yet.
                            </p>
                        )}
                    </div>
                )}

                {activeTab === 'artworks' && (
                    <div className="horizontal-scroll-row">
                        {artworksLoading ? (
                            <p>Loading liked artworks...</p>
                        ) : likedArtworks.length > 0 ? (
                            likedArtworks.map(art => (
                                <Link key={art.id} to={`/${art.artist_slug}/artwork/${art.slug}`} className="scroll-card">
                                    <img src={art.image_url || '/placeholder.png'} alt={art.title || 'Untitled'} />
                                    <p>{art.title}</p>
                                </Link>
                            ))
                        ) : (
                            <p style={{ color: 'var(--muted-foreground)' }}>
                                You have not liked any artworks yet.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FavoritesPage;
