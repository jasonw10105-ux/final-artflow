// src/pages/public/IndividualArtworkPage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom'; // <-- IMPORT useNavigate
import { supabase } from '../../lib/supabaseClient';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import InquiryModal from '../../components/public/InquiryModal';
import { Share2, ShoppingCart, ArrowLeft } from 'lucide-react'; // <-- IMPORT ArrowLeft
import '../../../index.css'; // <-- IMPORT index.css

const fetchArtworkBySlug = async (artworkSlug: string) => {
    const { data, error } = await supabase
        .from('artworks')
        .select('*, artist:profiles(full_name, slug)')
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
    const { artworkSlug } = useParams<{ artworkSlug: string; }>();
    const [showInquiryModal, setShowInquiryModal] = React.useState(false);
    const { addViewedArtwork } = useRecentlyViewed();
    const navigate = useNavigate(); // <-- INITIALIZE useNavigate

    const { data: artwork, isLoading, isError } = useQuery({
        queryKey: ['artwork', artworkSlug],
        queryFn: () => fetchArtworkBySlug(artworkSlug!),
        enabled: !!artworkSlug,
    });

    const { data: relatedArtworks, isLoading: isLoadingRelated } = useQuery({
        queryKey: ['relatedArtworks', artwork?.id],
        queryFn: () => fetchRelatedArtworks(artwork!.id, artwork!.user_id),
        enabled: !!artwork,
    });

    React.useEffect(() => {
        if (artwork) {
            if (typeof addViewedArtwork === 'function') {
                addViewedArtwork(artwork.id);
            }
            supabase.rpc('log_artwork_view', { p_artwork_id: artwork.id, p_artist_id: artwork.user_id });
        }
    }, [artwork, addViewedArtwork]);

    const handleShare = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading artwork...</p>;
    if (isError || !artwork) return <p style={{ textAlign: 'center', padding: '5rem' }}>Artwork not found.</p>;

    const hasMetadata = artwork.medium || artwork.dimensions || artwork.date_info || artwork.signature_info || artwork.framing_info || artwork.location || artwork.frame_details;


    return (
        <div style={{ maxWidth: '1440px' }}>
            {/* --- NEW: Back Button --- */}
            <button 
                onClick={() => navigate(-1)} 
                className="button button-secondary" 
                style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <ArrowLeft size={16} />
                Back
            </button>

            <div>
                <div id="artwork_img">
                    <img src={artwork.image_url || 'https://placehold.co/600x600?text=Image+Not+Available'} alt={artwork.title || ''} />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.5rem' }}><Link to={`/${artwork.artist.slug}`}>{artwork.artist.full_name}</Link><br/><i>{artwork.title}</i>
                    </h1>
                    {artwork.medium && <p>{artwork.medium}</p>}
                    {artwork.dimensions && (
                            <p>
                                {` ${artwork.dimensions.height || 'N/A'} x ${artwork.dimensions.width || 'N/A'}`}
                                {artwork.dimensions.depth && ` x ${artwork.dimensions.depth}`}
                                {` ${artwork.dimensions.unit || ''}`}
                            </p>
                        )}
                    <div>
                        <h2>
                           ${new Intl.NumberFormat('en-US').format(artwork.price)}
                        </h2>
                        <div id="artwork_actions">
                            <button className="button button-secondary" onClick={handleShare} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Share2 size={16} /> Share</button>
                            <button className="button" onClick={() => setShowInquiryModal(true)}>Inquire</button>
                        </div>
                    </div>
                    <div style={{ marginTop: '2rem' }}>
                        <p>{artwork.description || "No description provided."}</p>
                    </div>

                    {/* --- Artwork Metadata --- */}
                    {hasMetadata && (
                        <div style={{ marginTop: '2rem' }}>
                            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Artwork Details</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                
                                
                                {artwork.date_info?.year && (
                                    <p><strong>Date:</strong> {artwork.date_info.year}</p>
                                )}
                                {artwork.date_info?.start_year && (
                                    <p><strong>Date:</strong> {artwork.date_info.start_year} - {artwork.date_info.end_year}</p>
                                )}
                                {artwork.signature_info?.is_signed && (
                                    <p>
                                        <strong>Signature:</strong> Signed
                                        {artwork.signature_info.location && ` (${artwork.signature_info.location})`}
                                    </p>
                                )}
                                {artwork.framing_info?.is_framed !== undefined && (
                                    <p><strong>Framing:</strong> {artwork.framing_info.is_framed ? 'Included' : 'Not included'}</p>
                                )}
                                {artwork.frame_details && <p><strong>Frame Details:</strong> {artwork.frame_details}</p>}
                                {artwork.location && <p><strong>Location:</strong> {artwork.location}</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div>
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>Other works from {artwork.artist.full_name}</h3><Link to={`/${artwork.artist.slug}`}>View all</Link>
                {isLoadingRelated && <p>Loading suggestions...</p>}
                {relatedArtworks && relatedArtworks.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
                        {relatedArtworks.map((art) => (
                            <Link to={`/${artwork.artist.slug}/artwork/${art.slug}`} key={art.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                    <img src={art.image_url || 'https://placehold.co/300x300?text=Image+Not+Available'} alt={art.title || ''} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                                    <div style={{ padding: '1rem' }}>
                                        <h4>{art.title}</h4>
                                        <p style={{ color: 'var(--primary)' }}>${art.price}</p>
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