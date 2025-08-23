import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import InquiryModal from '../../components/public/InquiryModal';
import { Share2, ShoppingCart, ArrowLeft } from 'lucide-react';
import '../../index.css';

const fetchArtworkBySlug = async (artworkSlug) => {
    const { data, error } = await supabase
        .from('artworks')
        .select('*, artist:profiles(full_name, slug, bio, short_bio, avatar_url, location)')
        .eq('slug', artworkSlug)
        .single();
    if (error) throw new Error('Artwork not found');
    return data;
};

const fetchRelatedArtworks = async (artworkId, artistId) => {
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
    const { artworkSlug } = useParams();
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
        queryFn: () => fetchRelatedArtworks(artwork?.id, artwork?.user_id),
        enabled: !!artwork,
    });

    React.useEffect(() => {
        if (artwork) {
            addViewedArtwork?.(artwork.id);
            supabase.rpc('log_artwork_view', {
                p_artwork_id: artwork.id,
                p_artist_id: artwork.user_id
            });
        }
    }, [artwork]);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    };

    const handleBuyNow = () => {
        alert('Payment gateway integration needed.');
    };

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading artwork...</p>;
    if (isError || !artwork) return <p style={{ textAlign: 'center', padding: '5rem' }}>Artwork not found.</p>;

    const creationYear = artwork.created_at ? new Date(artwork.created_at).getFullYear() : null;
    const hasAboutTab = artwork.rarity || artwork.medium || artwork.condition || artwork.framing_info?.is_framed || artwork.signature_info?.is_signed;
    const hasProvenance = artwork.provenance;
    const showTabs = hasAboutTab || hasProvenance;

    const primaryMedium = artwork.medium?.split(',')[0];

    const renderPrice = () => {
        if (artwork.is_price_negotiable) {
            return (
                <h2>
                    ${artwork.min_price?.toFixed(2)} – ${artwork.max_price?.toFixed(2)}
                </h2>
            );
        } else {
            return (
                <h2>
                    ${artwork.price?.toLocaleString('en-US')}
                </h2>
            );
        }
    };

    return (
        <div>
            <button 
                onClick={() => navigate(-1)} 
                className="button button-secondary"
            >
                <ArrowLeft size={16} />
                Back
            </button>

            <div id="artwork_grid">
                <div id="artwork_img">
                    <img src={artwork.image_url || 'https://placehold.co/600x600?text=Image+Not+Available'} alt={artwork.title || ''}/>
                </div>
                <div>
                    <h1>
                      <Link to={`/${artwork.artist.slug}`}>{artwork.artist.full_name}</Link><br />
                      <i>{artwork.title}</i>
                      {creationYear && (
                        <> <span className="artwork_date">({creationYear})</span></>
                      )}
                    </h1>

                    {primaryMedium && <p>{primaryMedium}</p>}

                    <div>
                        {renderPrice()}
                        <div id="artwork_actions">
                            {!artwork.is_price_negotiable && (
                                <button className="button button-primary" onClick={handleBuyNow}>
                                    Purchase
                                </button>
                            )}
                            <button className="button" onClick={() => setShowInquiryModal(true)}>Inquire</button>
                            <button className="button button-secondary" onClick={handleShare}>
                                <Share2 size={16} /> Share
                            </button>
                        </div>
                        {artwork.catalogue_id && (
                            <p>
                                This work is part of a curated catalogue.{' '}
                                <Link to={`/catalogue/${artwork.catalogue_id}`}>
                                    View Catalogue
                                </Link>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {showTabs && (
                <div className="section_details">
                    <div>
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

                    <div>
                        {activeTab === 'about' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                
                                <div id="artwork_description">
                                    <p>{artwork.description || "No description provided."}</p>
                                </div>
                                
                                {artwork.rarity && <p><strong>Rarity:</strong> {artwork.rarity}</p>}
                                {artwork.medium && <p><strong>Medium:</strong> {artwork.medium}</p>}
                                {artwork.condition && <p><strong>Condition:</strong> {artwork.condition}</p>}
                                {artwork.framing_info?.is_framed !== undefined && (
                                    <p><strong>Framing:</strong> {artwork.framing_info.is_framed ? 'Framed' : 'Not framed'}</p>
                                )}
                                {artwork.framing_info?.location && (
                                    <p><strong>Framing Location:</strong> {artwork.framing_info.location}</p>
                                )}
                                {artwork.signature_info?.is_signed && (
                                    <p><strong>Signature:</strong> Signed{artwork.signature_info.location ? ` (${artwork.signature_info.location})` : ''}</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'provenance' && (
                            <div>
                                <p>{artwork.provenance}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
                
            {(artwork.artist.bio || artwork.artist.short_bio) && (
              <div className="section_details">
                <img
                  src={artwork.artist.avatar_url || 'https://placehold.co/128x128'}
                  alt={artwork.artist.full_name || ''}
                  style={{
                    width: '128px',
                    height: '128px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--border)',
                  }}
                />
            
                <h3>{artwork.artist.full_name}</h3>
            
                {artwork.artist.location?.city || artwork.artist.location?.country ? (
                  <p>
                    {artwork.artist.location.city}
                    {artwork.artist.location.city && artwork.artist.location.country ? ', ' : ''}
                    {artwork.artist.location.country}
                  </p>
                ) : null}
            
                <p>{artwork.artist.bio || artwork.artist.short_bio}</p>
            
                <Link to={`/${artwork.artist.slug}`}>More</Link>
              </div>
            )}

            <div className="section_details">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                    <h3>Other works by {artwork.artist.full_name}</h3>
                    <Link to={`/${artwork.artist.slug}`}>View all</Link>
                </div>
                {isLoadingRelated && <p>Loading suggestions...</p>}
                {relatedArtworks && relatedArtworks.length > 0 ? (
                    <div>
                        {relatedArtworks.map((art) => (
                            <Link to={`/${artwork.artist.slug}/artwork/${art.slug}`} key={art.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                    <img src={art.image_url || 'https://placehold.co/300x300?text=Image+Not+Available'} alt={art.title || ''} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                                    <div style={{ padding: '1rem' }}>
                                        <h4>{art.title}</h4>
                                        <p style={{ color: 'var(--primary)' }}>${art.price?.toLocaleString('en-US')}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    !isLoadingRelated && <p>No related artworks found.</p>
                )}
            </div>

            {showInquiryModal && <InquiryModal artworkId={artwork.id} onClose={() => setShowInquiryModal(false)} />}
        </div>
    );
};

export default IndividualArtworkPage;
