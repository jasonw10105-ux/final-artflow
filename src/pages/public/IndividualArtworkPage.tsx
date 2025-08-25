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
// CORRECTED: The artist property is now optional to handle a failed left join gracefully
type Artwork = Database['public']['Tables']['artworks']['Row'] & {
    artist: Profile | null; 
};

// --- API Fetching Functions (Corrected) ---
const fetchArtworkBySlug = async (slug: string): Promise<Artwork> => {
    // CORRECTED: Changed the inner join (!) to a standard left join.
    // This will return the artwork even if the artist profile is missing.
    const { data, error } = await supabase
        .from('artworks')
        .select(`*, artist:profiles(*)`) 
        .eq('slug', slug)
        .single();

    if (error) {
        console.error("Error fetching artwork by slug:", error);
        throw new Error(error.message);
    }
    if (!data) {
        throw new Error("Artwork not found.");
    }
    return data as Artwork;
};

const fetchRelatedArtworks = async (artistId: string, currentArtworkId: string): Promise<Artwork[]> => {
    // CORRECTED: Changed status check from 'Active' to 'Available' to match your schema.
    const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('user_id', artistId)
        .neq('id', currentArtworkId)
        .eq('status', 'Available') // Use 'Available' as per your types
        .limit(4);

    if (error) {
        console.error("Error fetching related artworks:", error);
        throw new Error(error.message);
    }
    return data as Artwork[];
};

// --- The Main Page Component ---
const IndividualArtworkPage = () => {
    const { artworkSlug } = useParams<{ artworkSlug: string }>();
    const { addArtwork } = useRecentlyViewed();

    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showVisualizationModal, setShowVisualizationModal] = useState(false);
    const [activeTab, setActiveTab] = useState('about');

    const { data: artwork, isLoading, isError, error } = useQuery({
        queryKey: ['artwork', artworkSlug],
        queryFn: () => fetchArtworkBySlug(artworkSlug!),
        enabled: !!artworkSlug,
        retry: 1, // Don't retry endlessly on a 404
    });

    const { data: relatedArtworks, isLoading: isLoadingRelated } = useQuery({
        queryKey: ['relatedArtworks', artwork?.artist?.id],
        queryFn: () => fetchRelatedArtworks(artwork!.artist!.id, artwork!.id),
        enabled: !!artwork?.artist?.id,
    });

    useEffect(() => {
        // Ensure addArtwork exists and is a function before calling it
        if (artwork && typeof addArtwork === 'function') {
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

    // This block will now catch the error from the query and display it, preventing a blank page.
    if (isError || !artwork) {
        return (
            <div className="page-container" style={{ textAlign: 'center', padding: '5rem' }}>
                <h1>Artwork Not Found</h1>
                <p>The piece you are looking for does not exist or has been moved.</p>
                {error && <p style={{ color: 'var(--color-red-danger)', fontSize: '0.8rem', marginTop: '1rem' }}>Error: {error.message}</p>}
                <Link to="/artworks" className="button button-primary" style={{ marginTop: '1.5rem' }}>Browse All Artworks</Link>
            </div>
        );
    }

    // Gracefully handle cases where the artist join might have failed
    const artist = artwork.artist;

    const artistLocation = artist?.location
        ? [(artist.location as any).city, (artist.location as any).country].filter(Boolean).join(', ')
        : null;

    const artworkDimensions = artwork.dimensions
        ? [(artwork.dimensions as any).height, (artwork.dimensions as any).width, (artwork.dimensions as any).depth].filter(Boolean).join(' x ') + ((artwork.dimensions as any).unit ? ` ${(artwork.dimensions as any).unit}` : '')
        : null;

    const hasAboutTab = artwork.description || artwork.medium || artworkDimensions || (artwork.signature_info as any)?.is_signed || (artwork.framing_info as any)?.is_framed;
    const hasProvenanceTab = !!artwork.provenance;
    const showTabs = hasAboutTab || hasProvenanceTab;

    useEffect(() => {
        if (showTabs && !hasAboutTab && hasProvenanceTab) {
            setActiveTab('provenance');
        } else {
            setActiveTab('about');
        }
    }, [showTabs, hasAboutTab, hasProvenanceTab]);

    return (
        <>
            <div className="page-container">
                <div className="artwork-layout-grid">
                    <div className="artwork-image-column">
                        <img src={artwork.image_url || 'https://placehold.co/800x800?text=Image+Not+Available'} alt={artwork.title || ''} className="main-artwork-image" />
                        {artwork.visualization_image_url && (
                            <button onClick={() => setShowVisualizationModal(true)} className="button-secondary view-in-room-button">
                                View in a Room
                            </button>
                        )}
                    </div>

                    <div className="artwork-main-info">
                        {artist ? (
                            <h1><Link to={`/${artist.slug}`} className="artist-link">{artist.full_name}</Link></h1>
                        ) : (
                            <h1>Unknown Artist</h1>
                        )}
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
                            {activeTab === 'provenance' && <p style={{ whiteSpace: 'pre-wrap' }}>{artwork.provenance}</p>}
                        </div>
                    </div>
                )}

                {artist && (
                    <div className="artwork-details-section artist-spotlight">
                        {artist.avatar_url && <img src={artist.avatar_url} alt={artist.full_name || ''} className="artist-avatar" />}
                        <div>
                            <h3>About {artist.full_name}</h3>
                            {artistLocation && <p className="artist-location">{artistLocation}</p>}
                            <p className="artist-bio">{artist.short_bio || artist.bio}</p>
                            {artist.slug && <Link to={`/${artist.slug}`} className="button-link">View artist profile &rarr;</Link>}
                        </div>
                    </div>
                )}

                {!isLoadingRelated && relatedArtworks && relatedArtworks.length > 0 && artist && (
                    <div className="artwork-details-section">
                         <div className="related-header">
                            <h3>Other works by {artist.full_name}</h3>
                            {artist.slug && <Link to={`/${artist.slug}`} className="button-link">View all</Link>}
                        </div>
                        <div className="related-grid">
                            {relatedArtworks.map((art) => (
                                art.slug && artist.slug && (
                                    <Link to={`/${artist.slug}/artwork/${art.slug}`} key={art.id} className="artwork-card-link">
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

            {showShareModal && artist && (
                <ShareModal
                    onClose={() => setShowShareModal(false)}
                    title={artwork.title || 'Untitled'}
                    byline={artist.full_name || 'Unknown Artist'}
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