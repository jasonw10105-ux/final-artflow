// src/components/public/VisualizationModal.tsx
// This file was not provided, but inferred from usage.

import React from 'react';
import { XCircle } from 'lucide-react';
import '@/styles/app.css';

interface VisualizationModalProps {
    isOpen: boolean; // Correctly added isOpen
    onClose: () => void;
    imageUrl: string;
    artworkTitle: string;
}

const VisualizationModal: React.FC<VisualizationModalProps> = ({ isOpen, onClose, imageUrl, artworkTitle }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}> {/* Close modal when clicking backdrop */}
            <div className="modal-content visualization-modal-content" onClick={e => e.stopPropagation()}> {/* Prevent closing when clicking inside */}
                <div className="modal-header">
                    <h3>"{artworkTitle}" in a Room</h3>
                    <button type="button" onClick={onClose} className="button-icon"><XCircle size={20} /></button>
                </div>
                <div className="modal-body">
                    {/* Placeholder for a realistic room visualization. */}
                    {/* In a real application, you might integrate a 3rd party service or a custom 3D renderer here. */}
                    <img src={imageUrl} alt={`Visualization of ${artworkTitle} in a room`} className="w-full h-auto object-contain max-h-[70vh]" />
                    <p className="text-muted-foreground text-center mt-4 text-sm">
                        (This is a simulated visualization for scale reference.)
                    </p>
                </div>
                <div className="modal-footer">
                    <button type="button" className="button button-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default VisualizationModal;