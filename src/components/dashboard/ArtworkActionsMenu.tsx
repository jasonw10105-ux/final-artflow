import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import { handleDownload } from '../../utils/imageUtils';
import { Database } from '../../types/supabase';
import { useAuth } from '@/contexts/AuthProvider'; // Import useAuth to get the artist's slug

type Artwork = Database['public']['Tables']['artworks']['Row'];

interface ArtworkActionsMenuProps {
    artwork: Artwork;
    anchorEl: null | HTMLElement;
    onClose: () => void;
    onEdit: (id: string) => void;
    onDelete: (id: string, title: string | null) => void;
    onMarkAsSold: (id: string) => void;
    onMarkAsAvailable: (id: string) => void; // <-- NEW PROP
    onAssignCatalogue: () => void;
}

const ArtworkActionsMenu = ({ 
    artwork, 
    anchorEl, 
    onClose, 
    onEdit, 
    onDelete, 
    onMarkAsSold, 
    onMarkAsAvailable, // <-- NEW PROP
    onAssignCatalogue 
}: ArtworkActionsMenuProps) => {
    const { profile } = useAuth(); // Get the current user's profile
    const isOpen = Boolean(anchorEl);

    // Construct the public URL for the "View" button
    const publicUrl = profile?.slug && artwork.slug ? `/${profile.slug}/artwork/${artwork.slug}` : null;

    return (
        <Menu anchorEl={anchorEl} open={isOpen} onClose={onClose}>
            {/* --- NEW: View Button --- */}
            {publicUrl && (
                <MenuItem component="a" href={publicUrl} target="_blank" rel="noopener noreferrer" onClick={onClose}>
                    View Public Page
                </MenuItem>
            )}

            <MenuItem onClick={() => { onEdit(artwork.id); onClose(); }}>Edit Details</MenuItem>
            <MenuItem onClick={() => { onAssignCatalogue(); onClose(); }}>Assign to Catalogue</MenuItem>
            
            {/* --- UPDATED: Conditional Status Buttons --- */}
            {artwork.status === 'Available' && (
                <MenuItem onClick={() => { onMarkAsSold(artwork.id); onClose(); }}>Mark as Sold</MenuItem>
            )}
            {(artwork.status === 'Sold' || artwork.status === 'Pending') && (
                <MenuItem onClick={() => { onMarkAsAvailable(artwork.id); onClose(); }}>Mark as Available</MenuItem>
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