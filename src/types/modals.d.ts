// Imports directly derived types from database.types.ts
import { ArtworkRow, ArtworkImageRow, ProfileRow, CatalogueRow } from '@/types/database.types';

// Define AppArtwork type for modals, extending the database row type
// and adding the relations (like artwork_images, artist) that are often joined.
export interface AppArtwork extends ArtworkRow {
  artwork_images?: ArtworkImageRow[];
  artist?: ProfileRow | null; // Joined artist data
  // Add any other joined fields you typically expect here.
}

export interface AppCatalogue extends CatalogueRow {
  // Add any joined fields if necessary for catalogue
}


export interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  artwork?: AppArtwork; // Now uses the AppArtwork type
  artworkId?: string; // ID of the artwork for inquiry
  artist?: ProfileRow | null; // Artist of the artwork
  previewImageUrl?: string;
  previewTitle?: string;
}

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  artwork?: AppArtwork; // Now uses the AppArtwork type
  catalogue?: AppCatalogue; // Now uses the AppCatalogue type
  title?: string | null; // For general sharing, e.g., catalogue title
  byline?: string | null; // For general sharing, e.g., artist name
  shareUrl: string;
  previewImageUrls?: (string | null)[];
  isCatalogue?: boolean;
}

export interface VisualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string; // Specific URL for visualization
  artworkTitle: string;
}