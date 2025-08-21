import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { Link } from 'react-router-dom';

const fetchInquiries = async (userId: string) => {
    const { data, error } = await supabase
        .from('conversations')
        .select(`id, last_message_at, status, artwork:artworks(id, title, slug), artist:profiles(id, full_name, slug)`)
        .eq('inquirer_user_id', userId)
        .order('last_message_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
};

const CollectorInquiriesPage = () => {
    const { user } = useAuth();
    const { data: conversations, isLoading } = useQuery('collectorInquiries', () => fetchInquiries(user!.id), { enabled: !!user });

    if (isLoading) return <p>Loading your inquiries...</p>;

    return (
        <div>
            <h1>Your Inquiries</h1>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Track your conversations with artists about their work.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {conversations && conversations.length > 0 ? (
                    conversations.map(convo => (
                        <div key={convo.id} style={{ background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
                            <p style={{ fontSize: '1.125rem' }}>
                                Inquiry about <Link to={`/artwork/${convo.artist.slug}/${convo.artwork.slug}`}><strong>{convo.artwork.title}</strong></Link>
                            </p>
                            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                                with artist <Link to={`/${convo.artist.slug}`}><strong>{convo.artist.full_name}</strong></Link>
                            </p>
                            <span style={{ background: 'var(--secondary)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius)', fontSize: '0.75rem' }}>
                                Status: {convo.status}
                            </span>
                            <small style={{ display: 'block', color: 'var(--muted-foreground)', marginTop: '1rem' }}>
                                Last update: {new Date(convo.last_message_at).toLocaleString()}
                            </small>
                        </div>
                    ))
                ) : (
                    <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '3rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
                        You have not made any inquiries yet.
                    </p>
                )}
            </div>
        </div>
    );
};
export default CollectorInquiriesPage;
