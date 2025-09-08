// src/components/public/ShareModal.tsx
// This file was not provided, but inferred from usage.

import React, { useState, useEffect } from 'react';
import { RWebShare } from 'react-web-share'; // Assuming this library is installed
import { Copy, XCircle, Facebook, Twitter, Mail, Link as LinkIcon, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppArtwork, AppProfile, ShareButtonProps } from '@/types/app.types'; // Import types

// Helper function to add UTM parameters
const getShareUrlWithUTM = (baseUrl: string, source: string, medium: string, campaign: string) => {
    const url = new URL(baseUrl);
    url.searchParams.set('utm_source', source);
    url.searchParams.set('utm_medium', medium);
    url.searchParams.set('utm_campaign', campaign);
    return url.toString();
};

const ShareModal: React.FC<ShareButtonProps> = ({ // Use ShareButtonProps
    isOpen, 
    onClose, 
    shareUrl, 
    title, 
    byline, 
    previewImageUrls, 
    isCatalogue = false,
    artwork, // Only available if isCatalogue is false
    dimensions, price, year, currency // For catalogue metadata
}) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setCopied(false);
        }
    }, [isOpen]);

    const handleCopyLink = () => {
        const campaignId = isCatalogue 
            ? (artwork?.id || title?.replace(/\s/g, '_').toLowerCase() || 'unknown_catalogue') 
            : (artwork?.id || title?.replace(/\s/g, '_').toLowerCase() || 'unknown_artwork');
        const urlToCopy = getShareUrlWithUTM(shareUrl, 'clipboard', 'manual', campaignId);
        navigator.clipboard.writeText(urlToCopy)
            .then(() => {
                setCopied(true);
                toast.success('Link copied to clipboard!');
            })
            .catch(() => {
                toast.error('Failed to copy link.');
            });
    };

    if (!isOpen) return null;

    // Determine content for WebShare
    const shareText = isCatalogue 
        ? `Check out "${title}" by ${byline} on Artflow!`
        : `Discover "${title}" by ${byline} on Artflow - ${artwork?.price ? `$${artwork.price.toLocaleString()} ${artwork.currency || 'USD'}` : 'Price on request'}`;
    
    const firstPreviewImage = previewImageUrls.filter(Boolean)[0] || '';

    const campaignId = isCatalogue 
        ? (artwork?.id || title?.replace(/\s/g, '_').toLowerCase() || 'unknown_catalogue') 
        : (artwork?.id || title?.replace(/\s/g, '_').toLowerCase() || 'unknown_artwork');

    return (
        <div className="modal-backdrop" onClick={onClose}> {/* Close modal when clicking backdrop */}
            <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}> {/* Prevent closing when clicking inside */}
                <div className="modal-header">
                    <h3>Share {isCatalogue ? 'Catalogue' : 'Artwork'}</h3>
                    <button type="button" onClick={onClose} className="button-icon"><XCircle size={20} /></button>
                </div>
                <div className="modal-body space-y-4">
                    <div className="flex items-center gap-4">
                        <img 
                            src={firstPreviewImage || 'https://placehold.co/100x100?text=Preview'} 
                            alt={title || 'Share Preview'} 
                            className="w-24 h-24 object-cover rounded-lg" 
                        />
                        <div>
                            <p className="font-semibold text-lg">{title || 'Untitled'}</p>
                            <p className="text-muted-foreground">by {byline || 'An Artist'}</p>
                            {!isCatalogue && artwork && (
                                <>
                                    {artwork.price && (
                                        <p className="font-bold text-sm">{new Intl.NumberFormat('en-US', { style: 'currency', currency: artwork.currency || 'USD' }).format(artwork.price)}</p>
                                    )}
                                    {artwork.dimensions?.height && artwork.dimensions?.width && ( // Safely access dimensions
                                        <p className="text-xs text-muted-foreground">{artwork.dimensions.height}x{artwork.dimensions.width} {artwork.dimensions.unit}</p>
                                    )}
                                </>
                            )}
                            {isCatalogue && (
                                <p className="text-xs text-muted-foreground">{dimensions || ''} {price ? `$${price.toLocaleString()}` : ''}</p>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="share-link" className="label">Shareable Link</label>
                        <div className="flex items-center gap-2">
                            <input
                                id="share-link"
                                type="text"
                                value={getShareUrlWithUTM(shareUrl, 'direct', 'copy', campaignId)}
                                readOnly
                                className="input flex-grow"
                            />
                            <button type="button" onClick={handleCopyLink} className="button button-secondary button-with-icon">
                                <Copy size={16} /> {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    <div className="share-options grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <RWebShare
                            data={{
                                text: shareText,
                                url: getShareUrlWithUTM(shareUrl, 'web_share', 'social', campaignId),
                                title: title || 'Artflow Item',
                            }}
                            onClick={() => console.log("Share successful!")}
                        >
                            <button className="share-button-icon">
                                <LinkIcon size={24} /> Web Share
                            </button>
                        </RWebShare>
                        
                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrlWithUTM(shareUrl, 'facebook', 'social', campaignId))}&quote=${encodeURIComponent(shareText)}`} 
                           target="_blank" rel="noopener noreferrer" className="share-button-icon">
                            <Facebook size={24} /> Facebook
                        </a>
                        <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(getShareUrlWithUTM(shareUrl, 'twitter', 'social', campaignId))}&text=${encodeURIComponent(shareText)}`} 
                           target="_blank" rel="noopener noreferrer" className="share-button-icon">
                            <Twitter size={24} /> Twitter
                        </a>
                        <a href={`mailto:?subject=${encodeURIComponent(title || 'Artflow Item')}&body=${encodeURIComponent(shareText + '\n' + getShareUrlWithUTM(shareUrl, 'email', 'manual', campaignId))}`} 
                           className="share-button-icon">
                            <Mail size={24} /> Email
                        </a>
                        {/* More share options can be added here */}
                        <button className="share-button-icon" onClick={() => toast('Download image coming soon!', { icon: '🖼️' })}>
                            <Download size={24} /> Image
                        </button>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="button button-secondary" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;