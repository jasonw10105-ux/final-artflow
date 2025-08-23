import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider'; // Corrected import path
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import InquiryModal from '../../components/public/InquiryModal';
import ShareModal from '../../components/public/ShareModal';
import { Share2, ShoppingCart, ArrowLeft, Eye, X, Edit3, CheckCircle, Clock, Info } from 'lucide-react';
import '../../index.css';

// --- Reusable Visualization Modal Component ---
const VisualizationModal = ({ imageUrl, artworkTitle, onClose }: { imageUrl: string; artworkTitle: string; onClose: () => void; }) => (
    <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content visualization-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-button" onClick={onClose}>
                <X size={24} />
            </button>
            <img src={imageUrl} alt={`Visualization of ${artworkTitle}`} className="visualization-modal-image" />
        </div>
    </div>
);


// --- Fetch Functions ---
const fetchArtworkBySlug = async (artworkSlug: string | undefined) => {
    if (!artworkSlug) throw new Error("Artwork slug is required.");
    const { data, error } = await supabase
        .from('artworks')
        .select('*, artist:profiles!inner(full_name, slug, bio, short_bio, avatar_url, location, id)')
        .eq('slug', artworkSlug)
        .single();
    if (error) throw new Error('Artwork not found');
    return data;
};

const fetchRelatedArtworks = async (artworkId: string, artistId: string) => {
    const { data, error } = await supabase.rpc('get_related_artworks', {
        p_artist_id: artistId,
        p_current_artwork_id: artworkId,
        p_limit: 4
    });
    if (error) {
        console.error("Error fetching related artworks:", error);
        throw new Error('Could not fetch related artworks.');
    }
    return data;
};

const IndividualArtworkPage = () => {
    const { artworkSlug } = useParams<{ artworkSlug: string }>();
    const { profile } = useAuth();
    const navigate = useNavigate();
    const { addViewedArtwork } = useRecentlyViewed();

    // --- State Management ---
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [showVisualizationModal, setShowVisualizationModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [activeTab, setActiveTab] = useState('about');

    // --- Data Fetching ---
    const { data: artwork, isLoading, isError } = useQuery({
        queryKey: ['artwork', artworkSlug],
        queryFn: () => fetchArtworkBySlug(artworkSlug),
        enabled: !!artworkSlug,
    });

    const { data: relatedArtworks, isLoading: isLoadingRelated } = useQuery({
        queryKey: ['relatedArtworks', artwork?.id],
        queryFn: () => fetchRelatedArtworks(artwork!.id, artwork!.user_id),
        enabled: !!artwork,
    });

    // --- Effects ---
    useEffect(() => {
        if (artwork) {
            addViewedArtwork?.(artwork.id);
            supabase.rpc('log_artwork_view', { p_artwork_id: artwork.id, p_artist_id: artwork.user_id });
        }
    }, [artwork, addViewedArtwork]);

    useEffect(() => {
        const isModalOpen = showVisualizationModal || showInquiryModal || showShareModal;
        document.body.style.overflow = isModalOpen ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [showVisualizationModal, showInquiryModal, showShareModal]);

    // --- Event Handlers ---
    const handleBuyNow = () => alert('Payment gateway integration needed.');

    // --- Loading & Error States ---
    if (isLoading) return <p className="loading-placeholder">Loading artwork...</p>;
    if (isError || !artwork) return (
        <div className="not-found-container">
            <h1>404 - Artwork Not Found</h1>
            <p>The artwork you are looking for does not exist or has been moved.</p>
            <Link to="/artworks" className="button button-primary">Browse All Artworks</Link>
        </div>
    );

    // --- Derived State & Variables ---
    const isOwner = profile?.id === artwork.artist.id;
    const creationYear = artwork.created_at ? new Date(artwork.created_at).getFullYear() : null;
    const hasAboutTab = artwork.medium || artwork.framing_info?.is_framed || artwork.signature_info?.is_signed;
    const hasProvenance = artwork.provenance;
    const showTabs = hasAboutTab || hasProvenance;

    const getBannerInfo = () => {
        switch (artwork.status) {
            case 'Active': return { text: 'This artwork is active and visible to the public.', icon: <CheckCircle size={16} /> };
            case 'Pending': return { text: 'This artwork is pending details and not yet public.', icon: <Clock size={16} /> };
            case 'Sold': return { text: 'This artwork has been marked as sold.', icon: <Info size={16} /> };
            default: return { text: `This artwork has a status of ${artwork.status}.`, icon: <Info size={16} /> };
        }
    };
    const bannerInfo = getBannerInfo();

    const renderPrice = () => {
        if (artwork.status === 'Sold') {
            return <p className="artwork-price sold">Sold</p>;
        }
        if (artwork.is_price_negotiable && artwork.price) {
             return <h2 className="artwork-price">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(artwork.price)} <span className="negotiable-badge">Negotiable</span></h2>;
        }
        if (artwork.price) {
            return <h2 className="artwork-price">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(artwork.price)}</h2>;
        }
        return <h2 className="artwork-price">Price on request</h2>;
    };

    return (
        <div className="page-container">
            {isOwner && (
                <div className="owner-preview-banner">
                    <div className="banner-info">
                        {bannerInfo.icon}
                        <span>You are viewing your own artwork. {bannerInfo.text}</span>
                    </div>
                    <Link to={`/artist/artworks/edit/${artwork.id}`} className="button button-secondary">
                        <Edit3 size={16} /> Edit Artwork
                    </Link>
                </div>
            )}

            <button onClick={() => navigate(-1)} className="button button-secondary back-button">
                <ArrowLeft size={16} /> Back
            </button>

            <div className="artwork-layout-grid">
                <div className="artwork-image-column">
                    <img src={artwork.image_url || 'https://placehold.co/800x800?text=Image+Not+Available'} alt={artwork.title || ''} className="main-artwork-image"/>
                    
                    {artwork.visualization_image_url && (
                        <button className="button button-secondary view-in-room-button" onClick={() => setShowVisualizationModal(true)}>
                            <Eye size={16} /> View in a Room
                        </button>
                    )}
                </div>
                <div className="artwork-main-info">
                    <Link to={`/${artwork.artist.slug}`} className="artist-link">{artwork.artist.full_name}</Link>
                    <h1 className="artwork-title">
                        <i>{artwork.title}</i>
                        {creationYear && <span className="artwork-date">, {creationYear}</span>}
                    </h1>
                    <p className="artwork-medium">{artwork.medium}</p>
                    <div className="price-container">{renderPrice()}</div>
                    <div className="artwork-actions">
                        {artwork.status !== 'Sold' && (
                            <>
                                {artwork.price && !artwork.is_price_negotiable && (
                                    <button className="button button-primary" onClick={handleBuyNow}>
                                        <ShoppingCart size={16} /> Purchase
                                    </button>
                                )}
                                <button className="button button-secondary" onClick={() => setShowInquiryModal(true)}>Inquire</button>
                            </>
                        )}
                        <button className="button button-secondary" onClick={() => setShowShareModal(true)}>
                            <Share2 size={16} /> Share
                        </button>
                    </div>
                    {artwork.catalogue_id && (
                        <p className="catalogue-note">
                            This work is part of a curated catalogue.
                            <Link to={`/${artwork.artist.slug}/catalogue/${artwork.catalogue_id}`}> View Catalogue</Link>
                        </p>
                    )}
                </div>
            </div>

            {showTabs && (
                <div className="artwork-details-section artwork-tabs">
                    <div className="tab-header">
                        {hasAboutTab && <button className={`tab-button ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>About this Work</button>}
                        {hasProvenance && <button className={`tab-button ${activeTab === 'provenance' ? 'active' : ''}`} onClick={() => setActiveTab('provenance')}>Provenance</button>}
                    </div>
                    <div className="tab-content">
                        {activeTab === 'about' && (
                            <div>
                                <p>{artwork.description || "No description provided."}</p>
                                <ul className="details-list">
                                    {artwork.medium && <li><strong>Medium:</strong> {artwork.medium}</li>}
                                    {artwork.dimensions?.width && artwork.dimensions?.height && <li><strong>Dimensions:</strong> {artwork.dimensions.height} × {artwork.dimensions.width}{artwork.dimensions.depth ? ` × ${artwork.dimensions.depth}`: ''} {artwork.dimensions.unit || ''}</li>}
                                    {artwork.signature_info?.is_signed && <li><strong>Signature:</strong> Signed{artwork.signature_info.location ? ` (${artwork.signature_info.location})` : ''}</li>}
                                    {artwork.framing_info?.is_framed && <li><strong>Framing:</strong> {artwork.framing_info.details || 'Framed'}</li>}
                                </ul>
                            </div>
                        )}
                        {activeTab === 'provenance' && <p style={{ whiteSpace: 'pre-wrap' }}>{artwork.provenance}</p>}
                    </div>
                </div>
            )}

            {(artwork.artist.bio || artwork.artist.short_bio) && (
                <div className="artwork-details-section artist-spotlight">
                    <img src={artwork.artist.avatar_url || 'https://placehold.co/128x128'} alt={artwork.artist.full_name || ''} className="artist-avatar" />
                    <div>
                        <h3>About {artwork.artist.full_name}</h3>
                        {artwork.artist.location?.city || artwork.artist.location?.country ? <p className="artist-location">{artwork.artist.location.city}{artwork.artist.location.city && artwork.artist.location.country ? ', ' : ''}{artwork.artist.location.country}</p> : null}
                        <p className="artist-bio">{artwork.artist.bio || artwork.artist.short_bio}</p>
                        <Link to={`/${artwork.artist.slug}`} className="button-link">View artist profile &rarr;</Link>
                    </div>
                </div>
            )}
            
            <div className="artwork-details-section">
                <div className="related-header">
                    <h3>Other works by {artwork.artist.full_name}</h3>
                    <Link to={`/${artwork.artist.slug}`} className="button-link">View all</Link>
                </div>
                {isLoadingRelated && <p>Loading suggestions...</p>}
                {relatedArtworks && relatedArtworks.length > 0 ? (
                    <div className="related-grid">
                        {relatedArtworks.map((art: any) => (
                            <Link to={`/${artwork.artist.slug}/artwork/${art.slug}`} key={art.id} className="artwork-card-link">
                                <div className="artwork-card">
                                    <img src={art.image_url || 'https://placehold.co/300x300'} alt={art.title || ''} className="artwork-card-image" />
                                    <div className="artwork-card-info">
                                        <h4>{art.title}</h4>
                                        <p>${art.price?.toLocaleString('en-US')}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : ( !isLoadingRelated && <p>No related artworks found.</p> )}
            </div>

            {/* --- Modals --- */}
            {showInquiryModal && <InquiryModal artworkId={artwork.id} onClose={() => setShowInquiryModal(false)} previewImageUrl={artwork.image_url || undefined} previewTitle={artwork.title || undefined} />}
            {showVisualizationModal && artwork.visualization_image_url && <VisualizationModal imageUrl={artwork.visualization_image_url} artworkTitle={artwork.title || 'Artwork'} onClose={() => setShowVisualizationModal(false)} />}
            {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} title={artwork.title || 'Untitled'} byline={artwork.artist.full_name || 'Unknown Artist'} shareUrl={window.location.href} previewImageUrls={[artwork.image_url || '']} />}
        </div>
    );
};

export default IndividualArtworkPage;