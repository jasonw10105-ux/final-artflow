import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { MessageSquare, ShoppingCart, Info, CheckCircle } from 'lucide-react'; // Added more specific icons

// Define interfaces for expected data from Supabase
interface RecentInquiry {
    id: string;
    inquirer_name: string;
    artwork_id: string | null;
    artworks: { title: string | null } | null;
}

interface RecentSale {
    id: string;
    sale_price: number;
    currency: string;
    collector: { full_name: string | null } | null;
    artwork_id: string;
    artworks: { title: string | null } | null;
}

interface RecentTask {
    id: string;
    title: string;
    status: string; // 'pending', 'completed'
    due_date: string;
    related_entity: string;
}

// Fetch recent inquiries
const fetchRecentInquiries = async (artistId: string): Promise<RecentInquiry[]> => {
    const { data, error } = await supabase
        .from('conversations')
        .select('id, inquirer_name, artwork_id, artworks(title)')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false })
        .limit(3); // Limit to 3 recent inquiries
    if (error) throw new Error(error.message);
    return data as RecentInquiry[];
};

// Fetch recent sales
const fetchRecentSales = async (artistId: string): Promise<RecentSale[]> => {
    const { data, error } = await supabase
        .from('sales')
        .select('id, sale_price, currency, collector:profiles(full_name), artwork_id, artworks(title)')
        .eq('artist_id', artistId)
        .order('sale_date', { ascending: false })
        .limit(2); // Limit to 2 recent sales
    if (error) throw new Error(error.message);
    return data as RecentSale[];
};

// Fetch recent pending tasks
const fetchRecentTasks = async (artistId: string): Promise<RecentTask[]> => {
    const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, related_entity')
        .eq('user_id', artistId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }) // Order by creation to see newest tasks
        .limit(3);
    if (error) throw new Error(error.message);
    return data as RecentTask[];
};


const RecentActivityWidget = () => {
    const { user } = useAuth();

    // Fetch inquiries
    const { data: inquiries, isLoading: isLoadingInquiries, error: inquiriesError } = useQuery({
        queryKey: ['recentInquiries', user?.id],
        queryFn: () => fetchRecentInquiries(user!.id),
        enabled: !!user,
    });

    // Fetch sales
    const { data: sales, isLoading: isLoadingSales, error: salesError } = useQuery({
        queryKey: ['recentSales', user?.id],
        queryFn: () => fetchRecentSales(user!.id),
        enabled: !!user,
    });

    // Fetch tasks
    const { data: tasks, isLoading: isLoadingTasks, error: tasksError } = useQuery({
        queryKey: ['recentTasks', user?.id],
        queryFn: () => fetchRecentTasks(user!.id),
        enabled: !!user,
    });

    const isLoading = isLoadingInquiries || isLoadingSales || isLoadingTasks;
    const hasError = inquiriesError || salesError || tasksError;

    if (isLoading) return <p className="loading-message">Loading activity...</p>;
    if (hasError) return <p className="error-message">Error loading activity: {hasError?.message}</p>;

    const allActivity = [
        ...(inquiries || []).map(item => ({
            type: 'inquiry',
            id: item.id,
            timestamp: new Date().toISOString(), // Use actual created_at if available
            message: `New inquiry from ${item.inquirer_name}` + (item.artworks?.title ? ` about "${item.artworks.title}"` : ''),
            link: `/u/messages?conversation=${item.id}`,
            icon: <MessageSquare size={16} className="text-blue-500" />
        })),
        ...(sales || []).map(item => ({
            type: 'sale',
            id: item.id,
            timestamp: new Date().toISOString(), // Use actual sale_date if available
            message: `Artwork "${item.artworks?.title}" sold for ${item.currency} ${item.sale_price.toLocaleString()}` + (item.collector?.full_name ? ` to ${item.collector.full_name}` : ''),
            link: `/u/sales`,
            icon: <ShoppingCart size={16} className="text-green-500" />
        })),
        ...(tasks || []).map(item => ({
            type: 'task',
            id: item.id,
            timestamp: new Date(item.due_date).toISOString(), // Use due_date for tasks
            message: `Upcoming task: "${item.title}" due on ${new Date(item.due_date).toLocaleDateString()}`,
            link: `/u/calendar`,
            icon: <CheckCircle size={16} className="text-yellow-500" />
        }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort by timestamp descending

    return (
        <div className="widget dashboard-section">
            <h3 className="dashboard-section-title">Recent Activity</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {allActivity.length > 0 ? (
                    allActivity.map((activity) => (
                        <li key={activity.id} className="flex items-center gap-3">
                            {activity.icon}
                            <Link to={activity.link} className="text-link">
                                {activity.message}
                            </Link>
                        </li>
                    ))
                ) : (
                    <p className="empty-state-message">No recent activity to display.</p>
                )}
            </ul>
        </div>
    );
};
export default RecentActivityWidget;