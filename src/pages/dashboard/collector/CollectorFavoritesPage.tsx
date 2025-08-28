// src/pages/dashboard/collector/CollectorFavoritesPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';

const CollectorFavoritesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [newListTitle, setNewListTitle] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const { data: followedArtists } = useQuery({
    queryKey: ['followedArtists', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('artist_follows')
        .select('artist:artist_id(id, full_name, artist_slug, avatar_url)')
        .eq('follower_id', user.id);
      return data?.map(d => d.artist) || [];
    },
    enabled: !!user
  });

  const { data: likedArtworks } = useQuery({
    queryKey: ['likedArtworks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('artwork_reactions')
        .select('artwork:artwork_id(id, title, slug, artist_slug, image_url, status)')
        .eq('collector_id', user.id)
        .eq('reaction_type', 'like');
      return data?.map(d => d.artwork) || [];
    },
    enabled: !!user
  });

  const createListMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('collector_lists')
        .insert([{ collector_id: user.id, title: newListTitle, description: newListDesc, is_public: isPublic }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collectorLists', user?.id] });
      setNewListTitle('');
      setNewListDesc('');
      setIsPublic(false);
    }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Your Favorites</h1>
      <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>
        Track the artists you follow and artworks you've liked.
      </p>

      {/* Create List */}
      <div className="widget">
        <h3>Create a New List</h3>
        <input type="text" placeholder="Title" value={newListTitle} onChange={e => setNewListTitle(e.target.value)} />
        <input type="text" placeholder="Description (optional)" value={newListDesc} onChange={e => setNewListDesc(e.target.value)} />
        <label>
          <input type="checkbox" checked={isPublic} onChange={() => setIsPublic(!isPublic)} /> Public
        </label>
        <button onClick={() => createListMutation.mutate()} className="button button-primary">Create List</button>
      </div>

      {/* Followed Artists */}
      <div className="widget">
        <h3>Artists You Follow</h3>
        {followedArtists.length > 0 ? (
          <div className="horizontal-scroll-row">
            {followedArtists.map(artist => (
              <Link key={artist.id} to={`/${artist.artist_slug}`} className="scroll-card-artist">
                <img src={artist.avatar_url || '/placeholder.png'} alt={artist.full_name} />
                <p>{artist.full_name}</p>
              </Link>
            ))}
          </div>
        ) : <p style={{ color: 'var(--muted-foreground)' }}>You're not following any artists yet.</p>}
      </div>

      {/* Liked Artworks */}
      <div className="widget">
        <h3>Artworks You've Liked</h3>
        {likedArtworks.length > 0 ? (
          <div className="horizontal-scroll-row">
            {likedArtworks.map(art => (
              <Link key={art.id} to={`/${art.artist_slug}/artwork/${art.slug}`} className="scroll-card">
                <img src={art.image_url || '/placeholder.png'} alt={art.title || 'Untitled'} />
                <p>{art.title}</p>
              </Link>
            ))}
          </div>
        ) : <p style={{ color: 'var(--muted-foreground)' }}>You haven't liked or saved any artworks yet.</p>}
      </div>
    </div>
  );
};

export default CollectorFavoritesPage;
