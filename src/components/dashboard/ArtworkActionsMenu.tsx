// src/components/dashboard/ArtworkActionsMenu.tsx
import React, { useState } from 'react';
import { Menu, MenuItem, Backdrop } from '@mui/material'; // Backdrop for modal like effect
import { handleDownload } from '../../utils/imageUtils'; // Assuming imageUtils exists
import { AppArtwork } from '@/types/app.types'; // Use AppArtwork for consistency
import { useAuth } from '@/contexts/AuthProvider';
import { MoreVertical, Share2, Edit3, DollarSign, Download, Trash2, CheckCircle, Archive, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import ShareButton from '../ui/ShareButton'; // Reusable ShareButton component
import '@/styles/app.css'; // Import the centralized styles

interface ArtworkActionsMenuProps {
  artwork: AppArtwork; // Use AppArtwork
}

// "What If" Mark as Sold Modal Component
interface MarkAsSoldModalProps {
    isOpen: boolean;
    onClose: () => void;
    artworkTitle: string;
    onConfirm: (saleDetails: { price: number, buyer: string }) => void;
}

const MarkAsSoldModal: React.FC<MarkAsSoldModalProps> = ({ isOpen, onClose, artworkTitle, onConfirm }) => {
    const [price, setPrice] = useState<number | ''>('');
    const [buyer, setBuyer] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (price === '' || isNaN(price as number) || (price as number) <= 0) {
            newErrors.price = 'Valid price is required.';
        }
        if (!buyer.trim()) {
            newErrors.buyer = 'Buyer name is required.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onConfirm({ price: price as number, buyer });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <Backdrop open={isOpen} onClick={onClose} style={{ zIndex: 1200 }}>
          <div className="modal-content bulk-actions-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h3>Mark Artwork as Sold</h3>
                <button type="button" onClick={onClose} className="button-icon-secondary"><XCircle size={20} /></button>
            </div>
            <p className="modal-subtitle">Enter details for this simulated sale of: <strong>{artworkTitle}</strong></p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label htmlFor="salePrice" className="label">Sale Price</label>
                <input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => { setPrice(parseFloat(e.target.value) || ''); setErrors(prev => ({...prev, price: ''})); }}
                    required
                    className={`input ${errors.price ? 'input-error' : ''}`}
                    placeholder="e.g., 2500.00"
                />
                {errors.price && <p className="error-message">{errors.price}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="buyerName" className="label">Buyer Name</label>
                <input
                    id="buyerName"
                    type="text"
                    value={buyer}
                    onChange={(e) => { setBuyer(e.target.value); setErrors(prev => ({...prev, buyer: ''})); }}
                    required
                    className={`input ${errors.buyer ? 'input-error' : ''}`}
                    placeholder="e.g., Jane Doe"
                />
                {errors.buyer && <p className="error-message">{errors.buyer}</p>}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={onClose} className="button button-secondary">Cancel</button>
                <button type="submit" className="button button-primary">Confirm Sale</button>
              </div>
            </form>
          </div>
        </Backdrop>
      );
};


const ArtworkActionsMenu: React.FC<ArtworkActionsMenuProps> = ({ artwork }) => {
  const { profile } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);
  const [showMarkAsSoldModal, setShowMarkAsSoldModal] = useState(false); // For "What If" status change
  const [showShareModal, setShowShareModal] = useState(false); // For ShareButton

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Helper to get primary image for sharing
  const primaryImage = artwork.artwork_images?.find(img => img.is_primary) || artwork.artwork_images?.[0];
  const primaryImageUrl = primaryImage?.image_url || null;


  const publicArtworkUrl = profile?.slug && artwork.slug ? `${window.location.origin}/u/${profile.slug}/artwork/${artwork.slug}` : null;

  const handleMarkAsSold = () => {
    setShowMarkAsSoldModal(true);
    handleClose(); // Close main menu
  };

  const confirmMarkAsSold = (saleDetails: { price: number, buyer: string }) => {
    toast.info(`Artwork "${artwork.title}" marked as sold for ${saleDetails.price} to ${saleDetails.buyer}. (Feature not fully implemented)`);
    console.log("Mark as Sold:", artwork.id, saleDetails);
    // Invalidate queries to update artwork status (example placeholder)
    // queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
    setShowMarkAsSoldModal(false); // Close the "What If" modal
  };

  const handleMarkAsAvailable = () => {
    toast.info(`Artwork "${artwork.title}" marked as available. (Feature not fully implemented)`);
    console.log("Mark as Available:", artwork.id);
    // Invalidate queries to update artwork status
    // queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
    handleClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${artwork.title}"? This action cannot be undone.`)) {
      toast.info(`Artwork "${artwork.title}" deleted. (Feature not fully implemented)`);
      console.log("Delete Artwork:", artwork.id);
      // Invalidate queries
      // queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
    }
    handleClose();
  };

  const handleAssignCatalogue = () => {
    toast.info(`Assigning "${artwork.title}" to catalogue. (Feature not fully implemented)`);
    // Navigate to catalogue wizard or open a modal to select catalogue
    // navigate(`/u/artworks/assign-catalogue/${artwork.id}`);
    handleClose();
  };

  return (
    <>
      <button onClick={handleClick} className="button-icon" aria-label="Artwork Actions">
        <MoreVertical size={20} />
      </button>

      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
        PaperProps={{
            className: "artwork-actions-menu"
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {publicArtworkUrl && (
          <MenuItem component={Link} to={publicArtworkUrl} target="_blank" rel="noopener noreferrer" onClick={handleClose}>
            <Eye size={18} className="mr-2" /> View Public Page
          </MenuItem>
        )}

        <MenuItem component={Link} to={`/u/artworks/edit/${artwork.id}`} onClick={handleClose}>
          <Edit3 size={18} className="mr-2" /> Edit Details
        </MenuItem>

        <MenuItem onClick={handleAssignCatalogue}>
          <Plus size={18} className="mr-2" /> Assign to Catalogue
        </MenuItem>

        {artwork.status === 'available' && ( // Use harmonized status type
          <MenuItem onClick={handleMarkAsSold}>
            <DollarSign size={18} className="mr-2" /> Mark as Sold (What If?)
          </MenuItem>
        )}

        {(artwork.status === 'sold' || artwork.status === 'draft' || artwork.status === 'pending' || artwork.status === 'on hold') && (
          <MenuItem onClick={handleMarkAsAvailable}>
            <CheckCircle size={18} className="mr-2" /> Mark as Available
          </MenuItem>
        )}

        {(artwork.watermarked_image_url || artwork.visualization_image_url) && (
            <MenuItem onClick={() => { /* This item is just a container for sub-downloads */ }}>
                <Download size={18} className="mr-2" /> Download Images
                {artwork.watermarked_image_url && (
                    <MenuItem onClick={() => handleDownload(artwork.watermarked_image_url!, `${artwork.slug ?? 'artwork'}-watermarked.png`)} className="sub-menu-item">
                        <Archive size={18} className="mr-2"/> Watermarked
                    </MenuItem>
                )}
                {artwork.visualization_image_url && (
                    <MenuItem onClick={() => handleDownload(artwork.visualization_image_url!, `${artwork.slug ?? 'artwork'}-visualization.jpg`)} className="sub-menu-item">
                        <Archive size={18} className="mr-2"/> Visualization
                    </MenuItem>
                )}
            </MenuItem>
        )}

        {publicArtworkUrl && (
            <MenuItem onClick={() => setShowShareModal(true)}>
                <Share2 size={18} className="mr-2" /> Share Artwork
            </MenuItem>
        )}

        <MenuItem onClick={handleDelete} className="text-red-500">
          <Trash2 size={18} className="mr-2" /> Delete Artwork
        </MenuItem>
      </Menu>

      {/* "What If" Mark as Sold Modal */}
      <MarkAsSoldModal
        isOpen={showMarkAsSoldModal}
        onClose={() => setShowMarkAsSoldModal(false)}
        artworkTitle={artwork.title || "Untitled Artwork"}
        onConfirm={confirmMarkAsSold}
      />

      {/* Share Artwork Modal */}
      {showShareModal && publicArtworkUrl && (
          <ShareButton
            shareUrl={publicArtworkUrl}
            title={artwork.title || "Artwork"}
            byline={profile?.full_name || ""}
            previewImageUrls={primaryImageUrl ? [primaryImageUrl] : []}
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
          />
      )}
    </>
  );
};

export default ArtworkActionsMenu;