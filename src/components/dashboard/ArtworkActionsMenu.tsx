// src/components/dashboard/ArtworkActionsMenu.tsx

import React, { useState } from 'react';
import { MoreHorizontal, Download, Image, Eye } from 'lucide-react';
import { Database } from '../../types/supabase';
import { downloadImageAsInstagramSquare } from '../../utils/imageUtils';

type Artwork = Database['public']['Tables']['artworks']['Row'];

interface ArtworkActionsMenuProps {
  artwork: Artwork;
}

const ArtworkActionsMenu = ({ artwork }: ArtworkActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = (type: 'artwork' | 'visualization') => {
    let url: string | null = null;
    let baseFilename = artwork.slug || artwork.id;

    if (type === 'artwork' && artwork.watermarked_image_url) {
      url = artwork.watermarked_image_url;
      baseFilename += '-artwork-insta.jpg';
    } else if (type === 'visualization' && artwork.visualization_image_url) {
      url = artwork.visualization_image_url;
      baseFilename += '-viz-insta.jpg';
    }

    if (url) {
      downloadImageAsInstagramSquare(url, baseFilename);
    } else {
      alert(`The ${type} image URL is missing.`);
    }
    setIsOpen(false); // Close menu after action
  };

  // Only render the component if there's at least one downloadable image
  if (!artwork.watermarked_image_url && !artwork.visualization_image_url) {
    return null;
  }

  return (
    <div style={{ position: 'relative' }}>
      <button 
        className="button-secondary button" 
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <div 
            style={{ 
                position: 'absolute', 
                top: '100%', 
                right: 0, 
                background: 'var(--card)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius)', 
                marginTop: '0.5rem',
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                width: '240px'
            }}
            onMouseLeave={() => setIsOpen(false)}
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: '0.5rem' }}>
            {artwork.watermarked_image_url && (
              <li>
                <button onClick={() => handleDownload('artwork')} className="dropdown-button">
                  <Image size={16} /> Download Artwork (Insta)
                </button>
              </li>
            )}
            {artwork.visualization_image_url && (
              <li>
                <button onClick={() => handleDownload('visualization')} className="dropdown-button">
                  <Eye size={16} /> Download Visualization (Insta)
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ArtworkActionsMenu;