import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider'; // <-- Import AuthProvider
import { ArrowLeft, Share2, Edit3, Eye, Lock } from 'lucide-react'; // <-- Import new icons
import InquiryModal from '../../components/public/InquiryModal';
import ShareModal from '../../components/public/ShareModal';
import '../../index.css';

// (fetchPublicCatalogue function remains the same)
const fetchPublicCatalogue = async (artistSlug: string, catalogueSlug: string) => {
    const { data: catalogue, error: catalogueError } = await supabase.from('catalogues').select('*, artist:profiles!inner(full_name, slug, id)').eq('slug', catalogueSlug).eq('artist.slug', artistSlug).single();
    if (catalogueError) { throw new Error('Catalogue not found.'); }
    const { data: artworks, error: artworksError } = await supabase.from('artworks').select('id, title, slug, image_url, price').eq('catalogue_id', catalogue.id).eq('status', 'Active').order('created_at', { ascending: false });
    if (artworksError) { throw new Error('Could not fetch artworks for this catalogue.'); }
    return { catalogue, artworks };
};

type ArtworkForModal = { id: string; title: string | null; image_url: string | null; };

const PublicCataloguePage = () => {
    const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string; catalogueSlug: string; }>();
    const navigate = useNavigate();
    const { profile } = useAuth(); // <-- Get logged-in user's profile
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
    const isOwner = profile?.id === catalogue.artist.id; // <-- Check if the viewer is the owner
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
                            <Link to={`/${catalogue.artist.slug}/artwork/${art.slug}`} className="artwork-card-link">
                                <img src={art.image_url || 'https://placehold.co/600x450?text=No+Image'} alt={art.title || 'Artwork'} className="artwork-card-image" />
                                <div className="artwork-card-info">
                                    <h4>{art.title || "Untitled"}</h4>
                                    <p>${new Intl.NumberFormat('en-US').format(art.price || 0)}</p>
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
            {showShareModal && isSharable && <ShareModal onClose={() => setShowShareModal(false)} title={catalogue.title} byline={catalogue.artist.full_name} shareUrl={window.location.href} previewImageUrls={shareImageUrls} isCatalogue={true} />}
        </div>
    );
};

export default PublicCataloguePage;