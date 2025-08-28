// src/components/ui/NotificationIcon.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import NotificationPanel from './NotificationPanel';

const fetchLatestNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data;
};

const fetchNotificationPreferences = async (userId: string) => {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
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
  const [filter, setFilter] = useState<'all' | 'artwork' | 'artist' | 'catalogue'>('all');

  const { data: prefs } = useQuery({
    queryKey: ['notificationPreferences', user?.id],
    queryFn: () => fetchNotificationPreferences(user!.id),
    enabled: !!user,
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => fetchLatestNotifications(user!.id),
    enabled: !!user && !!prefs,
    refetchOnWindowFocus: true,
  });

  const mutation = useMutation(markAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) mutation.mutate(unreadIds);
  };

  // ------------------ Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`public:notifications:user_id=eq.${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // ------------------ Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // ------------------ Filtered notifications
  const filteredNotifications = notifications.filter(n => {
    if (!prefs) return true;
    if (!prefs.notify_realtime_artworks && n.type === 'artwork') return false;
    if (!prefs.notify_realtime_artists && n.type === 'artist') return false;
    if (!prefs.notify_realtime_catalogues && n.type === 'catalogue') return false;
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const unreadCount = filteredNotifications.filter(n => !n.is_read).length;

  return (
    <div className="notification-icon-wrapper" ref={wrapperRef}>
      <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="notification-icon-button">
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
