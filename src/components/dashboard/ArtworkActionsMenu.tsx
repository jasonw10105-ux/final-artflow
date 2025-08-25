import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import { handleDownload } from '../../utils/imageUtils';
import { Database } from '../../types/supabase';

type Artwork = Database['public']['Tables']['artworks']['Row'];

interface ArtworkActionsMenuProps {
    artwork: Artwork;
    anchorEl: null | HTMLElement;
    onClose: () => void;
    onEdit: (id: string) => void;
    onDelete: (id: string, title: string | null) => void;
    onMarkAsSold: (id: string) => void;
    onAssignCatalogue: () => void;
}

const ArtworkActionsMenu = ({ artwork, anchorEl, onClose, onEdit, onDelete, onMarkAsSold, onAssignCatalogue }: ArtworkActionsMenuProps) => {
    const isOpen = Boolean(anchorEl);

    return (
        <Menu anchorEl={anchorEl} open={isOpen} onClose={onClose}>
            <MenuItem onClick={() => { onEdit(artwork.id); onClose(); }}>Edit Details</MenuItem>
            <MenuItem onClick={() => { onAssignCatalogue(); onClose(); }}>Assign to Catalogue</MenuItem>
            {artwork.status === 'Active' && (
                <MenuItem onClick={() => { onMarkAsSold(artwork.id); onClose(); }}>Mark as Sold</MenuItem>
            )}
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
            <MenuItem onClick={() => { onDelete(artwork.id, artwork.title); onClose(); }} sx={{ color: 'var(--color-red-danger)' }}>
                Delete Artwork
            </MenuItem>
        </Menu>
    );
};

export default ArtworkActionsMenu;