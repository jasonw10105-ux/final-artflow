import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { supabase } from '@/lib/supabaseClient';
import InquiryModal from '@/components/public/InquiryModal';
import ShareModal from '@/components/public/ShareModal';
import VisualizationModal from '@/components/public/VisualizationModal';
import { Database } from '@/types/database.types';

// --- Type Definitions ---
type Profile = Database['public']['Tables']['profiles']['Row'];
type Artwork = Database['public']['Tables']['artworks']['Row'] & {
    artist: Profile; // The joined profile data is now required
};

// --- API Fetching Functions ---
const fetchArtworkBySlug = async (slug: string): Promise<Artwork> => {
    const { data, error } = await supabase
        .from('artworks')
        .select(`*, artist:profiles!user_id(*)`)
        .eq('slug', slug)
        .single();
    if (error) throw new Error(error.message);
    return data as Artwork;
};

const fetchRelatedArtworks = async (artistId: string, currentArtworkId: string): Promise<Artwork[]> => {
    const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('user_id', artistId)
        .neq('id', currentArtworkId)
        .eq('status', 'Active')
        .limit(4);
    if (error) throw new Error(error.message);
    return data as Artwork[];
};

// --- The Main Page Component ---
const IndividualArtworkPage = () => {
    const { artworkSlug } = useParams<{ artworkSlug: string }>();
    const { addArtwork } = useRecentlyViewed();

    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showVisualizationModal, setShowVisualizationModal] = useState(false);
    const [activeTab, setActiveTab] = useState('about'); // State for the tabs

    const { data: artwork, isLoading, isError } = useQuery({
        queryKey: ['artwork', artworkSlug],
        queryFn: () => fetchArtworkBySlug(artworkSlug!),
        enabled: !!artworkSlug,
    });

    const { data: relatedArtworks, isLoading: isLoadingRelated } = useQuery({
        queryKey: ['relatedArtworks', artwork?.artist.id],
        queryFn: () => fetchRelatedArtworks(artwork!.artist.id, artwork!.id),
        enabled: !!artwork?.artist?.id,
    });

    useEffect(() => {
        if (artwork) {
            addArtwork(artwork);
        }
    }, [artwork, addArtwork]);

    useEffect(() => {
        const isModalOpen = showInquiryModal || showShareModal || showVisualizationModal;
        document.body.style.overflow = isModalOpen ? 'hidden' : 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [showInquiryModal, showShareModal, showVisualizationModal]);

    if (isLoading) {
        return <div className="page-container"><p style={{ textAlign: 'center', padding: '5rem' }}>Loading Artwork...</p></div>;
    }

    if (isError || !artwork) {
        return (
            <div className="page-container" style={{ textAlign: 'center' }}>
                <h1>Artwork Not Found</h1>
                <p>The piece you are looking for does not exist or has been moved.</p>
                <Link to="/artworks" className="button button-primary">Browse All Artworks</Link>
            </div>
        );
    }

    const artistLocation = artwork.artist?.location
        ? [(artwork.artist.location as any).city, (artwork.artist.location as any).country].filter(Boolean).join(', ')
        : null;

    const artworkDimensions = artwork.dimensions
        ? [(artwork.dimensions as any).height, (artwork.dimensions as any).width, (artwork.dimensions as any).depth].filter(Boolean).join(' x ') + ((artwork.dimensions as any).unit ? ` ${(artwork.dimensions as any).unit}` : '')
        : null;

    // --- Logic to determine if tabs should be displayed ---
    const hasAboutTab = artwork.description || artwork.medium || artworkDimensions || (artwork.signature_info as any)?.is_signed || (artwork.framing_info as any)?.is_framed;
    const hasProvenanceTab = !!artwork.provenance;
    const showTabs = hasAboutTab || hasProvenanceTab;

    // Effect to ensure a valid tab is always selected if one becomes available
    useEffect(() => {
        if (showTabs && !hasAboutTab) {
            setActiveTab('provenance');
        } else {
            setActiveTab('about');
        }
    }, [showTabs, hasAboutTab]);


    return (
        <>
            <div className="page-container">
                <div className="artwork-layout-grid">
                    <div className="artwork-image-column">
                        {artwork.image_url && <img src={artwork.image_url} alt={artwork.title || ''} className="main-artwork-image" />}
                        {artwork.visualization_image_url && (
                            <button onClick={() => setShowVisualizationModal(true)} className="button-secondary view-in-room-button">
                                View in a Room
                            </button>
                        )}
                    </div>

                    <div className="artwork-main-info">
                        {artwork.artist?.slug && <h1><Link to={`/${artwork.artist.slug}`} className="artist-link">{artwork.artist.full_name}</Link></h1>}
                        <h2 style={{ fontStyle: 'italic', margin: '0.25rem 0 1.5rem 0' }}>{artwork.title}</h2>

                        <div className="price-container">
                            <p className="artwork-price">
                                {artwork.price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: artwork.currency || 'USD' }).format(artwork.price) : 'Price on Request'}
                                {artwork.is_price_negotiable && <span className="negotiable-badge">Negotiable</span>}
                            </p>
                        </div>
                        
                        <div className="artwork-actions">
                            <button onClick={() => setShowInquiryModal(true)} className="button button-primary">Inquire</button>
                            <button onClick={() => setShowShareModal(true)} className="button button-secondary">Share</button>
                        </div>
                    </div>
                </div>

                {/* --- RESTORED: Tabbed Interface for Artwork Details --- */}
                {showTabs && (
                    <div className="artwork-details-section artwork-tabs">
                        <div className="tab-header">
                            {hasAboutTab && <button className={`tab-button ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>About this Work</button>}
                            {hasProvenanceTab && <button className={`tab-button ${activeTab === 'provenance' ? 'active' : ''}`} onClick={() => setActiveTab('provenance')}>Provenance</button>}
                        </div>
                        <div className="tab-content">
                            {activeTab === 'about' && (
                                <div>
                                    {artwork.description && <p>{artwork.description}</p>}
                                    <ul className="details-list">
                                        {artwork.medium && <li><strong>Medium:</strong> {artwork.medium}</li>}
                                        {artworkDimensions && <li><strong>Dimensions:</strong> {artworkDimensions}</li>}
                                        {(artwork.signature_info as any)?.is_signed && <li><strong>Signature:</strong> Signed {(artwork.signature_info as any).location ? `(${(artwork.signature_info as any).location})` : ''}</li>}
                                        {(artwork.framing_info as any)?.is_framed && <li><strong>Framing:</strong> {(artwork.framing_info as any).details || 'Framed'}</li>}
                                    </ul>
                                </div>
                            )}
                            {activeTab === 'provenance' && (
                                <p style={{ whiteSpace: 'pre-wrap' }}>
                                    {artwork.provenance}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {artwork.artist && (
                    <div className="artwork-details-section artist-spotlight">
                        {artwork.artist.avatar_url && <img src={artwork.artist.avatar_url} alt={artwork.artist.full_name || ''} className="artist-avatar" />}
                        <div>
                            <h3>About {artwork.artist.full_name}</h3>
                            {artistLocation && <p className="artist-location">{artistLocation}</p>}
                            <p className="artist-bio">{artwork.artist.short_bio || artwork.artist.bio}</p>
                            {artwork.artist.slug && <Link to={`/${artwork.artist.slug}`} className="button-link">View artist profile &rarr;</Link>}
                        </div>
                    </div>
                )}

                {!isLoadingRelated && relatedArtworks && relatedArtworks.length > 0 && (
                    <div className="artwork-details-section">
                         <div className="related-header">
                            <h3>Other works by {artwork.artist.full_name}</h3>
                            {artwork.artist.slug && <Link to={`/${artwork.artist.slug}`} className="button-link">View all</Link>}
                        </div>
                        <div className="related-grid">
                            {relatedArtworks.map((art) => (
                                art.slug && artwork.artist.slug && (
                                    <Link to={`/${artwork.artist.slug}/artwork/${art.slug}`} key={art.id} className="artwork-card-link">
                                        <div className="artwork-card">
                                            {art.image_url && <img src={art.image_url} alt={art.title || ''} className="artwork-card-image" />}
                                            <div className="artwork-card-info">
                                                {art.title && <h4 style={{fontStyle: 'italic'}}>{art.title}</h4>}
                                                {art.price && <p>{new Intl.NumberFormat('en-US', { style: 'currency', currency: art.currency || 'USD' }).format(art.price)}</p>}
                                            </div>
                                        </div>
                                    </Link>
                                )
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {showInquiryModal && (
                <InquiryModal artworkId={artwork.id} onClose={() => setShowInquiryModal(false)} />
            )}

            {showShareModal && (
                <ShareModal
                    onClose={() => setShowShareModal(false)}
                    title={artwork.title || 'Untitled'}
                    byline={artwork.artist.full_name || 'Unknown Artist'}
                    shareUrl={window.location.href}
                    previewImageUrls={[artwork.image_url || '']}
                    isCatalogue={false}
                    dimensions={artworkDimensions}
                    price={artwork.price}
                    year={null}
                />
            )}

            {showVisualizationModal && artwork.visualization_image_url && (
                 <VisualizationModal
                    imageUrl={artwork.visualization_image_url}
                    artworkTitle={artwork.title || 'Artwork'}
                    onClose={() => setShowVisualizationModal(false)}
                />
            )}
        </>
    );
};

export default IndividualArtworkPage;