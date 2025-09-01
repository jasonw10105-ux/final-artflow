// src/components/dashboard/ArtworkActionsMenu.tsx
import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import { handleDownload } from '../../utils/imageUtils';
import { Database } from '../../types/database.types';
import { useAuth } from '@/contexts/AuthProvider';

type Artwork = Database['public']['Tables']['artworks']['Row'];
type ArtworkImage = Database['public']['Tables']['artwork_images']['Row'];

interface ArtworkActionsMenuProps {
  artwork: Artwork;
  anchorEl: null | HTMLElement;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAsSold: (id: string) => void;
  onMarkAsAvailable: (id: string) => void;
  onAssignCatalogue: () => void;
  images?: ArtworkImage[];
}

const ArtworkActionsMenu: React.FC<ArtworkActionsMenuProps> = ({
  artwork,
  anchorEl,
  onClose,
  onEdit,
  onDelete,
  onMarkAsSold,
  onMarkAsAvailable,
  onAssignCatalogue,
  images,
}) => {
  const { profile } = useAuth();
  const isOpen = Boolean(anchorEl);

  const publicUrl = profile?.slug && artwork.slug ? `/u/${profile.slug}/artwork/${artwork.slug}` : null;

  const watermarked = images?.[0]?.watermarked_image_url;
  const visualization = images?.[0]?.visualization_image_url;

  return (
    <Menu anchorEl={anchorEl} open={isOpen} onClose={onClose}>
      {publicUrl && (
        <MenuItem component="a" href={publicUrl} target="_blank" rel="noopener noreferrer" onClick={onClose}>
          View Public Page
        </MenuItem>
      )}

      <MenuItem onClick={() => { onEdit(artwork.id); onClose(); }}>Edit Details</MenuItem>
      <MenuItem onClick={() => { onAssignCatalogue(); onClose(); }}>Assign to Catalogue</MenuItem>

      {artwork.status === 'Available' && (
        <MenuItem onClick={() => { onMarkAsSold(artwork.id); onClose(); }}>Mark as Sold</MenuItem>
      )}

      {(artwork.status === 'Sold' || artwork.status === 'Draft') && (
        <MenuItem onClick={() => { onMarkAsAvailable(artwork.id); onClose(); }}>Mark as Available</MenuItem>
      )}

      {watermarked && (
        <MenuItem onClick={() => handleDownload(watermarked, `${artwork.slug ?? 'artwork'}-watermarked.png`)}>
          Download Watermarked
        </MenuItem>
      )}

      {visualization && (
        <MenuItem onClick={() => handleDownload(visualization, `${artwork.slug ?? 'artwork'}-visualization.jpg`)}>
          Download Visualization
        </MenuItem>
      )}

      <MenuItem onClick={() => { onDelete(artwork.id); onClose(); }} style={{ color: 'red' }}>
        Delete Artwork
      </MenuItem>
    </Menu>
  );
};

export default ArtworkActionsMenu;