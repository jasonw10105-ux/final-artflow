// src/pages/dashboard/collector/CollectorFavoritesPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Database } from '@/types/database.types';
import { PlusCircle, Lock, Globe } from 'lucide-react';
import Toggle from '@/components/ui/Toggle'; // Assuming a standard toggle component exists at this path

// --- TYPE DEFINITIONS ---
// Artist data retrieved from the artist_follows table join
interface ArtistData {
  id: string;
  full_name: string;
  slug: string;
  avatar_url?: string | null;
}

// Artwork data retrieved from the artwork_reactions table join
interface ArtworkData {
  id: string;
  title: string;
  slug: string;
  artist_slug?: string;
  image_url?: string | null;
  status?: string;
}

// Collector list data from the collector_lists table
type CollectorList = Database['public']['Tables']['collector_lists']['Row'];

// --- HELPER COMPONENTS ---
const StatusBadge = ({ status }: { status?: string }) => (
  <div className="artwork-card-status-badge">{status || 'Unknown'}</div>
);

// --- MAIN PAGE COMPONENT ---
const CollectorFavoritesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // --- State for new list modal ---
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [isNewListPublic, setIsNewListPublic] = useState(false);

  // --- Fetch followed artists ---
  const { data: followedArtists = [], isLoading: loadingArtists } = useQuery<ArtistData[]>({
    queryKey: ['followedArtists', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('artist_follows')
        .select(`artist:artist_id(id, full_name, slug, avatar_url)`)
        .eq('follower_id', user.id);
      if (error) throw error;
      return data?.map(d => d.artist).filter(Boolean) as ArtistData[] || [];
    },
    enabled: !!user
  });

  // --- Fetch liked artworks ---
  const { data: likedArtworks = [], isLoading: loadingArtworks } = useQuery<ArtworkData[]>({
    queryKey: ['likedArtworks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('artwork_reactions')
        .select(`
          artwork:artwork_id(
            id, title, slug, status,
            artist:user_id(slug),
            images:artwork_images(image_url, position)
          )
        `)
        .eq('collector_id', user.id)
        .eq('reaction_type', 'like');

      if (error) throw error;
      
      return (data || []).map((d: any) => ({
        id: d.artwork.id,
        title: d.artwork.title,
        slug: d.artwork.slug,
        status: d.artwork.status,
        artist_slug: d.artwork.artist?.slug || '#',
        image_url: d.artwork.images?.sort((a:any,b:any) => a.position - b.position)[0]?.image_url,
      }));
    },
    enabled: !!user
  });

  // --- Fetch Collector's Custom Lists ---
  const { data: customLists, isLoading: loadingLists } = useQuery<CollectorList[], Error>({
      queryKey: ['collectorLists', user?.id],
      queryFn: async () => {
          if (!user) return [];
          const { data, error } = await supabase
              .from('collector_lists')
              .select('*')
              .eq('collector_id', user.id)
              .order('created_at', { ascending: false });
          if (error) throw error;
          return data || [];
      },
      enabled: !!user
  });

  // --- Mutation for creating a new list ---
  const createListMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not found');
      const { data, error } = await supabase
        .from('collector_lists')
        .insert({
          collector_id: user.id,
          title: newListTitle,
          description: newListDescription || null,
          is_public: isNewListPublic,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collectorLists', user?.id] });
      setShowCreateListModal(false);
      setNewListTitle('');
      setNewListDescription('');
      setIsNewListPublic(false);
      toast.success('New list created successfully!');
    },
    onError: (error: any) => {
        toast.error(`Error creating list: ${error.message}`);
    }
  });
  
  // --- Mutation for toggling list public status ---
  const toggleListPublicMutation = useMutation({
      mutationFn: async ({ listId, isPublic }: { listId: string; isPublic: boolean }) => {
          const { error } = await supabase
              .from('collector_lists')
              .update({ is_public: isPublic, updated_at: new Date().toISOString() })
              .eq('id', listId);
          if (error) throw error;
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['collectorLists', user?.id] });
          toast.success("List visibility updated!");
      },
      onError: (err: any) => toast.error(`Error: ${err.message}`)
  });
  
  const handleCreateList = () => {
      if (!newListTitle.trim()) {
          toast.error('Please provide a title for the list.');
          return;
      }
      createListMutation.mutate();
  };

  return (
    <div className="page-container">
      <h1>Your Favorites</h1>
      <p className="page-subtitle">Track artists you follow, artworks you've liked, and create your own curated lists to share with the community.</p>

      {/* --- Custom Lists Section --- */}
      <div className="dashboard-section">
          <div className="flex justify-between items-center mb-4">
              <h3 className="section-title">Your Curated Lists</h3>
              <button onClick={() => setShowCreateListModal(true)} className="button button-primary button-with-icon">
                  <PlusCircle size={16} /> New List
              </button>
          </div>
          {loadingLists ? <p className="loading-message">Loading your lists...</p> : (
              customLists && customLists.length > 0 ? (
                  <div className="card-table-wrapper">
                      <table className="data-table">
                          <thead>
                              <tr>
                                  <th>Title</th>
                                  <th>Visibility (Public/Private)</th>
                                  <th className="text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody>
                              {customLists.map(list => (
                                  <tr key={list.id}>
                                      <td>{list.title}</td>
                                      <td>
                                          <div className="flex items-center gap-2">
                                              {list.is_public ? <Globe size={16} className="text-primary"/> : <Lock size={16} className="text-muted-foreground"/>}
                                              <Toggle
                                                  checked={list.is_public}
                                                  onChange={(val) => toggleListPublicMutation.mutate({ listId: list.id, isPublic: val })}
                                              />
                                          </div>
                                      </td>
                                      <td className="text-right">
                                          <Link to={`/list/${list.id}`} className="button button-secondary button-sm">View List</Link>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              ) : <p className="empty-state-message">You haven't created any lists yet. Create one to start curating!</p>
          )}
      </div>

      {/* --- Followed Artists Section --- */}
      <div className="dashboard-section mt-8">
        <h3 className="section-title">Artists You Follow</h3>
        {loadingArtists ? <p className="loading-message">Loading artists...</p> : (
          followedArtists.length > 0 ? (
            <div className="horizontal-scroll-row">
              {followedArtists.map(artist => (
                <Link key={artist.id} to={`/${artist.slug}`} className="scroll-card-artist">
                  <img src={artist.avatar_url || 'https://placehold.co/150x150?text=Artist'} alt={artist.full_name || 'Artist'} />
                  <p>{artist.full_name}</p>
                </Link>
              ))}
            </div>
          ) : <p className="empty-state-message">You're not following any artists yet. Explore and find artists you love!</p>
        )}
      </div>

      {/* --- Liked Artworks Section --- */}
      <div className="dashboard-section mt-8">
        <h3 className="section-title">Artworks You've Liked</h3>
        {loadingArtworks ? <p className="loading-message">Loading artworks...</p> : (
          likedArtworks.length > 0 ? (
            <div className="horizontal-scroll-row">
              {likedArtworks.map(art => (
                <Link key={art.id} to={`/${art.artist_slug}/artwork/${art.slug}`} className="scroll-card">
                  <StatusBadge status={art.status} />
                  <img src={art.image_url || 'https://placehold.co/300x200?text=No+Image'} alt={art.title || 'Untitled'} />
                  <p>{art.title}</p>
                </Link>
              ))}
            </div>
          ) : <p className="empty-state-message">You haven't liked any artworks yet. Start exploring to find pieces that speak to you.</p>
        )}
      </div>

      {/* --- New List Modal --- */}
      {showCreateListModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateListModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Create New List</h3>
            <div className="form-group">
                <label htmlFor="list-title" className="label">Title</label>
                <input
                  id="list-title"
                  type="text"
                  value={newListTitle}
                  onChange={e => setNewListTitle(e.target.value)}
                  className="input"
                  required
                />
            </div>
             <div className="form-group">
                <label htmlFor="list-description" className="label">Description (Optional)</label>
                <textarea
                  id="list-description"
                  value={newListDescription}
                  onChange={e => setNewListDescription(e.target.value)}
                  className="textarea"
                  rows={3}
                />
            </div>
            <div className="checkbox-item mt-4">
                <input
                    type="checkbox"
                    id="isPublicList"
                    checked={isNewListPublic}
                    onChange={() => setIsNewListPublic(!isNewListPublic)}
                    className="checkbox"
                />
                <label htmlFor="isPublicList" className="label-inline">Make Public</label>
            </div>
            <p className="text-sm text-muted-foreground">Public lists can be discovered by the community.</p>
            <div className="modal-footer">
              <button type="button" className="button button-secondary" onClick={() => setShowCreateListModal(false)}>Cancel</button>
              <button
                type="button"
                className="button button-primary"
                onClick={handleCreateList}
                disabled={createListMutation.isPending || !newListTitle.trim()}
              >
                {createListMutation.isPending ? 'Creating...' : 'Create List'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectorFavoritesPage;