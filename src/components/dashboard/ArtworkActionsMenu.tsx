import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import { handleDownload } from '../../utils/imageUtils'; // CORRECTED: Import the new utility
import { Database } from '../../types/supabase';

// CORRECTED: Use the official type from supabase.ts
type Artwork = Database['public']['Tables']['artworks']['Row'];

interface ArtworkActionsMenuProps {
    artwork: Artwork;
    anchorEl: null | HTMLElement;
    onClose: () => void;
    onEdit: (id: string) => void;
    onDelete: (id: string, title: string | null) => void;
    onMarkAsSold: (id: string) => void;
}

const ArtworkActionsMenu = ({ artwork, anchorEl, onClose, onEdit, onDelete, onMarkAsSold }: ArtworkActionsMenuProps) => {
    const isOpen = Boolean(anchorEl);

    return (
        <Menu anchorEl={anchorEl} open={isOpen} onClose={onClose}>
            <MenuItem onClick={() => { onEdit(artwork.id); onClose(); }}>Edit Details</MenuItem>
            {artwork.status === 'Active' && (
                <MenuItem onClick={() => { onMarkAsSold(artwork.id); onClose(); }}>Mark as Sold</MenuItem>
            )}
            {/* CORRECTED: Properties now exist on the correct Artwork type */}
            {artwork.watermarked_image_url && (
                <MenuItem onClick={() => handleDownload(artwork.watermarked_image_url, `${artwork.slug}-watermarked.png`)}>
                    Download Watermarked
                </MenuItem>
            )}
            {artwork.visualization_image_url && (
                <MenuItem onClick={() => handleDownload(artwork.visualization_image_url, `${artwork.slug}-visualization.jpg`)}>
                    Download Visualization
                </MenuItem>
            )}
            <MenuItem onClick={() => { onDelete(artwork.id, artwork.title); onClose(); }} sx={{ color: 'red' }}>
                Delete Artwork
            </MenuItem>
        </Menu>
    );
};

export default ArtworkActionsMenu;