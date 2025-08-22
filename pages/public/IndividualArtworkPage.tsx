// src/pages/public/IndividualArtworkPage.tsx

import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import InquiryModal from '../../components/public/InquiryModal';
import { Share2, ShoppingCart, User } from 'lucide-react';

// --- UPDATED: Query now fetches artist's bio ---
const fetchArtworkBySlug = async (artworkSlug: string) => {
    const { data, error } = await supabase
        .from('artworks')
        .select('*, artist:profiles(full_name, slug, bio)') // Fetching 'bio'
        .eq('slug', artworkSlug)
        .single();
    if (error) throw new Error('Artwork not found');
    return data;
};

// --- NEW: Query to fetch related artworks using the database function ---
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
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const { addViewedArtwork } = useRecentlyViewed();

    // --- Main artwork query ---
    const { data: artwork, isLoading, isError } = useQuery({
        queryKey: ['artwork', artworkSlug],
        queryFn: () => fetchArtworkBySlug(artworkSlug!),
        enabled: !!artworkSlug,
    });

    // --- NEW: Related artworks query, dependent on the main artwork query finishing ---
    const { data: relatedArtworks } = useQuery({
        queryKey: ['relatedArtworks', artwork?.id],
        queryFn: () => fetchRelatedArtworks(artwork!.id, artwork!.user_id, artwork!.medium, artwork!.price),
        enabled: !!artwork, // Only run this query when the main artwork has been fetched
    });

    useEffect(() => {
        if (artwork) {
            addViewedArtwork(artwork.id);
            supabase.rpc('log_artwork_view', { p_artwork_id: artwork.id, p_artist_id: artwork.user_id });
        }
    }, [artwork, addViewedArtwork]);
    
    // --- UPDATED: Scroll to top when slug changes to show new page from top ---
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [artworkSlug]);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    };
    
    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading artwork...</p>;
    if (isError || !artwork) return <p style={{ textAlign: 'center', padding: '5rem' }}>Artwork not found.</p>;
    
    // Helper for formatting dimensions
    const formatDimensions = (dims: any) => {
        if (!dims || !dims.height || !dims.width) return null;
        const parts = [dims.height, dims.width, dims.depth].filter(Boolean);
        return `${parts.join(' x ')} ${dims.unit || ''}`;
    };

    return (
        <>
            {/* --- UPDATED: Main container is now fully responsive --- */}
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
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
                        <Link to={`/artist/${artwork.artist.slug}`} style={{textDecoration: 'none'}}>
                            <h2 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', color: 'var(--muted-foreground)', fontWeight: 500, marginTop: '0.5rem' }}>by {artwork.artist.full_name}</h2>
                        </Link>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2rem 0' }}/>
                        
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
                        
                        {/* --- NEW: Artist Bio Section --- */}
                        {artwork.artist.bio && (
                            <div style={{ marginTop: '3rem' }}>
                                <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>About the Artist</h3>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ background: 'var(--muted)', borderRadius: '50%', padding: '0.5rem', display: 'grid', placeItems: 'center' }}><User size={20} /></div>
                                    <p style={{ flex: 1, lineHeight: 1.6 }}>{artwork.artist.bio}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- NEW: Related Artworks Section --- */}
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

            {/* Modal */}
            {showInquiryModal && <InquiryModal artworkId={artwork.id} onClose={() => setShowInquiryModal(false)} />}
            
            {/* CSS for Responsive Layout */}
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