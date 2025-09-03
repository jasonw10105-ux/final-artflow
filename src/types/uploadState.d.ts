export interface UploadState {
  images: File[];
  addFiles: (files: File[]) => void;
  removeImage: (index: number) => void;
  setPrimary: (index: number) => void;
  clearStore: () => void; // Renamed to clearStore for clarity
}