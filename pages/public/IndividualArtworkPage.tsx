// src/pages/public/IndividualArtworkPage.tsx

import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import InquiryModal from '../../components/public/InquiryModal';
import { Share2, ShoppingCart, User, ArrowRight } from 'lucide-react';

// Query to fetch the main artwork and artist's bio
const fetchArtworkBySlug = async (artworkSlug: string) => {
    const { data, error } = await supabase
        .from('artworks')
        .select('*, artist:profiles(full_name, slug, bio)')
        .eq('slug', artworkSlug)
        .single();
    if (error) throw new Error('Artwork not found');
    return data;
};

// --- FIXED ---
// The RPC call now sends the parameters in the order suggested by the database error hint.
// This resolves the 404 error by matching the expected function signature.
const fetchRelatedArtworks = async (artworkId: string, artistId: string) => {
    const { data, error } = await supabase.rpc('get_related_artworks', {
        p_artwork_id: artworkId,
        p_artist_id: artistId
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

    // Main artwork query
    const { data: artwork, isLoading, isError } = useQuery({
        queryKey: ['artwork', artworkSlug],
        queryFn: () => fetchArtworkBySlug(artworkSlug!),
        enabled: !!artworkSlug,
    });

    // Related artworks query, dependent on the main artwork query finishing
    const { data: relatedArtworks } = useQuery({
        queryKey: ['relatedArtworks', artwork?.id],
        queryFn: () => fetchRelatedArtworks(artwork!.id, artwork!.user_id),
        enabled: !!artwork, // Only run this query when the main artwork has been fetched
    });

    useEffect(() => {
        if (artwork) {
            addViewedArtwork(artwork.id);
            supabase.rpc('log_artwork_view', { p_artwork_id: artwork.id, p_artist_id: artwork.user_id });
        }
    }, [artwork, addViewedArtwork]);
    
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [artworkSlug]);

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
                        {artwork.artist && (
                            <Link to={`/artist/${artwork.artist.slug}`} style={{textDecoration: 'none'}}>
                                <h2 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', color: 'var(--muted-foreground)', fontWeight: 500, marginTop: '0.5rem' }}>by {artwork.artist.full_name}</h2>
                            </Link>
                        )}
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2rem 0' }}/>
                        
                        <div style={{ background: 'var(
