// src/pages/public/PublicCataloguePage.tsx

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';
import '../../index.css';
import InquiryModal from '../../components/public/InquiryModal';

// ... (fetchPublicCatalogue function remains the same) ...

type ArtworkForModal = {
    id: string;
    title: string | null;
    slug: string;
    image_url: string | null;
    price: number;
};

const PublicCataloguePage = () => {
    const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string; catalogueSlug: string; }>();
    const navigate = useNavigate();
    const [inquiryArtwork, setInquiryArtwork] = useState<ArtworkForModal | null>(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['publicCatalogue', artistSlug, catalogueSlug],
        queryFn: () => fetchPublicCatalogue(artistSlug!, catalogueSlug!),
        enabled: !!artistSlug && !!catalogueSlug,
        retry: 1,
    });

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading Catalogue...</p>;
    if (isError || !data) return <p style={{ textAlign: 'center', padding: '5rem' }}>This catalogue could not be found.</p>;

    const { catalogue, artworks } = data;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            {/* ... (header and back button remain the same) ... */}

            {artworks && artworks.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                    {artworks.map(art => (
                        <div key={art.id} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <Link to={`/${catalogue.artist.slug}/artwork/${art.slug}`} className="artwork-card-link" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <img src={art.image_url || 'https://placehold.co/600x400?text=No+Image'} alt={art.title || 'Artwork'} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }}/>
                                <div className="artwork-card-info" style={{ padding: '1rem' }}>
                                    <h4>{art.title}</h4>
                                    <p>${new Intl.NumberFormat('en-US').format(art.price)}</p>
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
            ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
                    <p style={{ color: 'var(--muted-foreground)' }}>There are no available artworks in this catalogue at the moment.</p>
                </div>
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

export default PublicCataloguePage;
