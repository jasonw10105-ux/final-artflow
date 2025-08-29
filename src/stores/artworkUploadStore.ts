import { create } from "zustand";

type UploadState = {
  artworkId: string | null;
  primaryImage: string | null;
  additionalImages: string[];
  setArtworkId: (id: string) => void;
  setPrimaryImage: (url: string) => void;
  addAdditionalImage: (url: string) => void;
  reset: () => void;
};

export const useArtworkUploadStore = create<UploadState>((set) => ({
  artworkId: null,
  primaryImage: null,
  additionalImages: [],
  setArtworkId: (id) => set({ artworkId: id }),
  setPrimaryImage: (url) => set({ primaryImage: url }),
  addAdditionalImage: (url) =>
    set((state) => ({ additionalImages: [...state.additionalImages, url] })),
  reset: () => set({ artworkId: null, primaryImage: null, additionalImages: [] }),
}));
