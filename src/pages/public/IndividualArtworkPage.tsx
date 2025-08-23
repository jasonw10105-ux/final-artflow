// src/pages/public/IndividualArtworkPage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import InquiryModal from '../../components/public/InquiryModal';
import { Share2, ShoppingCart, ArrowLeft } from 'lucide-react';
import '../../index.css';

// --- (Keep your existing fetch functions, they are likely correct) ---
const fetchArtworkBySlug = async (artworkSlug) => {
    const { data, error } = await supabase.from('artworks').select('*, artist:profiles(full_name, slug, bio, short_bio, avatar_url, location)').eq('slug', artworkSlug).single();
    if (error) throw new Error('Artwork not found');
    return data;
};
const fetchRelatedArtworks = async (artworkId, artistId) => {
    const { data, error } = await supabase.rpc('get_related_artworks', { p_artist_id: artistId, p_current_artwork_id: artworkId, p_limit: 4 });
    if (error) { console.error("Error fetching related artworks:", error); throw new Error('Could not fetch related artworks.'); }
    return data;
};

const IndividualArtworkPage = () => {
    const { artworkSlug } = useParams<{ artworkSlug: string }>();
    const [showInquiryModal, setShowInquiryModal] = React.useState(false);
    const { addViewedArtwork } = useRecentlyViewed();
    const navigate = useNavigate();

    const { data: artwork, isLoading, isError } = useQuery({
        queryKey: ['artwork', artworkSlug],
        queryFn: () => fetchArtworkBySlug(artworkSlug!),
        enabled: !!artworkSlug,
    });

    const { data: relatedArtworks } = useQuery({
        queryKey: ['relatedArtworks', artwork?.id],
        queryFn: () => fetchRelatedArtworks(artwork!.id, artwork!.user_id),
        enabled: !!artwork,
    });

    React.useEffect(() => {
        if (artwork) {
            addViewedArtwork?.(artwork.id);
            supabase.rpc('log_artwork_view', { p_artwork_id: artwork.id, p_artist_id: artwork.user_id });
        }
    }, [artwork, addViewedArtwork]);

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading artwork...</p>;
    if (isError || !artwork) return (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
            <h1>404 - Artwork Not Found</h1>
            <p>The artwork you are looking for does not exist or has been moved.</p>
            <Link to="/artworks" className="button button-primary">Browse Artworks</Link>
        </div>
    );

    const creationYear = artwork.created_at ? new Date(artwork.created_at).getFullYear() : null;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <button onClick={() => navigate(-1)} className="button button-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Back
            </button>

            <div id="artwork_grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '3rem', alignItems: 'start' }}>
                <div id="artwork_img">
                    <img src={artwork.image_url || 'https://placehold.co/600x600?text=Image+Not+Available'} alt={artwork.title || ''} style={{ width: '100%', borderRadius: 'var(--radius)' }}/>
                </div>
                <div>
                    <h1>
                        {/* FIX: Ensure a leading slash for an absolute path */}
                        <Link to={`/${artwork.artist.slug}`}>{artwork.artist.full_name}</Link><br />
                        <i style={{ fontWeight: 400 }}>{artwork.title}</i>
                        {creationYear && <span className="artwork_date"> ({creationYear})</span>}
                    </h1>

                    {/* ... (rest of the component logic for price, buttons, etc.) ... */}
                    <div id="artwork_actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                         {artwork.status !== 'Sold' && (
                            <>
                                <button className="button button-primary" onClick={() => alert('Payment gateway integration needed.')}>Purchase</button>
                                <button className="button" onClick={() => setShowInquiryModal(true)}>Inquire</button>
                            </>
                        )}
                        <button className="button button-secondary" onClick={() => {/* share logic */}}><Share2 size={16} /> Share</button>
                    </div>
                </div>
            </div>
            
            {/* ... (Your section for tabs about Provenance etc. can remain here) ... */}

            <div className="section_details" style={{ marginTop: '3rem', background: 'var(--card)', padding: '2rem', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                    <h3>Other works by {artwork.artist.full_name}</h3>
                    {/* FIX: Ensure a leading slash for an absolute path */}
                    <Link to={`/${artwork.artist.slug}`}>View all</Link>
                </div>
                
                {relatedArtworks && relatedArtworks.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        {relatedArtworks.map((art) => (
                             // CRITICAL FIX: The URL must match the pattern /:profileSlug/artwork/:artworkSlug
                            <Link to={`/${artwork.artist.slug}/artwork/${art.slug}`} key={art.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ background: 'var(--background)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                    <img src={art.image_url || 'https://placehold.co/300x300'} alt={art.title || ''} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                                    <div style={{ padding: '1rem' }}>
                                        <h4>{art.title}</h4>
                                        <p style={{ color: 'var(--primary)' }}>${art.price?.toLocaleString('en-US')}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : ( <p>No related artworks found.</p> )}
            </div>

            {showInquiryModal && (
                <InquiryModal artworkId={artwork.id} onClose={() => setShowInquiryModal(false)} previewImageUrl={artwork.image_url || undefined} previewTitle={artwork.title || undefined} />
            )}
        </div>
    );
};

export default IndividualArtworkPage;
