// src/pages/public/ArtistPortfolioPage.tsx

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';
import InquiryModal from '../../components/public/InquiryModal';

// --- (Keep your existing fetch function) ---
const fetchArtistPortfolio = async (slug: string) => {
    const { data: profile, error: profileError } = await supabase.from('profiles').select('id, full_name, bio, slug, avatar_url').eq('slug', slug).single();
    if (profileError) throw new Error('Artist not found');
    const { data: artworks, error: artworksError } = await supabase.from('artworks').select('*').eq('user_id', profile.id).eq('status', 'Active').order('created_at', { ascending: false });
    if (artworksError) throw new Error('Could not fetch artworks');
    await supabase.rpc('log_profile_view', { p_artist_id: profile.id });
    return { profile, artworks };
};

type ArtworkForModal = {
    id: string;
    title: string | null;
    image_url: string | null;
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
    if (isError || !data) return (
         <div style={{ textAlign: 'center', padding: '5rem' }}>
            <h1>404 - Artist Not Found</h1>
            <p>The artist you are looking for does not exist or has moved.</p>
            <Link to="/artists" className="button button-primary">Browse Artists</Link>
        </div>
    );

    const { profile, artworks } = data;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <button onClick={() => navigate('/artists')} className="button button-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> All Artists
            </button>
            
            {/* ... (header section can remain the same) ... */}
            <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <img src={profile.avatar_url || 'https://placehold.co/128x128'} alt={profile.full_name || ''} style={{ width: '128px', height: '128px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                <h1 style={{ fontSize: '2.5rem', marginTop: '1.5rem' }}>{profile.full_name}</h1>
                {profile.bio && <p style={{ fontSize: '1.1rem', color: 'var(--muted-foreground)', marginTop: '1rem', maxWidth: '800px', margin: '1rem auto' }}>{profile.bio}</p>}
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                {artworks.map(art => (
                    <div key={art.id} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {/* CRITICAL FIX: The URL must match the pattern /:profileSlug/artwork/:artworkSlug */}
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
                             <button className="button button-secondary" style={{ width: '100%' }} onClick={() => setInquiryArtwork(art as ArtworkForModal)}>
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
                <InquiryModal artworkId={inquiryArtwork.id} onClose={() => setInquiryArtwork(null)} previewImageUrl={inquiryArtwork.image_url || undefined} previewTitle={inquiryArtwork.title || undefined} />
            )}
        </div>
    );
};

export default ArtistPortfolioPage;
