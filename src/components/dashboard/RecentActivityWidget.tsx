// src/components/dashboard/RecentActivityWidget.tsx

import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient'; // Using alias
import { useAuth } from '@/contexts/AuthProvider'; // FIXED: Corrected the import path
import { Link } from 'react-router-dom';

const fetchRecentInquiries = async (artistId: string) => {
    const { data, error } = await supabase.from('conversations').select('id, inquirer_name').eq('artist_id', artistId)
        .order('created_at', { ascending: false }).limit(5);
    if (error) throw new Error(error.message);
    return data;
};

const RecentActivityWidget = () => {
    const { user } = useAuth();
    const { data: inquiries, isLoading } = useQuery({
        queryKey: ['recentInquiries', user?.id],
        queryFn: () => fetchRecentInquiries(user!.id),
        enabled: !!user,
    });
    
    if (isLoading) return <p>Loading activity...</p>;
    
    return (
        <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)'}}>
            <h3>Recent Inquiries</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {inquiries?.map((inquiry: any) => (
                    <li key={inquiry.id}>
                        <Link to="/artist/messages">New inquiry from {inquiry.inquirer_name}</Link>
                    </li>
                ))}
                 {inquiries?.length === 0 && <p style={{color: 'var(--muted-foreground)'}}>No recent inquiries.</p>}
            </ul>
        </div>
    );
};
export default RecentActivityWidget;