// src/pages/public/IndividualArtworkPage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import InquiryModal from '../../components/public/InquiryModal';
import { Share2, ShoppingCart, ArrowLeft } from 'lucide-react'; // RESTORED: ShoppingCart icon import
import '../../index.css';

// --- (These fetch functions are correct) ---
const fetchArtworkBySlug = async (artworkSlug: string | undefined) => {
    if (!artworkSlug) throw new Error("Artwork slug is required.");
    const { data, error } = await supabase
        .from('artworks')
        .select('*, artist:profiles(full_name, slug, bio, short_bio, avatar_url, location)')
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
    const [showInquiryModal, setShowInquiryModal] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('about');
    const { addViewedArtwork } = useRecentlyViewed();
    const navigate = useNavigate();

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

    React.useEffect(() => {
        if (artwork) {
            addViewedArtwork?.(artwork.id);
            supabase.rpc('log_artwork_view', { p_artwork_id: artwork.id, p_artist_id: artwork.user_id });
        }
    }, [artwork, addViewedArtwork]);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    };
    
    // RESTORED: Original handleBuyNow function
    const handleBuyNow = () => {
        alert('Payment gateway integration needed.');
    };

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading artwork...</p>;
    if (isError || !artwork) return (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
            <h1>404 - Artwork Not Found</h1>
            <p>The artwork you are looking for does not exist or has been moved.</p>
            <Link to="/artworks" className="button button-primary">Browse All Artworks</Link>
        </div>
    );

    // --- RESTORED: All original data variables and logic ---
    const creationYear = artwork.created_at ? new Date(artwork.created_at).getFullYear() : null;
    const hasAboutTab = artwork.medium || artwork.framing_info?.is_framed || artwork.signature_info?.is_signed;
    const hasProvenance = artwork.provenance;
    const showTabs = hasAboutTab || hasProvenance;

    // RESTORED: The complete, original price rendering logic
    const renderPrice = () => {
        if (artwork.status === 'Sold') {
            return <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Sold</p>;
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <button 
                onClick={() => navigate(-1)} 
                className="button button-secondary"
                style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <ArrowLeft size={16} />
                Back
            </button>

            {/* RESTORED: Original grid with all IDs and classes */}
            <div id="artwork_grid">
                <div id="artwork_img">
                    <img src={artwork.image_url || 'https://placehold.co/600x600?text=Image+Not+Available'} alt={artwork.title || ''}/>
                </div>
                <div className="artwork-main-info">
                    <h1>
                        {/* ROUTING FIX APPLIED */}
                        <Link to={`/${artwork.artist.slug}`} className="artist-link">{artwork.artist.full_name}</Link>
                    </h1>
                    <h2>
                        <i>{artwork.title}</i>
                        {creationYear && <span className="artwork_date">, {creationYear}</span>}
                    </h2>

                    <div className="artwork-medium">{artwork.medium}</div>

                    <div className="price-container">
                        {renderPrice()}
                    </div>

                    {/* RESTORED: Original actions section with all buttons and logic */}
                    <div id="artwork_actions">
                        {artwork.status !== 'Sold' && (
                            <>
                                {artwork.price && !artwork.is_price_negotiable && (
                                    <button className="button button-primary" onClick={handleBuyNow}>
                                        <ShoppingCart size={16} /> Purchase
                                    </button>
                                )}
                                <button className="button" onClick={() => setShowInquiryModal(true)}>Inquire</button>
                            </>
                        )}
                        <button className="button button-secondary" onClick={handleShare}>
                            <Share2 size={16} /> Share
                        </button>
                    </div>

                    {/* RESTORED: Catalogue link */}
                    {artwork.catalogue_id && (
                        <p className="catalogue-note">
                            This work is part of a curated catalogue.
                            {/* NOTE: Ensure your routes support this link structure */}
                            <Link to={`/${artwork.artist.slug}/catalogue/${artwork.catalogue_id}`}> View Catalogue</Link>
                        </p>
                    )}
                </div>
            </div>

            {/* RESTORED: Original tabs section */}
            {showTabs && (
                <div className="section_details artwork-tabs">
                    <div className="tab-header">
                        {hasAboutTab && (
                            <button className={`tab-button ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>
                                About this Work
                            </button>
                        )}
                        {hasProvenance && (
                            <button className={`tab-button ${activeTab === 'provenance' ? 'active' : ''}`} onClick={() => setActiveTab('provenance')}>
                                Provenance
                            </button>
                        )}
                    </div>
                    <div className="tab-content">
                        {activeTab === 'about' && (
                            <div id="artwork_description">
                                <p>{artwork.description || "No description provided."}</p>
                                {/* RESTORED: Full details list */}
                                <ul className="details-list">
                                    {artwork.medium && <li><strong>Medium:</strong> {artwork.medium}</li>}
                                    {artwork.dimensions?.width && artwork.dimensions?.height && <li><strong>Dimensions:</strong> {artwork.dimensions.height} × {artwork.dimensions.width}{artwork.dimensions.depth ? ` × ${artwork.dimensions.depth}`: ''} {artwork.dimensions.unit || ''}</li>}
                                    {artwork.signature_info?.is_signed && <li><strong>Signature:</strong> Signed{artwork.signature_info.location ? ` (${artwork.signature_info.location})` : ''}</li>}
                                    {artwork.framing_info?.is_framed && <li><strong>Framing:</strong> {artwork.framing_info.details || 'Framed'}</li>}
                                </ul>
                            </div>
                        )}
                        {activeTab === 'provenance' && (
                            <div>
                                <p style={{ whiteSpace: 'pre-wrap' }}>{artwork.provenance}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* RESTORED: Original artist spotlight section */}
            {(artwork.artist.bio || artwork.artist.short_bio) && (
                <div className="section_details artist-spotlight">
                    <img src={artwork.artist.avatar_url || 'https://placehold.co/128x128'} alt={artwork.artist.full_name || ''} className="artist-avatar" />
                    <div>
                        <h3>About {artwork.artist.full_name}</h3>
                        {artwork.artist.location?.city || artwork.artist.location?.country ? (
                            <p className="artist-location">
                                {artwork.artist.location.city}{artwork.artist.location.city && artwork.artist.location.country ? ', ' : ''}{artwork.artist.location.country}
                            </p>
                        ) : null}
                        <p className="artist-bio">{artwork.artist.bio || artwork.artist.short_bio}</p>
                        {/* ROUTING FIX APPLIED */}
                        <Link to={`/${artwork.artist.slug}`} className="button-link">View artist profile &rarr;</Link>
                    </div>
                </div>
            )}
            
            {/* RESTORED: Original related artworks section */}
            <div className="section_details">
                <div className="related-header">
                    <h3>Other works by {artwork.artist.full_name}</h3>
                    {/* ROUTING FIX APPLIED */}
                    <Link to={`/${artwork.artist.slug}`} className="button-link">View all</Link>
                </div>
                {isLoadingRelated && <p>Loading suggestions...</p>}
                {relatedArtworks && relatedArtworks.length > 0 ? (
                    <div className="related-grid">
                        {relatedArtworks.map((art) => (
                            // ROUTING FIX APPLIED
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

            {showInquiryModal && <InquiryModal artworkId={artwork.id} onClose={() => setShowInquiryModal(false)} previewImageUrl={artwork.image_url || undefined} previewTitle={artwork.title || undefined} />}
        </div>
    );
};

export default IndividualArtworkPage;
