import React from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import toast from "react-hot-toast";
import { PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ArtworkSidebarProps {
  onSelectArtwork: (id: string) => void;
}

interface UserArtwork {
  id: string;
  title: string | null;
  slug: string | null;
  primary_image_url: string | null;
}

const fetchUserArtworks = async (userId: string): Promise<UserArtwork[]> => {
  const { data, error } = await supabase
    .from('artworks')
    .select('id, title, slug, primary_image_url')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export default function ArtworkSidebar({ onSelectArtwork }: ArtworkSidebarProps) {
  const { user } = useAuth();

  const { data: artworks, isPending: isLoading, error } = useQuery<UserArtwork[], Error>({ // UPDATED: isLoading to isPending
    queryKey: ['artworkSidebarList', user?.id],
    queryFn: () => fetchUserArtworks(user!.id),
    enabled: !!user?.id,
    gcTime: 1000 * 60 * 5, // UPDATED: cacheTime to gcTime
  });

  const handleCreateNewArtwork = async () => {
    if (!user?.id) {
        toast.error("User not authenticated.");
        return;
    }
    // Create a temporary ID for the new artwork immediately
    const tempArtworkId = 'new-artwork-temp-id'; // This should be unique, but for client-side routing, a fixed string works for a 'new' state
    onSelectArtwork(tempArtworkId); // Navigate to the new artwork form
  };

  if (isLoading) return <div className="artwork-sidebar"><p className="loading-message">Loading artworks...</p></div>;
  if (error) return <div className="artwork-sidebar"><p className="error-message">Error loading artworks: {error.message}</p></div>;

  return (
    <aside className="artwork-sidebar">
      <button
        onClick={handleCreateNewArtwork}
        className="button button-primary button-with-icon w-full mb-4"
      >
        <PlusCircle size={16} /> New Artwork
      </button>

      <div className="artwork-sidebar-list">
        {artworks && artworks.length > 0 ? (
          artworks.map((artworkItem) => (
            <Link
              key={artworkItem.id}
              to={`/u/artworks/edit/${artworkItem.id}`}
              className="artwork-sidebar-list-item"
              onClick={() => onSelectArtwork(artworkItem.id)}
            >
              {artworkItem.primary_image_url ? (
                <img src={artworkItem.primary_image_url} alt={artworkItem.title || 'Untitled'} className="artwork-sidebar-thumbnail" />
              ) : (
                <div className="artwork-sidebar-thumbnail-placeholder">No Image</div>
              )}
              <span className="artwork-sidebar-title">{artworkItem.title || "Untitled"}</span>
            </Link>
          ))
        ) : (
          <p className="text-muted-foreground text-sm text-center">No artworks created yet.</p>
        )}
      </div>
    </aside>
  );
}