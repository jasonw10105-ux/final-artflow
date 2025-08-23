import React, { useState } from 'react';
import { X, Copy, Mail, MessageCircle, Twitter, Facebook } from 'lucide-react';
import '../../index.css';

// A simple Threads icon component as it's not in lucide-react
const ThreadsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18s-1.5-1.5-3-3.5a4.5 4.5 0 1 1 5.5-5.5" />
        <path d="M15 6s1.5 1.5 3 3.5a4.5 4.5 0 1 0-5.5 5.5" />
    </svg>
);

interface ShareModalProps {
  onClose: () => void;
  title: string;
  byline: string;
  shareUrl: string;
  previewImageUrls: string[]; // Accepts multiple images for catalogue previews
  isCatalogue?: boolean;      // To adjust copy
}

const ShareModal = ({ onClose, title, byline, shareUrl, previewImageUrls, isCatalogue = false }: ShareModalProps) => {
    const [copySuccess, setCopySuccess] = useState(false);

    const shareType = isCatalogue ? "catalogue" : "artwork";
    const shareText = `Check out the "${title}" ${shareType} by ${byline} on Artflow: ${shareUrl}`;
    const encodedShareText = encodeURIComponent(shareText);

    const shareOptions = [
        { name: 'Copy Link', icon: <Copy size={24} />, action: () => {
            navigator.clipboard.writeText(shareUrl);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }},
        { name: 'Email', icon: <Mail size={24} />, action: () => {
            window.location.href = `mailto:?subject=${encodeURIComponent(`Artflow ${shareType}: ${title}`)}&body=${encodedShareText}`;
        }},
        { name: 'WhatsApp', icon: <MessageCircle size={24} />, action: () => {
            window.open(`https://api.whatsapp.com/send?text=${encodedShareText}`, '_blank', 'noopener,noreferrer');
        }},
        { name: 'Twitter / X', icon: <Twitter size={24} />, action: () => {
            window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out the "${title}" ${shareType} by ${byline} on Artflow!`)}`, '_blank', 'noopener,noreferrer');
        }},
        { name: 'Facebook', icon: <Facebook size={24} />, action: () => {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
        }},
        { name: 'Threads', icon: <ThreadsIcon />, action: () => {
            window.open(`https://www.threads.net/intent/post?text=${encodedShareText}`, '_blank', 'noopener,noreferrer');
        }},
    ];

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content share-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>
                    <X size={24} />
                </button>
                
                {previewImageUrls && previewImageUrls.length > 0 && (
                    <div className="modal-preview-banner">
                        <div className="share-preview-images">
                            {/* Display up to 5 images in the grid */}
                            {previewImageUrls.slice(0, 5).map((url, index) => (
                                <img key={index} src={url} alt={`${title} preview ${index + 1}`} className="share-preview-image-item" />
                            ))}
                        </div>
                        <div className="modal-preview-info">
                            <p>Sharing {isCatalogue ? 'Catalogue' : 'Artwork'}:</p>
                            <h4>{title}</h4>
                        </div>
                    </div>
                )}

                <h3>Share this {shareType}</h3>
                <p className="modal-subtitle">Share a link with your friends or followers.</p>
                
                <div className="share-options-grid">
                    {shareOptions.map(option => (
                        <button key={option.name} className="share-option-button" onClick={option.action}>
                            <div className="share-icon-wrapper">{option.icon}</div>
                            <span>{option.name}</span>
                        </button>
                    ))}
                </div>
                {copySuccess && <p className="copy-success-message">Link copied to clipboard!</p>}
            </div>
        </div>
    );
};

export default ShareModal;