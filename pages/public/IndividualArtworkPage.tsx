// src/pages/public/IndividualArtworkPage.tsx

import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import InquiryModal from '../../components/public/InquiryModal';
import { Share2, ShoppingCart, User, ArrowRight } from 'lucide-react';

const fetchArtworkBySlug = async (artworkSlug: string) => {
    const { data, error } = await supabase
        .from('artworks')
        .select('*, artist:profiles(full_name, slug, bio)')
        .eq('slug', artworkSlug)
        .single();
    if (error) throw new Error('Artwork not found');
    return data;
};

// FINAL: This function call matches the SQL function signature exactly.
const fetchRelatedArtworks = async (artworkId: string, artistId: string) => {
    const { data, error } = await supabase.rpc('get_related_artworks', {
        p_artist_id: artistId,
        p_artwork_id: artworkId
    });
    if (error) {
        console.error("Critical Error fetching related artworks:", error);
        throw new Error(error.message); // This will be caught by React Query
    }
    return data;
};

const IndividualArtworkPage = () => {
    const { artworkSlug } = useParams<{ artworkSlug: string }>();
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const { addViewedArtwork } = useRecentlyViewed();

    const { data: artwork, isLoading, isError } = useQuery({
        queryKey: ['artwork', artworkSlug],
        queryFn: () => fetchArtworkBySlug(artworkSlug!),
        enabled: !!artworkSlug,
    });

    const { data: relatedArtworks, isError: relatedIsError } = useQuery({
        queryKey: ['relatedArtworks', artwork?.id],
        queryFn: () => fetchRelatedArtworks(artwork!.id, artwork!.user_id),
        enabled: !!artwork,
    });

    useEffect(() => {
        if (artwork) {
            addViewedArtwork(artwork.id);
            supabase.rpc('log_artwork_view', { p_artwork_id: artwork.id, p_artist_id: artwork.user_id });
        }
    }, [artwork, addViewedArtwork]);
    
    useEffect(() => { window.scrollTo(0, 0); }, [artworkSlug]);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    };
    
    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading artwork...</p>;
    if (isError || !artwork) return <p style={{ textAlign: 'center', padding: '5rem' }}>Artwork not found.</p>;
    
    const formatDimensions = (dims: any) => {
        if (!dims || !dims.height || !dims.width) return null;
        const parts = [dims.height, dims.width, dims.depth].filter(Boolean);
        return `${parts.join(' x ')} ${dims.unit || ''}`;
    };

    return (
        <>
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
                {/* ... Main artwork display code (unchanged) ... */}
                
                {/* FINAL: This section now handles all states gracefully. */}
                <div style={{ marginTop: '4rem' }}>
                    <h2 style={{ fontSize: '1.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>More from this Artist</h2>
                    
                    {relatedIsError && <p>Could not load related artworks at this time.</p>}
                    
                    {relatedArtworks && relatedArtworks.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                            {relatedArtworks.map((related: any) => (
                                <Link key={related.id} to={`/artwork/${artwork.artist.slug}/${related.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
                    )}
                </div>
            </div>

            {showInquiryModal && <InquiryModal artworkId={artwork.id} onClose={() => setShowInquiryModal(false)} />}
            <style>{`.artwork-layout { grid-template-columns: 1fr; } @media (min-width: 800px) { .artwork-layout { grid-template-columns: 1fr 1fr; } } @media (min-width: 1024px) { .artwork-layout { grid-template-columns: 55% 1fr; } }`}</style>
        </>
    );
};

export default IndividualArtworkPage;
