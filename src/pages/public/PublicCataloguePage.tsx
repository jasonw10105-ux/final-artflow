import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { ArrowLeft, Share2, Edit3, Eye, Lock } from 'lucide-react';
import InquiryModal from '../../components/public/InquiryModal';
import ShareModal from '../../components/public/ShareModal';
import '../../index.css';

// --- CORRECTED DATA FETCHING FUNCTION ---
const fetchPublicCatalogue = async (artistSlug: string, catalogueSlug: string) => {
    // Step 1: Fetch the catalogue and its artist. This part remains the same.
    const { data: catalogue, error: catalogueError } = await supabase
        .from('catalogues')
        .select('*, artist:profiles!inner(full_name, slug, id)')
        .eq('slug', catalogueSlug)
        .eq('artist.slug', artistSlug)
        .single();

    if (catalogueError || !catalogue) {
        throw new Error('Catalogue not found.');
    }

    // Step 2: Get artwork IDs from the junction table for this catalogue.
    const { data: junctionEntries, error: junctionError } = await supabase
        .from('artwork_catalogue_junction')
        .select('artwork_id')
        .eq('catalogue_id', catalogue.id);

    if (junctionError) {
        throw new Error('Could not fetch artwork relationships.');
    }
    
    // If no artworks are linked to this catalogue, return early.
    const artworkIds = junctionEntries.map(entry => entry.artwork_id);
    if (artworkIds.length === 0) {
        return { catalogue, artworks: [] };
    }

    // Step 3: Fetch the details for the artworks found, ensuring they are 'Available'.
    const { data: artworks, error: artworksError } = await supabase
        .from('artworks')
        .select('id, title, slug, image_url, price, currency')
        .in('id', artworkIds)
        .eq('status', 'Available') // <-- FIX: Changed status from 'Active' to 'Available'
        .order('created_at', { ascending: false });

    if (artworksError) {
        throw new Error('Could not fetch artworks for this catalogue.');
    }

    return { catalogue, artworks: artworks || [] };
};

type ArtworkForModal = { id: string; title: string | null; image_url: string | null; };

const PublicCataloguePage = () => {
    const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string; catalogueSlug: string; }>();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [inquiryArtwork, setInquiryArtwork] = useState<ArtworkForModal | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['publicCatalogue', artistSlug, catalogueSlug],
        queryFn: () => fetchPublicCatalogue(artistSlug!, catalogueSlug!),
        enabled: !!artistSlug && !!catalogueSlug,
        retry: 1,
    });

    if (isLoading) return <p className="loading-placeholder">Loading Catalogue...</p>;
    if (isError || !data) return (
        <div className="not-found-container">
            <h1>404 - Catalogue Not Found</h1>
            <p>This catalogue could not be found, is private, or is no longer available.</p>
            <Link to="/artists" className="button button-primary">Browse Artists</Link>
        </div>
    );

    const { catalogue, artworks } = data;
    const isOwner = profile?.id === catalogue.artist.id;
    const isSharable = catalogue.access_type === 'public';
    const shareImageUrls = [catalogue.cover_image_url, ...artworks.map(art => art.image_url)].filter(Boolean) as string[];

    const getBannerInfo = () => {
        switch (catalogue.access_type) {
            case 'public': return { text: 'This is a public catalogue', icon: <Eye size={16} /> };
            case 'private': return { text: 'This is a private catalogue', icon: <Lock size={16} /> };
            default: return { text: 'Shared with specific contacts', icon: <Lock size={16} /> };
        }
    };
    const bannerInfo = getBannerInfo();

    return (
        <div className="page-container">
            {isOwner && (
                <div className="owner-preview-banner">
                    <div className="banner-info">
                        {bannerInfo.icon}
                        <span>You are viewing your own catalogue. {bannerInfo.text}.</span>
                    </div>
                    <Link to={`/artist/catalogues/edit/${catalogue.id}`} className="button button-secondary">
                        <Edit3 size={16} /> Manage Catalogue
                    </Link>
                </div>
            )}

            <button onClick={() => navigate(-1)} className="button button-secondary back-button">
                <ArrowLeft size={16} /> Back
            </button>

            <header className="catalogue-header">
                <h1 className="catalogue-title">{catalogue.title}</h1>
                <Link to={`/${catalogue.artist.slug}`} className="catalogue-artist-link">
                    <h2>From the collection of {catalogue.artist.full_name}</h2>
                </Link>
                {catalogue.description && <p className="catalogue-description">{catalogue.description}</p>}
                
                {isSharable && (
                    <div className="catalogue-header-actions">
                        <button className="button button-secondary" onClick={() => setShowShareModal(true)}>
                            <Share2 size={16} /> Share Catalogue
                        </button>
                    </div>
                )}
            </header>

            {artworks && artworks.length > 0 ? (
                <div className="catalogue-grid">
                    {artworks.map(art => (
                        <div key={art.id} className="catalogue-artwork-card">
                            <Link to={`/artwork/${art.slug}`} className="artwork-card-link">
                                <img src={art.image_url || 'https://placehold.co/600x450?text=No+Image'} alt={art.title || 'Artwork'} className="artwork-card-image" />
                                <div className="artwork-card-info">
                                    <h4>{art.title || "Untitled"}</h4>
                                    <p>
                                        {art.price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: art.currency || 'USD' }).format(art.price) : 'Price on Request'}
                                    </p>
                                </div>
                            </Link>
                             <div className="artwork-card-actions">
                                <button className="button button-secondary" onClick={() => setInquiryArtwork(art as ArtworkForModal)}>Inquire</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : ( <p className="empty-list-placeholder">There are no available artworks in this catalogue at the moment.</p> )}
            
            {inquiryArtwork && <InquiryModal artworkId={inquiryArtwork.id} onClose={() => setInquiryArtwork(null)} previewImageUrl={inquiryArtwork.image_url || undefined} previewTitle={inquiryArtwork.title || undefined} />}
            {showShareModal && isSharable && <ShareModal onClose={() => setShowShareModal(false)} title={catalogue.title} byline={catalogue.artist.full_name || 'Unknown Artist'} shareUrl={window.location.href} previewImageUrls={shareImageUrls} isCatalogue={true} />}
        </div>
    );
};

export default PublicCataloguePage;