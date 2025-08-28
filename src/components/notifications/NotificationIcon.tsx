// src/components/ui/NotificationIcon.tsx
import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import NotificationPanel from './NotificationPanel';

interface Notification {
  id: bigint;
  user_id: string;
  type: 'artwork' | 'artist' | 'catalogue';
  is_read: boolean;
  created_at: string;
  // Add any other fields you use
}

interface NotificationPreferences {
  notify_realtime_artworks: boolean;
  notify_realtime_artists: boolean;
  notify_realtime_catalogues: boolean;
  // Other preference fields if any
}

const fetchLatestNotifications = async (userId: string): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data || [];
};

const fetchNotificationPreferences = async (userId: string): Promise<NotificationPreferences | null> => {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
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

  const { data: prefs } = useQuery<NotificationPreferences | null>({
    queryKey: ['notificationPreferences', user?.id],
    queryFn: () => fetchNotificationPreferences(user!.id),
    enabled: !!user,
    onError: (error: Error) => toast.error(`Failed to load notification preferences: ${error.message}`),
  });

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: () => fetchLatestNotifications(user!.id),
    enabled: !!user && !!prefs,
    refetchOnWindowFocus: true,
    onError: (error: Error) => toast.error(`Failed to load notifications: ${error.message}`),
  });

  const mutation = useMutation(markAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark notifications as read: ${error.message}`);
    },
  });

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) mutation.mutate(unreadIds);
  };

  // ------------------ Realtime subscription with cleanup
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

    return () => {
      supabase.removeChannel(channel).catch(console.error);
    };
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
  }, []);

  // ------------------ Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsPanelOpen(false);
      }
    }
    if (isPanelOpen) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen]);

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
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="notification-icon-button"
        aria-haspopup="true"
        aria-expanded={isPanelOpen}
        aria-controls="notification-panel"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell size={24} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>
      {isPanelOpen && (
        <NotificationPanel
          id="notification-panel"
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
