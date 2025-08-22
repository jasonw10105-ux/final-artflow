// src/pages/public/IndividualArtworkPage.tsx

import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import InquiryModal from '../../components/public/InquiryModal';
import { Share2, ShoppingCart, User, ArrowRight, ArrowLeft } from 'lucide-react';

// Query to fetch the main artwork and the artist's biography from their profile
const fetchArtworkBySlug = async (artworkSlug: string) => {
    const { data, error } = await supabase
        .from('artworks')
        .select('*, artist:profiles(full_name, slug, bio)') // Fetches the artist's bio
        .eq('slug', artworkSlug)
        .single();
    if (error) throw new Error('Artwork not found');
    return data;
};

// Query to fetch related artworks using the dedicated Supabase database function
const fetchRelatedArtworks = async (artworkId: string, artistId: string, medium: string | null, price: number | null) => {
    const { data, error } = await supabase.rpc('get_related_artworks', {
        p_artwork_id: artworkId,
        p_artist_id: artistId,
        p_medium: medium,
        p_price: price
    });
    if (error) {
        console.error("Error fetching related artworks:", error);
        return [];
    }
    return data;
};

const IndividualArtworkPage = () => {
    const { artworkSlug } = useParams<{ artworkSlug: string }>();
    const navigate = useNavigate(); // Hook for programmatic navigation (e.g., the back button)
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const { addViewedArtwork } = useRecentlyViewed();

    // Main query to fetch the artwork being viewed
    const { data: artwork, isLoading, isError } = useQuery({
        queryKey: ['artwork', artworkSlug],
        queryFn: () => fetchArtworkBySlug(artworkSlug!),
        enabled: !!artworkSlug,
    });

    // Secondary query to fetch related artworks, which depends on the main artwork data
    const { data: relatedArtworks } = useQuery({
        queryKey: ['relatedArtworks', artwork?.id],
        queryFn: () => fetchRelatedArtworks(artwork!.id, artwork!.user_id, artwork!.medium, artwork!.price),
        enabled: !!artwork, // This query will only run after 'artwork' has been successfully fetched
    });

    // Log a view and add to "recently viewed" list when the artwork data is available
    useEffect(() => {
        if (artwork) {
            addViewedArtwork(artwork.id);
            supabase.rpc('log_artwork_view', { p_artwork_id: artwork.id, p_artist_id: artwork.user_id });
        }
    }, [artwork, addViewedArtwork]);

    // Scroll to the top of the page when the user navigates to a new artwork page
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [artworkSlug]);

    // Function to copy the current page URL to the clipboard
    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    };

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading artwork...</p>;
    if (isError || !artwork) return <p style={{ textAlign: 'center', padding: '5rem' }}>Artwork not found.</p>;

    // Helper function to format artwork dimensions for display
    const formatDimensions = (dims: any) => {
        if (!dims || !dims.height || !dims.width) return null;
        const parts = [dims.height, dims.width, dims.depth].filter(Boolean); // Filter out null/empty depth
        return `${parts.join(' x ')} ${dims.unit || ''}`;
    };

    return (
        <>
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
                {/* --- Back Button --- */}
                <button
                    onClick={() => navigate(-1)} // Navigates to the previous page in the browser's history
                    className="button button-secondary"
                    style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr', // Mobile-first: single column
                    gap: '2rem',
                    alignItems: 'start'
                }} className="artwork-layout">
                    {/* Image Column */}
                    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: '1rem', position: 'sticky', top: '1rem' }}>
                        <img src={artwork.image_url} alt={artwork.title || ''} style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius)' }} />
                    </div>

                    {/* Details Column */}
                    <div>
                        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', lineHeight: 1.2 }}>{artwork.title}</h1>
                        <Link to={`/artist/${artwork.artist.slug}`} style={{ textDecoration: 'none' }}>
                            <h2 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', color: 'var(--muted-foreground)', fontWeight: 500, marginTop: '0.5rem' }}>by {artwork.artist.full_name}</h2>
                        </Link>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2rem 0' }} />

                        <div style={{ background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
                            <p style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 700, color: 'var(--primary)' }}>
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(artwork.price)}
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem' }}>
                                <button className="button button-secondary" onClick={handleShare} style={{ display: 'flex', gap: '0.5rem' }}><Share2 size={16} /> Share</button>
                                <button className="button" onClick={() => setShowInquiryModal(true)}>Inquire About This Piece</button>
                                {!artwork.is_price_negotiable && <button className="button button-primary" style={{ display: 'flex', gap: '0.5rem' }}><ShoppingCart size={16} />Buy Now</button>}
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', lineHeight: 1.6 }}>
                            <p>{artwork.description}</p>
                        </div>

                        {/* --- Artist Bio Section with Profile Button --- */}
                        {artwork.artist.bio && (
                            <div style={{ marginTop: '3rem' }}>
                                <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>About the Artist</h3>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ background: 'var(--muted)', borderRadius: '50%', padding: '0.5rem', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: '0.25rem' }}>
                                        <User size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ lineHeight: 1.6 }}>{artwork.artist.bio}</p>
                                        <Link to={`/artist/${artwork.artist.slug}`} className="button button-secondary" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                            View Artist Profile
                                            <ArrowRight size={16} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Conditionally Rendered Related Artworks Section --- */}
                {relatedArtworks && relatedArtworks.length > 0 && (
                    <div style={{ marginTop: '4rem' }}>
                        <h2 style={{ fontSize: '1.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>More from this Artist</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                            {relatedArtworks.map(related => (
                                <Link key={related.id} to={`/artwork/${related.artist.slug}/${related.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                        <img src={related.image_url} alt={related.title || ''} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                                        <div style={{ padding: '1rem' }}>
                                            <h4 style={{ fontWeight: 600 }}>{related.title}</h4>
                                            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>{formatDimensions(related.dimensions)}</p>
                                            <p style={{ fontWeight: 'bold', marginTop: '0.5rem' }}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(related.price)}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Inquiry Modal */}
            {showInquiryModal && <InquiryModal artworkId={artwork.id} onClose={() => setShowInquiryModal(false)} />}

            {/* CSS for Responsive Layout Breakpoints */}
            <style>{`
                @media (min-width: 800px) {
                    .artwork-layout {
                        grid-template-columns: 1fr 1fr;
                    }
                }
                @media (min-width: 1024px) {
                    .artwork-layout {
                        grid-template-columns: 55% 1fr;
                    }
                }
            `}</style>
        </>
    );
};

export default IndividualArtworkPage;