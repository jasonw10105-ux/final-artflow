// src/components/dashboard/ArtworkActionsMenu.tsx

import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Download, Image, Eye, Pencil, Trash2, DollarSign } from 'lucide-react';
import { Database } from '../../types/supabase';
import { downloadImageAsInstagramSquare } from '../../utils/imageUtils';

type Artwork = Database['public']['Tables']['artworks']['Row'];

interface ArtworkActionsMenuProps {
  artwork: Artwork;
  onEdit: () => void;
  onDelete: () => void;
  onMarkAsSold: () => void;
}

const ArtworkActionsMenu = ({ artwork, onEdit, onDelete, onMarkAsSold }: ArtworkActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = (type: 'artwork' | 'visualization') => {
    const url = type === 'artwork' ? artwork.watermarked_image_url : artwork.visualization_image_url;
    const baseFilename = artwork.slug || artwork.id;
    if (url) {
      downloadImageAsInstagramSquare(url, `${baseFilename}-${type}-insta.jpg`);
    } else {
      alert(`The ${type} image is missing.`);
    }
    setIsOpen(false);
  };
  
  const isSold = artwork.status === 'Sold';

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button 
        className="button-secondary button" 
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <ul className="dropdown-list">
            <li><button onClick={() => { onEdit(); setIsOpen(false); }} className="dropdown-button"><Pencil size={16} /> Edit Details</button></li>
            {!isSold && (
              <li><button onClick={() => { onMarkAsSold(); setIsOpen(false); }} className="dropdown-button"><DollarSign size={16} /> Mark as Sold</button></li>
            )}
            <hr className="dropdown-divider" />
            {artwork.watermarked_image_url && (
              <li><button onClick={() => handleDownload('artwork')} className="dropdown-button"><Image size={16} /> Download Artwork (Insta)</button></li>
            )}
            {artwork.visualization_image_url && (
              <li><button onClick={() => handleDownload('visualization')} className="dropdown-button"><Eye size={16} /> Download Visualization (Insta)</button></li>
            )}
            <hr className="dropdown-divider" />
            <li><button onClick={() => { onDelete(); setIsOpen(false); }} className="dropdown-button dropdown-button-danger"><Trash2 size={16} /> Delete Artwork</button></li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ArtworkActionsMenu;