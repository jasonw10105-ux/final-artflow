// src/components/ArtworkReactionButtons.tsx
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';

interface Props {
  artworkId: string;
}

const ArtworkReactionButtons = ({ artworkId }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (reactionType: 'like' | 'dislike') => {
      if (!user) return;
      const { error } = await supabase.rpc('react_to_artwork', {
        p_collector_id: user.id,
        p_artwork_id: artworkId,
        p_reaction_type: reactionType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      // Refresh learned behaviors & liked artworks
      queryClient.invalidateQueries({ queryKey: ['collectorLearnedBehavior', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['likedArtworks', user?.id] });
    }
  });

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
      <button
        className="button button-like"
        onClick={() => mutation.mutate('like')}
      >
        👍 Like
      </button>
      <button
        className="button button-dislike"
        onClick={() => mutation.mutate('dislike')}
      >
        👎 Dislike
      </button>
    </div>
  );
};

export default ArtworkReactionButtons;
