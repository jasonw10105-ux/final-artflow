import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft, Share2 } from 'lucide-react';
import InquiryModal from '../../components/public/InquiryModal';
import ShareModal from '../../components/public/ShareModal';
import '../../index.css';

// Fetches the catalogue details and all of its associated artworks.
// It includes the `access_type` to determine if the catalogue is private or public.
const fetchPublicCatalogue = async (artistSlug: string, catalogueSlug: string) => {
    // First, get the catalogue and ensure it's linked to the correct artist via slug
    const { data: catalogue, error: catalogueError } = await supabase
        .from('catalogues')
        .select('*, artist:profiles!inner(full_name, slug)')
        .eq('slug', catalogueSlug)
        .eq('artist.slug', artistSlug)
        .single();
    
    if (catalogueError) { 
        console.error("Error fetching catalogue:", catalogueError.message);
        throw new Error('Catalogue not found.'); 
    }

    // If the catalogue is found, fetch its associated artworks that are active
    const { data: artworks, error: artworksError } = await supabase
        .from('artworks')
        .select('id, title, slug, image_url, price')
        .eq('catalogue_id', catalogue.id)
        .eq('status', 'Active')
        .order('created_at', { ascending: false });

    if (artworksError) { 
        console.error("Error fetching artworks:", artworksError.message);
        throw new Error('Could not fetch artworks for this catalogue.'); 
    }

    return { catalogue, artworks };
};

type ArtworkForModal = {
    id: string;
    title: string | null;
    image_url: string | null;
};

const PublicCataloguePage = () => {
    const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string; catalogueSlug: string; }>();
    const navigate = useNavigate();
    const [inquiryArtwork, setInquiryArtwork] = useState<ArtworkForModal | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['publicCatalogue', artistSlug, catalogueSlug],
        queryFn: () => fetchPublicCatalogue(artistSlug!, catalogueSlug!),
        enabled: !!artistSlug && !!catalogueSlug,
        retry: 1, // Don't retry excessively on 404s
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
    
    // The "Share" button will only be available for non-password-protected, public catalogues
    const isSharable = catalogue.access_type === 'public';

    // Prepare an array of image URLs for the ShareModal preview
    const shareImageUrls = [
        catalogue.cover_image_url,
        ...artworks.map(art => art.image_url).filter(Boolean)
    ].filter(Boolean) as string[];

    return (
        <div className="catalogue-page-container">
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
                                <img 
                                    src={art.image_url || 'https://placehold.co/600x450?text=No+Image'} 
                                    alt={art.title || 'Artwork'} 
                                    className="artwork-card-image" 
                                />
                                <div className="artwork-card-info">
                                    <h4>{art.title || "Untitled"}</h4>
                                    <p>${new Intl.NumberFormat('en-US').format(art.price || 0)}</p>
                                </div>
                            </Link>
                             <div className="artwork-card-actions">
                                <button 
                                    className="button button-secondary" 
                                    style={{ width: '100%' }} 
                                    onClick={() => setInquiryArtwork(art as ArtworkForModal)}
                                >
                                    Inquire
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : ( 
                <p className="empty-list-placeholder">There are no available artworks in this catalogue at the moment.</p> 
            )}
            
            {/* --- Modals --- */}
            {inquiryArtwork && (
                <InquiryModal 
                    artworkId={inquiryArtwork.id} 
                    onClose={() => setInquiryArtwork(null)} 
                    previewImageUrl={inquiryArtwork.image_url || undefined} 
                    previewTitle={inquiryArtwork.title || undefined} 
                />
            )}

            {showShareModal && isSharable && (
                <ShareModal
                    onClose={() => setShowShareModal(false)}
                    title={catalogue.title}
                    byline={catalogue.artist.full_name}
                    shareUrl={window.location.href}
                    previewImageUrls={shareImageUrls}
                    isCatalogue={true}
                />
            )}
        </div>
    );
};

export default PublicCataloguePage;