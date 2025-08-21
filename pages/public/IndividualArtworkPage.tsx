import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import InquiryModal from '../../components/public/InquiryModal';
import { Share2, ShoppingCart } from 'lucide-react';

const fetchArtworkBySlug = async (artworkSlug: string) => {
    const { data, error } = await supabase.from('artworks').select('*, artist:profiles(full_name, slug)').eq('slug', artworkSlug).single();
    if (error) throw new Error('Artwork not found');
    return data;
};

const IndividualArtworkPage = () => {
    const { artworkSlug } = useParams<{ artworkSlug: string }>();
    const { data: artwork, isLoading, isError } = useQuery(['artwork', artworkSlug], () => fetchArtworkBySlug(artworkSlug!), {
      enabled: !!artworkSlug,
    });
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const { addViewedArtwork } = useRecentlyViewed();

    useEffect(() => {
        if (artwork) {
            addViewedArtwork(artwork.id);
            supabase.rpc('log_artwork_view', { p_artwork_id: artwork.id, p_artist_id: artwork.user_id });
        }
    }, [artwork, addViewedArtwork]);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    };
    
    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading artwork...</p>;
    if (isError) return <p style={{ textAlign: 'center', padding: '5rem' }}>Artwork not found.</p>;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '3rem', maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                <img src={artwork.image_url} alt={artwork.title} style={{ width: '100%', borderRadius: 'var(--radius)' }} />
            </div>
            <div>
                <h1 style={{ fontSize: '2.5rem' }}>{artwork.title}</h1>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>by {artwork.artist.full_name}</h2>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2rem 0' }}/>
                
                <div style={{ background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
                    <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {artwork.is_price_negotiable ? `Negotiable ($${artwork.min_price} - $${artwork.max_price})` : `$${artwork.price}`}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button className="button button-secondary" onClick={handleShare} style={{ display: 'flex', gap: '0.5rem' }}><Share2 size={16} /> Share</button>
                        <button className="button" onClick={() => setShowInquiryModal(true)}>Inquire About This Piece</button>
                        {!artwork.is_price_negotiable && <button className="button button-primary" style={{ display: 'flex', gap: '0.5rem' }}><ShoppingCart size={16} />Buy Now</button>}
                    </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <p>{artwork.description}</p>
                </div>
            </div>
            {showInquiryModal && <InquiryModal artworkId={artwork.id} onClose={() => setShowInquiryModal(false)} />}
        </div>
    );
};
export default IndividualArtworkPage;