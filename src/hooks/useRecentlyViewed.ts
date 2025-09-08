// src/hooks/useRecentlyViewed.ts

import { useState, useEffect, useCallback } from 'react';
// import { Database } from '@/types/database.types'; // Removed: Database is not used in this file

// Use AppArtwork as the base for StoredArtwork for consistency
import { AppArtwork } from '@/types/app.types';

// This type is more flexible for data from localStorage.
// It explicitly types image_url and artist_slug as potentially undefined or null.
export type StoredArtwork = Pick<AppArtwork, 'id' | 'title' | 'slug'> & {
  image_url: string | null | undefined; // image_url might come from artwork_images[0]
  artist_slug: string | null | undefined; // artist_slug comes from artist.slug
};

const STORAGE_KEY = 'recentlyViewedArtworks';
const MAX_RECENTLY_VIEWED = 5; // Limit to a sensible number

export const useRecentlyViewed = () => {
  // Initialize state from localStorage once on mount
  const [viewedArtworks, setViewedArtworks] = useState<StoredArtwork[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to parse recently viewed artworks from localStorage", error);
      return [];
    }
  });

  // Memoize the addArtwork function to prevent its reference from changing on every render.
  // This is crucial to avoid triggering useEffect in consuming components unnecessarily.
  const addArtwork = useCallback((artwork: StoredArtwork) => {
    setViewedArtworks(prevArtworks => {
      // Remove the artwork if it already exists to move it to the front
      const filteredArtworks = prevArtworks.filter(a => a.id !== artwork.id);
      
      // Add the new or moved artwork to the front, and limit to MAX_RECENTLY_VIEWED items
      const updatedArtworks = [artwork, ...filteredArtworks].slice(0, MAX_RECENTLY_VIEWED);
      
      return updatedArtworks; // Return the new state
    });
  }, []); // Empty dependency array: addArtwork is stable across renders

  // Effect to save to localStorage whenever viewedArtworks state changes.
  // This runs *after* the render, preventing infinite loops.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewedArtworks));
    } catch (error) {
      console.error("Failed to save recently viewed artworks to localStorage", error);
    }
  }, [viewedArtworks]); // Dependency array: run only when viewedArtworks state actually changes

  return { viewedArtworks, addArtwork };
};