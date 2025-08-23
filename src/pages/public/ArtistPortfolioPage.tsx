// src/pages/public/ArtistPortfolioPage.tsx

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';
import InquiryModal from '../../components/public/InquiryModal';

// ... (fetchArtistPortfolio function remains the same) ...

type ArtworkForModal = {
    id: string;
    title: string | null;
    image_url: string | null;
    price: number;
};

const ArtistPortfolioPage = () => {
    const { profileSlug } = useParams<{ profileSlug: string }>();
    const navigate = useNavigate();
    const [inquiryArtwork, setInquiryArtwork] = useState<ArtworkForModal | null>(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['artistPortfolio', profileSlug],
        queryFn: () => fetchArtistPortfolio(profileSlug!),
        enabled: !!profileSlug,
    });

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading Artist Portfolio...</p>;
    if (isError || !data) return <p style={{ textAlign: 'center', padding: '5rem' }}>Artist not found.</p>;

    const { profile, artworks } = data;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            {/* ... (header and back button remain the same) ... */}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                {artworks.map(art => (
                    <div key={art.id} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <Link to={`/${profile.slug}/artwork/${art.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <img src={art.image_url || 'https://placehold.co/600x400'} alt={art.title || ''} style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
                            <div style={{ padding: '1rem' }}>
                                <h4 style={{ fontWeight: 600 }}>{art.title}</h4>
                                <p style={{ fontWeight: 'bold', marginTop: '0.5rem' }}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(art.price)}
                                </p>
                            </div>
                        </Link>
                        <div style={{ padding: '0 1rem 1rem', marginTop: 'auto' }}>
                             <button className="button button-secondary" style={{ width: '100%' }} onClick={() => setInquiryArtwork(art)}>
                                Inquire
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {artworks.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '3rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>This artist does not have any artworks for sale at the moment.</p>
            )}

            {inquiryArtwork && (
                <InquiryModal
                    artworkId={inquiryArtwork.id}
                    onClose={() => setInquiryArtwork(null)}
                    previewImageUrl={inquiryArtwork.image_url || undefined}
                    previewTitle={inquiryArtwork.title || undefined}
                />
            )}
        </div>
    );
};

export default ArtistPortfolioPage;
