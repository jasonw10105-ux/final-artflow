// src/pages/public/IndividualArtworkPage.tsx

import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import InquiryModal from '../../components/public/InquiryModal';
import { Share2, ShoppingCart, User, ArrowRight, ArrowLeft } from 'lucide-react';

// ... (fetch functions remain the same) ...

const IndividualArtworkPage = () => {
    const { artworkSlug } = useParams<{ artworkSlug: string }>();
    const navigate = useNavigate(); // <-- Add this line
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    // ... (rest of the hooks and functions remain the same) ...

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading artwork...</p>;
    if (isError || !artwork) return <p style={{ textAlign: 'center', padding: '5rem' }}>Artwork not found.</p>;
    
    // ...

    return (
        <>
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
                {/* --- NEW: Back Button --- */}
                <button 
                    onClick={() => navigate(-1)} 
                    className="button button-secondary" 
                    style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                <div style={{...}} className="artwork-layout">
                    {/* ... (rest of the component JSX) ... */}
                </div>
                {/* ... (rest of the component JSX) ... */}
            </div>
            {/* ... */}
        </>
    );
};
export default IndividualArtworkPage;