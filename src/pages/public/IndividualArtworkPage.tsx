import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { supabase } from '@/lib/supabaseClient';

// Corrected default imports pointing to the 'public' folder
import InquiryModal from '@/components/public/InquiryModal';
import ShareModal from '@/components/public/ShareModal';
import VisualizationModal from '@/components/public/VisualizationModal';

// --- Type Definitions to match your data structure ---
interface Artist {
    id: string;
    full_name: string | null;
    slug: string | null;
    avatar_url: string | null;
    bio: string | null;
    short_bio: string | null;
    location: {
        city: string | null;
        country: string | null;
    } | null;
}

interface Artwork {
    id: string;
    title: string | null;
    slug: string | null;
    image_url: string | null;
    visualization_image_url: string | null;
    artist_id: string;
    artist: Artist;
    creation_year: string | number | null;
    price: number | null;
    dimensions: {
        width?: number;
        height?: number;
        depth?: number;
        unit?: string;
    } | null;
}

// --- API Fetching Functions ---
const fetchArtwork = async (slug: string): Promise<Artwork> => {
    const { data, error } = await supabase
        .from('artworks')
        .select(`*, artist:artists(*)`)
        .eq('slug', slug)
        .single();
    if (error) throw new Error(error.message);
    return data as Artwork;
};

const fetchRelatedArtworks = async (artistId: string, currentArtworkId: string): Promise<Artwork[]> => {
    const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', artistId)
        .neq('id', currentArtworkId)
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

    const { data: artwork, isLoading, isError } = useQuery({
        queryKey: ['artwork', artworkSlug],
        queryFn: () => fetchArtwork(artworkSlug!),
        enabled: !!artworkSlug,
    });

    const { data: relatedArtworks, isLoading: isLoadingRelated } = useQuery({
        queryKey: ['relatedArtworks', artwork?.artist?.id],
        queryFn: () => fetchRelatedArtworks(artwork!.artist.id, artwork!.id),
        enabled: !!artwork && !!artwork.artist,
    });

    useEffect(() => {
        if (artwork) {
            addArtwork(artwork);
        }
    }, [artwork, addArtwork]);

    if (isLoading) {
        return <div className="page-container"><p>Loading...</p></div>;
    }

    if (isError || !artwork) {
        return (
            <div className="page-container" style={{ textAlign: 'center' }}>
                <h1>Artwork Not Found</h1>
                <p>The piece you are looking for does not exist or has been moved.</p>
                <Link to="/" className="button primary" style={{ textDecoration: 'none', display: 'inline-block', width: 'auto' }}>Return Home</Link>
            </div>
        );
    }

    // --- Prepare derived data for components and modals ---
    const artistLocation = artwork.artist?.location
        ? [artwork.artist.location.city, artwork.artist.location.country].filter(Boolean).join(', ')
        : null;

    const artworkDimensions = artwork.dimensions
        ? [artwork.dimensions.height, artwork.dimensions.width, artwork.dimensions.depth].filter(Boolean).join(' x ') + (artwork.dimensions.unit ? ` ${artwork.dimensions.unit}` : '')
        : null;
        
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
                        {artwork.artist?.slug && artwork.artist?.full_name && (
                             <h1><Link to={`/${artwork.artist.slug}`} className="artist-link">{artwork.artist.full_name}</Link></h1>
                        )}
                        {artwork.title && <h2><i>{artwork.title}</i></h2>}

                        <div className="artwork-actions">
                            <button onClick={() => setShowInquiryModal(true)} className="button button-secondary">Inquire</button>
                            <button onClick={() => setShowShareModal(true)} className="button button-secondary">Share</button>
                        </div>
                    </div>
                </div>

                {artwork.artist && (
                    <div className="artwork-details-section artist-spotlight">
                        {artwork.artist.avatar_url && <img src={artwork.artist.avatar_url} alt={artwork.artist.full_name || ''} className="artist-avatar" />}
                        <div>
                            {artwork.artist.full_name && <h3>About {artwork.artist.full_name}</h3>}
                            {artistLocation && <p className="artist-location">{artistLocation}</p>}
                            {(artwork.artist.bio || artwork.artist.short_bio) && <p className="artist-bio">{artwork.artist.bio || artwork.artist.short_bio}</p>}
                            {artwork.artist.slug && <Link to={`/${artwork.artist.slug}`} className="button-link">View artist profile &rarr;</Link>}
                        </div>
                    </div>
                )}

                {!isLoadingRelated && relatedArtworks && relatedArtworks.length > 0 && (
                    <div className="related-artworks-section">
                        <div className="related-header">
                            {artwork.artist?.full_name && <h3>Other works by {artwork.artist.full_name}</h3>}
                            {artwork.artist?.slug && <Link to={`/${artwork.artist.slug}`} className="button-link">View all</Link>}
                        </div>
                        <div className="related-grid">
                            {relatedArtworks.map((art) => (
                                art.slug && artwork.artist?.slug && (
                                    <Link to={`/${artwork.artist.slug}/artwork/${art.slug}`} key={art.id} className="artwork-card-link">
                                        <div className="artwork-card">
                                            {art.image_url && <img src={art.image_url} alt={art.title || ''} className="artwork-card-image" />}
                                            <div className="artwork-card-info">
                                                {art.title && <h4>{art.title}</h4>}
                                            </div>
                                        </div>
                                    </Link>
                                )
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODALS --- */}
            {showInquiryModal && (
                <InquiryModal artworkId={artwork.id} onClose={() => setShowInquiryModal(false)} />
            )}

            {showShareModal && artwork.title && artwork.artist?.full_name && artwork.image_url && (
                <ShareModal
                    onClose={() => setShowShareModal(false)}
                    title={artwork.title}
                    byline={artwork.artist.full_name}
                    shareUrl={window.location.href}
                    previewImageUrls={[artwork.image_url]}
                    isCatalogue={false}
                    dimensions={artworkDimensions}
                    price={artwork.price}
                    year={artwork.creation_year}
                />
            )}

            {showVisualizationModal && artwork.visualization_image_url && artwork.title && (
                 <VisualizationModal
                    imageUrl={artwork.visualization_image_url}
                    artworkTitle={artwork.title}
                    onClose={() => setShowVisualizationModal(false)}
                />
            )}
        </>
    );
};

export default IndividualArtworkPage;