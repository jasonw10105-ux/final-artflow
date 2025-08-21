// src/pages/public/IndividualArtworkPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import InquiryModal from '../../components/public/InquiryModal';

// --- INTERFACE: Fully updated to match your schema ---
interface Artwork {
  id: string;
  user_id: string;
  title: string;
  description: string;
  image_url: string;
  price: number | null;
  status: string;
  is_price_negotiable: boolean;
  location: string | null;
  medium: string | null;
  dimensions: { height?: string; width?: string; depth?: string; unit?: string; } | null;
  date_info: { type?: string; year?: string; era?: string; } | null;
  signature_info: { is_signed?: boolean; type?: string; location?: string; } | null;
  artist: { full_name: string; slug: string; } | null; // Joined artist profile data
}

// --- Helper function to format dimensions nicely ---
const formatDimensions = (dims: Artwork['dimensions']) => {
    if (!dims || !dims.height || !dims.width) return 'Not specified';
    const { height, width, depth, unit } = dims;
    let dimString = `${height}h x ${width}w`;
    if (depth) dimString += ` x ${depth}d`;
    return `${dimString} ${unit || ''}`;
};


const IndividualArtworkPage = () => {
  const { artworkSlug } = useParams<{ artworkSlug: string }>(); 
  const { user } = useAuth();
  
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchArtwork = async () => {
      if (!artworkSlug) return;
      try {
        const { data, error } = await supabase
          .from('artworks')
          .select('*, artist:profiles(full_name, slug)')
          .eq('slug', artworkSlug)
          .single();

        if (error || !data) throw new Error('Artwork not found.');
        if (data.status !== 'Available' && data.user_id !== user?.id) {
            throw new Error('This artwork is not currently available for viewing.');
        }
        setArtwork(data as Artwork);
        
        supabase.rpc('log_artwork_view', { p_artwork_id: data.id, p_artist_id: data.user_id }).catch(console.warn);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchArtwork();
  }, [artworkSlug, user]);

  if (loading) return <div>Loading artwork...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!artwork) return <div>Artwork not found.</div>;

  const isOwner = user?.id === artwork.user_id;

  return (
    <>
      {isModalOpen && <InquiryModal artworkId={artwork.id} onClose={() => setIsModalOpen(false)} />}
      
      <div className="container" style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>
          <div>
            <img src={artwork.image_url} alt={artwork.title} style={{ width: '100%', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{artwork.title}</h1>
            {artwork.artist && (
              <Link to={`/${artwork.artist.slug}`} style={{fontSize: '1.2rem', color: '#4B5563', textDecoration: 'none'}}>
                by {artwork.artist.full_name}
              </Link>
            )}
            <p style={{ fontSize: '1.1rem', color: '#4B5563', margin: '1.5rem 0' }}>{artwork.description}</p>
            
            <div style={{ background: '#F9FAFB', padding: '1.5rem', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: '0 0 1rem 0' }}>Details</h2>
              {/* --- FIXED: Details section is now complete --- */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Price:</strong>
                  <span>
                    {artwork.price ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(artwork.price)}` : 'Contact for price'}
                    {artwork.is_price_negotiable && ' (Negotiable)'}
                  </span>
                </li>
                {artwork.medium && <li style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Medium:</strong> <span>{artwork.medium}</span></li>}
                {artwork.dimensions && <li style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Dimensions:</strong> <span>{formatDimensions(artwork.dimensions)}</span></li>}
                {artwork.date_info?.year && <li style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Date:</strong> <span>{artwork.date_info.type || 'Circa'} {artwork.date_info.year}</span></li>}
                {artwork.signature_info?.is_signed && <li style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Signature:</strong> <span>Signed ({artwork.signature_info.location || 'N/A'})</span></li>}
                {artwork.location && <li style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Location:</strong> <span>{artwork.location}</span></li>}
              </ul>
            </div>

            {!isOwner && artwork.status === 'Available' && (
              <button onClick={() => setIsModalOpen(true)} className="button button-primary" style={{ width: '100%', marginTop: '2rem', padding: '1rem' }}>
                Enquire About This Artwork
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default IndividualArtworkPage;