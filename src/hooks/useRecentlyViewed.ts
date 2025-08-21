import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';

type Artwork = Database['public']['Tables']['artworks']['Row'];

export const useRecentlyViewed = () => {
  const [viewedArtworks, setViewedArtworks] = useState<Artwork[]>([]);

  useEffect(() => {
    try {
      const storedArtworks = localStorage.getItem('recentlyViewed');
      if (storedArtworks) {
        setViewedArtworks(JSON.parse(storedArtworks));
      }
    } catch (error) {
      console.error("Failed to parse recently viewed artworks:", error);
    }
  }, []);

  const addArtwork = (artwork: Artwork) => {
    setViewedArtworks(prevArtworks => {
      // Find if the artwork is already in the list to avoid duplicates
      const isAlreadyViewed = prevArtworks.some(a => a.id === artwork.id);

      // If it's already there, move it to the front
      if (isAlreadyViewed) {
          const reorderedArtworks = [artwork, ...prevArtworks.filter(a => a.id !== artwork.id)];
          localStorage.setItem('recentlyViewed', JSON.stringify(reorderedArtworks));
          return reorderedArtworks;
      }
      
      // If it's new, add it to the front and ensure the list doesn't exceed 5 items
      const updatedArtworks = [artwork, ...prevArtworks].slice(0, 5);
      localStorage.setItem('recentlyViewed', JSON.stringify(updatedArtworks));
      return updatedArtworks;
    });
  };

  return { viewedArtworks, addArtwork };
};