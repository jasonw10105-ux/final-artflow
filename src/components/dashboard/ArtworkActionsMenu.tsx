import React, { useState } from 'react';
import { Menu, MenuItem, Backdrop } from '@mui/material';
import { handleDownload } from '../../utils/imageUtils'; // Assuming this utility exists
import { AppArtwork, AppProfile } from '@/types/app-specific.types';
import { useAuth } from '@/contexts/AuthProvider';
import { MoreVertical, Share2, Edit3, DollarSign, Download, Trash2, CheckCircle, Archive, Plus, Eye, XCircle, BookCopy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import ShareButton from '../ui/ShareButton';
import AssignCatalogueModal from './AssignCatalogueModal';
import '@/styles/app.css';
import { ShareButtonProps } from '@/types/modals';

interface ArtworkActionsMenuProps {
  artwork: AppArtwork;
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
  const [showMarkAsSoldModal, setShowMarkAsSoldModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAssignCatalogueModal, setShowAssignCatalogueModal] = useState(false);


  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Corrected optional chaining here:
  const primaryImage = artwork.artwork_images?.find(img => img.is_primary) || artwork.artwork_images?.[0];
  const primaryImageUrl = primaryImage?.image_url || null;

  const publicArtworkUrl = (profile as AppProfile)?.slug && artwork.slug ? `${window.location.origin}/u/${(profile as AppProfile).slug}/artwork/${artwork.slug}` : null;

  const handleMarkAsSold = () => {
    setShowMarkAsSoldModal(true);
    handleClose();
  };

  const confirmMarkAsSold = (saleDetails: { price: number, buyer: string }) => {
    toast.info(`Artwork "${artwork.title}" marked as sold for ${saleDetails.price} to ${saleDetails.buyer}. (This is a simulation. Full backend implementation needed.)`);
    console.log("Mark as Sold:", artwork.id, saleDetails);
    setShowMarkAsSoldModal(false);
  };

  const handleMarkAsAvailable = () => {
    toast.info(`Artwork "${artwork.title}" marked as available. (Simulation. Full backend implementation needed.)`);
    console.log("Mark as Available:", artwork.id);
    handleClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${artwork.title}"? This action cannot be undone.`)) {
      toast.info(`Artwork "${artwork.title}" deleted. (Simulation. Full backend implementation needed.)`);
      console.log("Delete Artwork:", artwork.id);
    }
    handleClose();
  };

  const handleAssignCatalogue = () => {
    setShowAssignCatalogueModal(true);
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
          <BookCopy size={18} className="mr-2" /> Assign to Catalogue
        </MenuItem>

        {artwork.status === 'available' && (
          <MenuItem onClick={handleMarkAsSold}>
            <DollarSign size={18} className="mr-2" /> Mark as Sold (What If?)
          </MenuItem>
        )}

        {(artwork.status === 'sold' || artwork.status === 'draft' || artwork.status === 'pending' || artwork.status === 'on_hold') && (
          <MenuItem onClick={handleMarkAsAvailable}>
            <CheckCircle size={18} className="mr-2" /> Mark as Available
          </MenuItem>
        )}

        {(primaryImage?.watermarked_image_url || primaryImage?.visualization_image_url) && (
            <MenuItem onClick={(e) => e.stopPropagation()}>
                <Download size={18} className="mr-2" /> Download Images
                <Menu
                    anchorEl={anchorEl}
                    open={isOpen}
                    onClose={handleClose}
                    anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    PaperProps={{ className: "sub-menu" }}
                >
                    {primaryImage?.watermarked_image_url && (
                        <MenuItem onClick={() => handleDownload(primaryImage?.watermarked_image_url!, `${artwork.slug ?? 'artwork'}-watermarked.png`)}>
                            <Archive size={18} className="mr-2"/> Watermarked
                        </MenuItem>
                    )}
                    {primaryImage?.visualization_image_url && (
                        <MenuItem onClick={() => handleDownload(primaryImage?.visualization_image_url!, `${artwork.slug ?? 'artwork'}-visualization.jpg`)}>
                            <Archive size={18} className="mr-2"/> Visualization
                        </MenuItem>
                    )}
                </Menu>
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
            byline={(profile as AppProfile)?.full_name || ""}
            previewImageUrls={primaryImageUrl ? [primaryImageUrl] : []}
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
          />
      )}

      {/* Assign to Catalogue Modal */}
      {showAssignCatalogueModal && (
        <AssignCatalogueModal
          artwork={artwork}
          onClose={() => setShowAssignCatalogueModal(false)}
        />
      )}
    </>
  );
};

export default ArtworkActionsMenu;