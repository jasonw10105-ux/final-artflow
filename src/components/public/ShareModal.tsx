// src/components/ShareModal.tsx

import React, { useState } from 'react';
// --- MODIFICATION: Added MoreHorizontal for the new share option ---
import { X, Copy, Mail, MessageCircle, Twitter, Facebook, MoreHorizontal } from 'lucide-react';
import '../../index.css';

// --- SVG Icons for platforms not in lucide-react ---

const ThreadsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18s-1.5-1.5-3-3.5a4.5 4.5 0 1 1 5.5-5.5" />
        <path d="M15 6s1.5 1.5 3 3.5a4.5 4.5 0 1 0-5.5 5.5" />
    </svg>
);

const InstagramIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
    </svg>
);


interface ShareModalProps {
  onClose: () => void;
  title: string;
  byline: string;
  shareUrl: string;
  previewImageUrls: string[];
  isCatalogue?: boolean;
  dimensions?: string | null;
  price?: number | string | null;
  year?: string | number | null;
  currency?: string | null;
}

const ShareModal = ({
    onClose,
    title,
    byline,
    shareUrl,
    previewImageUrls,
    isCatalogue = false,
    dimensions,
    price,
    year,
    currency = 'ZAR'
}: ShareModalProps) => {

    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const shareType = isCatalogue ? "catalogue" : "artwork";
    const formattedPrice = typeof price === 'number' ? `${currency} ${price.toLocaleString()}` : price;
    const detailedText = [ title, dimensions, formattedPrice, year ].filter(Boolean).join('\n');
    const instagramPostText = `${detailedText}\n\nAvailable on artflow.co.za`;
    const conciseShareText = `Check out "${title}" by ${byline} on Artflow: ${shareUrl}`;
    const encodedConciseShareText = encodeURIComponent(conciseShareText);

    const showSuccessMessage = (message: string) => {
        setCopySuccess(message);
        setTimeout(() => setCopySuccess(null), 2500);
    };

    const shareOptions = [
        { name: 'Copy Link', icon: <Copy size={24} />, action: () => {
            navigator.clipboard.writeText(shareUrl);
            showSuccessMessage('Link copied to clipboard!');
        }},
        { name: 'Instagram', icon: <InstagramIcon />, action: () => {
            navigator.clipboard.writeText(instagramPostText);
            showSuccessMessage('Text copied for Instagram! Now save an image and create your post.');
        }},
        { name: 'Email', icon: <Mail size={24} />, action: () => {
            window.location.href = `mailto:?subject=${encodeURIComponent(`Artflow ${shareType}: ${title}`)}&body=${encodeURIComponent(instagramPostText + `\n\nView here: ${shareUrl}`)}`;
        }},
        { name: 'WhatsApp', icon: <MessageCircle size={24} />, action: () => {
            window.open(`https://api.whatsapp.com/send?text=${encodedConciseShareText}`, '_blank', 'noopener,noreferrer');
        }},
        { name: 'Twitter / X', icon: <Twitter size={24} />, action: () => {
            window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out "${title}" by ${byline} on Artflow!`)}`, '_blank', 'noopener,noreferrer');
        }},
        { name: 'Facebook', icon: <Facebook size={24} />, action: () => {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
        }},
        { name: 'Threads', icon: <ThreadsIcon />, action: () => {
            window.open(`https://www.threads.net/intent/post?text=${encodedConciseShareText}`, '_blank', 'noopener,noreferrer');
        }},
    ];

    // --- MODIFICATION: Check for Web Share API support and add the "More" option ---
    // This check ensures the button only appears on compatible browsers (mostly mobile).
    if (navigator.share) {
        shareOptions.push({
            name: 'More Options',
            icon: <MoreHorizontal size={24} />,
            action: async () => {
                try {
                    await navigator.share({
                        title: `Artflow: ${title}`,
                        text: `Check out "${title}" by ${byline} on Artflow`,
                        url: shareUrl,
                    });
                } catch (error) {
                    // This error can happen if the user cancels the share.
                    // We can safely ignore it.
                    console.log('Web Share API canceled or failed', error);
                }
            }
        });
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content share-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>
                    <X size={24} />
                </button>
                
                {previewImageUrls && previewImageUrls.length > 0 && (
                    <div className="modal-preview-banner">
                        <div className="share-preview-images">
                            {previewImageUrls.slice(0, 5).map((url, index) => (
                                <img key={index} src={url} alt={`${title} preview ${index + 1}`} className="share-preview-image-item" />
                            ))}
                        </div>
                        <div className="modal-preview-info">
                            <h3>Share this {shareType}</h3>
                            <h4>{title}</h4>
                        </div>
                    </div>
                )}
                <p className="modal-subtitle">Share with your friends or followers.</p>
                
                <div className="share-options-grid">
                    {shareOptions.map(option => (
                        <button key={option.name} className="share-option-button" onClick={option.action}>
                            <div className="share-icon-wrapper">{option.icon}</div>
                            <span>{option.name}</span>
                        </button>
                    ))}
                </div>

                {copySuccess && <p className="copy-success-message">{copySuccess}</p>}
            </div>
        </div>
    );
};

export default ShareModal;