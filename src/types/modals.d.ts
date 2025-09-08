// src/types/modals.d.ts
import type { AppArtwork, AppCatalogue, AppProfile, CommonModalProps } from '@/types/app-specific.types';

export interface InquiryModalProps extends CommonModalProps {
  artwork?: AppArtwork;
  artworkId?: string;
  artist?: AppProfile | null;
  previewImageUrl?: string;
  previewTitle?: string;
}

// For ShareButton component specifically
export interface ShareButtonProps extends CommonModalProps {
  shareUrl: string;
  title: string | null;
  byline: string | null;
  previewImageUrls: (string | null)[];
  isCatalogue?: boolean;
}

export interface ShareModalProps extends CommonModalProps {
  artwork?: AppArtwork;
  catalogue?: AppCatalogue;
  title?: string | null;
  byline?: string | null;
  shareUrl: string;
  previewImageUrls?: (string | null)[];
  isCatalogue?: boolean;
}

export interface VisualizationModalProps extends CommonModalProps {
  imageUrl: string;
  artworkTitle: string;
}