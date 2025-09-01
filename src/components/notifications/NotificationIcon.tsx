// src/components/ui/NotificationIcon.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import NotificationPanel from './NotificationPanel';

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
  const [filter, setFilter] = useState<'all' | 'artwork' | 'artist' | 'catalogue'>('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => queryClient.invalidateQueries(['notifications', user?.id]),
    onError: (error: any) => toast.error(`Failed to mark notifications as read: ${error.message}`),
  });

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) mutation.mutate(unreadIds);
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`public:notifications:user_id=eq.${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () =>
        queryClient.invalidateQueries(['notifications', user.id])
      )
      .subscribe();
    return () => supabase.removeChannel(channel).catch(console.error);
  }, [user, queryClient]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNotifications = notifications.filter(n => filter === 'all' || n.type === filter);
  const unreadCount = filteredNotifications.filter(n => !n.is_read).length;

  return (
    <div className="notification-icon-wrapper" ref={wrapperRef}>
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="notification-icon-button"
        aria-haspopup="true"
        aria-expanded={isPanelOpen}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell size={24} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>
      {isPanelOpen && (
        <NotificationPanel
          notifications={filteredNotifications}
          onMarkAllRead={handleMarkAllRead}
          isLoading={isLoading}
          filter={filter}
          setFilter={setFilter}
        />
      )}
    </div>
  );
};

export default NotificationIcon;