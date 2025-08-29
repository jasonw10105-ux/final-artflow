import { Artwork, Artist } from '@/types/artwork'; // adjust path if needed

export interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  artwork: Artwork;
  artist: Artist | null;
}

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  artwork: Artwork;
}

export interface VisualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  artwork: Artwork;
}
