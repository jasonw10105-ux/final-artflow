// src/types/modals.d.ts
// Imports directly from the new app-specific types file
import { AppArtwork, AppCatalogue, AppProfile, CommonModalProps } from '@/types/app-specific.types';

export interface InquiryModalProps extends CommonModalProps {
  artwork?: AppArtwork;
  artworkId?: string;
  artist?: AppProfile | null;
  previewImageUrl?: string;
  previewTitle?: string;
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