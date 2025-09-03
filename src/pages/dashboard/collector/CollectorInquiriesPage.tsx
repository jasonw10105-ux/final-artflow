// src/pages/dashboard/collector/CollectorInquiriesPage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { Database } from '@/types/database.types'; // Assuming this has relevant types

// Define types from your Database.types.ts for better type safety
type ConversationRow = Database['public']['Tables']['conversations']['Row'];
type ArtworkTitleAndSlug = Pick<Database['public']['Tables']['artworks']['Row'], 'title' | 'slug' | 'user_id'>;
type ArtistProfileSlug = Pick<Database['public']['Tables']['profiles']['Row'], 'slug'>;

// Extend the Conversation type to include joined data
interface DetailedConversation extends ConversationRow {
    artworks: ArtworkTitleAndSlug | null;
    artist_profile: ArtistProfileSlug | null; // Assuming a join to get artist slug
}

const fetchInquiries = async (userId: string): Promise<DetailedConversation[]> => {
    const { data, error } = await supabase
        .from('conversations')
        .select(`
            id,
            created_at,
            message,
            status,
            artwork_id,
            artworks(title, slug, user_id), -- Fetch artwork slug and user_id for artist join
            artist_profile:artist_id(slug) -- Fetch artist slug for linking, assuming artist_id is directly in conversations
        `)
        .eq('collector_id', userId) // Assuming collector_id (which is inquirer_user_id)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    
    // Post-process to ensure artist_profile slug is always available, even if null in DB
    return (data || []).map(convo => ({
        ...convo,
        artist_profile: convo.artist_profile || { slug: '#' } // Provide fallback for artist slug
    }));
};

const CollectorInquiriesPage = () => {
    const { user } = useAuth();
    const { data: inquiries, isLoading, error } = useQuery<DetailedConversation[], Error>({
        queryKey: ['collector_inquiries', user?.id],
        queryFn: () => fetchInquiries(user!.id),
        enabled: !!user,
    });

    if (isLoading) return <p>Loading your inquiries...</p>;
    if (error) return <p>Error loading inquiries: {error.message}</p>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <h1>My Inquiries</h1>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>A history of your conversations about artworks.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {(inquiries && inquiries.length > 0) ? (
                    inquiries.map((convo) => (
                        <div key={convo.id} style={{ background: 'var(--card)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                            <p style={{ fontWeight: 'bold' }}>Inquiry for: {convo.artworks?.title || 'Untitled'}</p>
                            <p style={{ color: 'var(--muted-foreground)' }}>Message: {convo.message}</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Status: {convo.status}</p>
                            {convo.artwork_id && convo.artworks?.slug && convo.artist_profile?.slug && (
                                <Link to={`/${convo.artist_profile.slug}/artwork/${convo.artworks.slug}`} className="button button-secondary button-sm" style={{ marginTop: '0.5rem' }}>View Artwork</Link>
                            )}
                            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '1rem' }}>Initiated: {new Date(convo.created_at || '').toLocaleDateString()}</p>
                        </div>
                    ))
                ) : (
                    <div style={{textAlign: 'center', padding: '3rem', background: 'var(--card)', borderRadius: 'var(--radius)'}}>
                        <p>You haven't made any inquiries yet.</p>
                        <p style={{color: 'var(--muted-foreground)'}}>Found an artwork you love? Send an inquiry to the artist!</p>
                        <Link to="/artworks" className="button">Browse Artworks</Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollectorInquiriesPage;