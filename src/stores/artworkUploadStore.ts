// src/stores/artworkUploadStore.ts
import { create } from "zustand";

export interface ArtworkImage {
  id: string;
  file: File;
  isPrimary: boolean;
  previewUrl: string;
}

export interface ArtworkItem {
  artworkId: string;
  title?: string;
  images: ArtworkImage[];
}

interface ArtworkUploadState {
  artworks: ArtworkItem[];
  addArtwork: (artworkId: string, title?: string) => void;
  removeArtwork: (artworkId: string) => void;
  setArtworkTitle: (artworkId: string, title: string) => void;

  addImage: (artworkId: string, image: ArtworkImage) => void;
  removeImage: (artworkId: string, imageId: string) => void;
  replaceImage: (artworkId: string, imageId: string, file: File, previewUrl: string) => void;
  setPrimaryImage: (artworkId: string, imageId: string) => void;

  clearArtwork: (artworkId: string) => void;
  clearAll: () => void;
}

export const useArtworkUploadStore = create<ArtworkUploadState>((set) => ({
  artworks: [],

  addArtwork: (artworkId, title) =>
    set((state) => ({
      artworks: [...state.artworks, { artworkId, title, images: [] }],
    })),

  removeArtwork: (artworkId) =>
    set((state) => ({
      artworks: state.artworks.filter((a) => a.artworkId !== artworkId),
    })),

  setArtworkTitle: (artworkId, title) =>
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.artworkId === artworkId ? { ...a, title } : a
      ),
    })),

  addImage: (artworkId, image) =>
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.artworkId === artworkId
          ? { ...a, images: [...a.images, image] }
          : a
      ),
    })),

  removeImage: (artworkId, imageId) =>
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.artworkId === artworkId
          ? { ...a, images: a.images.filter((i) => i.id !== imageId) }
          : a
      ),
    })),

  replaceImage: (artworkId, imageId, file, previewUrl) =>
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.artworkId === artworkId
          ? {
              ...a,
              images: a.images.map((i) =>
                i.id === imageId ? { ...i, file, previewUrl } : i
              ),
            }
          : a
      ),
    })),

  setPrimaryImage: (artworkId, imageId) =>
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.artworkId === artworkId
          ? {
              ...a,
              images: a.images.map((i) => ({
                ...i,
                isPrimary: i.id === imageId,
              })),
            }
          : a
      ),
    })),

  clearArtwork: (artworkId) =>
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.artworkId === artworkId ? { ...a, images: [] } : a
      ),
    })),

  clearAll: () => set({ artworks: [] }),
}));