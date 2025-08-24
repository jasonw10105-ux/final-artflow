// src/hooks/useRecentlyViewed.ts

import { useState, useEffect } from 'react';
import { Database } from '@/types/database.types';

type Artwork = Database['public']['Tables']['artworks']['Row'];

// This type is more flexible for data from localStorage.
// It makes most fields optional but requires 'id'.
// This prevents type errors if the stored data is slightly different from the strict DB type.
export type StoredArtwork = Partial<Artwork> & {
  id: string;
  artist_slug?: string; // It's good practice to store this for link generation
};

export const useRecentlyViewed = () => {
  const [viewedArtworks, setViewedArtworks] = useState<StoredArtwork[]>([]);

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

  const addArtwork = (artwork: StoredArtwork) => {
    setViewedArtworks(prevArtworks => {
      // Remove the artwork if it already exists to move it to the front
      const filteredArtworks = prevArtworks.filter(a => a.id !== artwork.id);
      
      // Add the new or moved artwork to the front, and limit to 5 items
      const updatedArtworks = [artwork, ...filteredArtworks].slice(0, 5);
      
      localStorage.setItem('recentlyViewed', JSON.stringify(updatedArtworks));
      return updatedArtworks;
    });
  };

  return { viewedArtworks, addArtwork };
};