// src/stores/artworkUploadStore.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface UploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

interface ArtworkUploadState {
  primaryImage?: UploadFile; // Single primary image
  additionalImages: UploadFile[]; // Optional bulk uploads (max 4)
  isUploading: boolean;

  addPrimaryImage: (file: File) => void;
  addAdditionalImages: (files: File[]) => void;
  removeFile: (id: string) => void;
  clearStore: () => void;
  uploadAndCreatePendingArtworks: (userId: string) => Promise<string[]>;
}

export const useArtworkUploadStore = create<ArtworkUploadState>((set, get) => ({
  primaryImage: undefined,
  additionalImages: [],
  isUploading: false,

  addPrimaryImage: (file: File) => {
    set({
      primaryImage: { id: uuidv4(), file, status: 'pending', progress: 0 },
    });
  },

  addAdditionalImages: (files: File[]) => {
    set((state) => ({
      additionalImages: [...state.additionalImages, ...files.slice(0, 4 - state.additionalImages.length).map(f => ({
        id: uuidv4(),
        file: f,
        status: 'pending',
        progress: 0,
      }))],
    }));
  },

  removeFile: (id: string) => {
    set((state) => ({
      primaryImage: state.primaryImage?.id === id ? undefined : state.primaryImage,
      additionalImages: state.additionalImages.filter(f => f.id !== id),
    }));
  },

  clearStore: () => set({ primaryImage: undefined, additionalImages: [], isUploading: false }),

  uploadAndCreatePendingArtworks: async (userId: string) => {
    const state = get();
    if (!state.primaryImage) throw new Error('Primary image is required');

    set({ isUploading: true });

    try {
      const artworkIds: string[] = [];

      // 1️⃣ Upload primary image
      const primaryId = uuidv4();
      const primaryPath = `artworks/${primaryId}/primary/${state.primaryImage.file.name}`;
      const { error: primaryError } = await supabase.storage
        .from('artwork_images')
        .upload(primaryPath, state.primaryImage.file, { upsert: true });
      if (primaryError) throw primaryError;

      // Create pending artwork record
      const { data: artworkData, error: artworkError } = await supabase
        .from('artworks')
        .insert({
          user_id: userId,
          title: '',
          primary_image_url: primaryPath,
          status: 'pending',
        })
        .select('id')
        .single();

      if (artworkError || !artworkData) throw artworkError;

      artworkIds.push(artworkData.id);

      // 2️⃣ Upload additional images (optional)
      for (const file of state.additionalImages) {
        const additionalPath = `artworks/${artworkData.id}/additional/${file.file.name}`;
        const { error } = await supabase.storage
          .from('artwork_images')
          .upload(additionalPath, file.file, { upsert: true });
        if (error) console.warn('Additional image upload error', error);
      }

      return artworkIds;
    } finally {
      set({ isUploading: false });
    }
  },
}));
