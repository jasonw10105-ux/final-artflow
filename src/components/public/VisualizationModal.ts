import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import '../../index.css';

interface VisualizationModalProps {
  imageUrl: string;
  artworkTitle: string;
  onClose: () => void;
}

const VisualizationModal = ({ imageUrl, artworkTitle, onClose }: VisualizationModalProps) => {
  // Effect to handle keyboard escape key press to close the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup function to remove the event listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content visualization-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          <X size={24} />
        </button>
        <img 
          src={imageUrl} 
          alt={`Visualization of ${artworkTitle}`} 
          className="visualization-modal-image" 
        />
      </div>
    </div>
  );
};

export default VisualizationModal;