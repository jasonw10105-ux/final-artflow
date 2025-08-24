// src/pages/dashboard/collector/CollectorInquiriesPage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { Database } from '@/types/database.types';

type Conversation = Database['public']['Tables']['conversations']['Row'] & {
    artworks: Pick<Database['public']['Tables']['artworks']['Row'], 'title'>;
};

const fetchInquiries = async (userId: string): Promise<Conversation[]> => {
    const { data, error } = await supabase
        .from('conversations')
        .select('*, artworks(title)')
        .eq('inquirer_user_id', userId)
        .order('last_message_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data as any[]) || [];
};

const CollectorInquiriesPage = () => {
    const { user } = useAuth();
    const { data: inquiries, isLoading } = useQuery({
        queryKey: ['collector_inquiries', user?.id],
        queryFn: () => fetchInquiries(user!.id),
        enabled: !!user,
    });

    if (isLoading) return <p>Loading your inquiries...</p>;

    return (
        <div>
            <h1>My Inquiries</h1>
            <div>
                {(inquiries && inquiries.length > 0) ? (
                    inquiries.map((convo: Conversation) => (
                        <div key={convo.id}>
                            <p>Inquiry for: {convo.artworks?.title || 'Untitled'}</p>
                            {/* Further details */}
                        </div>
                    ))
                ) : (
                    <p>You haven't made any inquiries yet.</p>
                )}
            </div>
        </div>
    );
};

export default CollectorInquiriesPage;