import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NotificationPanel from './NotificationPanel';

const fetchLatestNotifications = async (userId: string) => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10); // Fetch the 10 most recent
    if (error) throw new Error(error.message);
    return data;
};

const markAsRead = async (notificationIds: bigint[]) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds);
    if (error) throw new Error(error.message);
};

const NotificationIcon = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications', user?.id],
        queryFn: () => fetchLatestNotifications(user!.id),
        enabled: !!user,
        refetchOnWindowFocus: true,
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const mutation = useMutation({
        mutationFn: markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        },
    });

    const handleMarkAllRead = () => {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length > 0) {
            mutation.mutate(unreadIds);
        }
    };

    // Listen for Realtime updates
    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel(`public:notifications:user_id=eq.${user.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user, queryClient]);

    // Handle clicks outside the component to close the panel
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [wrapperRef]);

    return (
        <div className="notification-icon-wrapper" ref={wrapperRef}>
            <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="notification-icon-button">
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                )}
            </button>
            {isPanelOpen && (
                <NotificationPanel
                    notifications={notifications}
                    onMarkAllRead={handleMarkAllRead}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
};

export default NotificationIcon;