// src/components/dashboard/ArtworkActionsMenu.tsx

import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import { handleDownload } from '../../utils/imageUtils';
import { Database } from '../../types/supabase';
import { useAuth } from '@/contexts/AuthProvider';

type Artwork = Database['public']['Tables']['artworks']['Row'];

interface ArtworkActionsMenuProps {
  artwork: Artwork;
  anchorEl: null | HTMLElement;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, title: string | null) => void;
  onMarkAsSold: (id: string) => void;
  onMarkAsAvailable: (id: string) => void;
  onAssignCatalogue: () => void;
  // Pass in artwork_images separately since they’re not on artwork row anymore
  images?: {
    watermarked?: string | null;
    visualization?: string | null;
  };
}

const ArtworkActionsMenu = ({
  artwork,
  anchorEl,
  onClose,
  onEdit,
  onDelete,
  onMarkAsSold,
  onMarkAsAvailable,
  onAssignCatalogue,
  images,
}: ArtworkActionsMenuProps) => {
  const { profile } = useAuth();
  const isOpen = Boolean(anchorEl);

  const publicUrl =
    profile?.slug && artwork.slug
      ? `/${profile.slug}/artwork/${artwork.slug}`
      : null;

  return (
    <Menu anchorEl={anchorEl} open={isOpen} onClose={onClose}>
      {publicUrl && (
        <MenuItem
          component="a"
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
        >
          View Public Page
        </MenuItem>
      )}

      <MenuItem
        onClick={() => {
          onEdit(artwork.id);
          onClose();
        }}
      >
        Edit Details
      </MenuItem>

      <MenuItem
        onClick={() => {
          onAssignCatalogue();
          onClose();
        }}
      >
        Assign to Catalogue
      </MenuItem>

      {artwork.status === 'available' && (
        <MenuItem
          onClick={() => {
            onMarkAsSold(artwork.id);
            onClose();
          }}
        >
          Mark as Sold
        </MenuItem>
      )}

      {(artwork.status === 'sold' || artwork.status === 'draft') && (
        <MenuItem
          onClick={() => {
            onMarkAsAvailable(artwork.id);
            onClose();
          }}
        >
          Mark as Available
        </MenuItem>
      )}

      {images?.watermarked && (
        <MenuItem
          onClick={() =>
            handleDownload(
              images.watermarked!,
              `${artwork.slug ?? 'artwork'}-watermarked.png`
            )
          }
        >
          Download Watermarked
        </MenuItem>
      )}

      {images?.visualization && (
        <MenuItem
          onClick={() =>
            handleDownload(
              images.visualization!,
              `${artwork.slug ?? 'artwork'}-visualization.jpg`
            )
          }
        >
          Download Visualization
        </MenuItem>
      )}

      <MenuItem
        onClick={() => {
          onDelete(artwork.id, artwork.title);
          onClose();
        }}
        color="error"
      >
        Delete Artwork
      </MenuItem>
    </Menu>
  );
};

export default ArtworkActionsMenu;