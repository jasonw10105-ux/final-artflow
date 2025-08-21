// src/stores/artworkUploadStore.ts

import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface UploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number; // We'll keep this for potential future use, but won't display it individually
  error?: string;
}

interface ArtworkUploadState {
  files: UploadFile[];
  isUploading: boolean;
  totalProgress: number; // Add this line
  addFiles: (files: File[]) => void;
  cancelUpload: (id: string) => void;
  clearStore: () => void;
  uploadAndCreatePendingArtworks: (userId: string) => Promise<string[]>;
}

export const useArtworkUploadStore = create<ArtworkUploadState>((set, get) => ({
  files: [],
  isUploading: false,
  totalProgress: 0, // And initialize it here

  addFiles: (newFiles) => {
    const fileEntries: UploadFile[] = newFiles.map(file => ({
      id: uuidv4(),
      file,
      status: 'pending',
      progress: 0,
    }));
    set(state => ({ files: [...state.files, ...fileEntries] }));
  },

  cancelUpload: (id) => {
    set(state => ({
      files: state.files.filter(f => f.id !== id)
    }));
  },

  clearStore: () => {
    set({ files: [], isUploading: false, totalProgress: 0 }); // Reset progress
  },

  uploadAndCreatePendingArtworks: async (userId) => {
    set({ isUploading: true, totalProgress: 0 }); // Start uploading and reset progress
    const filesToUpload = get().files.filter(f => f.status === 'pending');
    const createdArtworkIds: string[] = [];
    const totalFiles = filesToUpload.length;
    let completedFiles = 0;

    const uploadPromises = filesToUpload.map(async (uploadFile) => {
      try {
        set(state => ({
          files: state.files.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading' } : f)
        }));

        const fileExt = uploadFile.file.name.split('.').pop();
        const filePath = `${userId}/${uuidv4()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('artworks')
          .upload(filePath, uploadFile.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('artworks').getPublicUrl(filePath);
        
        const { data: newArtwork, error: insertError } = await supabase
          .from('artworks')
          .insert({ user_id: userId, image_url: publicUrl, status: 'Pending', title: '' })
          .select('id')
          .single();
          
        if (insertError) throw insertError;
        
        createdArtworkIds.push(newArtwork.id);
        set(state => ({
          files: state.files.map(f => f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f)
        }));
      } catch (error: any) {
        set(state => ({
          files: state.files.map(f => f.id === uploadFile.id ? { ...f, status: 'error', error: error.message } : f)
        }));
      } finally {
        // This block runs on success or failure of an upload
        completedFiles++;
        const progress = (completedFiles / totalFiles) * 100;
        set({ totalProgress: progress });
      }
    });

    await Promise.all(uploadPromises);
    set({ isUploading: false });
    return createdArtworkIds;
  },
}));