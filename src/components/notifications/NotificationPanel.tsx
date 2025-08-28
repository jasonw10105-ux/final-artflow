import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bell } from 'lucide-react';

interface Notification {
  id: bigint;
  created_at: string;
  type: string;
  message: string;
  link_url: string | null;
  is_read: boolean;
  related_entity: 'artwork' | 'artist' | 'catalogue' | 'digest' | null;
  related_id: string | null;
  metadata: any;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
  isLoading: boolean;
  filter: 'all' | 'artwork' | 'artist' | 'catalogue' | 'digest';
  setFilter: (filter: 'all' | 'artwork' | 'artist' | 'catalogue' | 'digest') => void;
}

const getNotificationIcon = (type: string, relatedEntity: string | null) => {
  switch (relatedEntity) {
    case 'artwork':
      return <Bell size={20} className="text-purple-500" aria-label="Artwork notification" />;
    case 'artist':
      return <Bell size={20} className="text-orange-500" aria-label="Artist notification" />;
    case 'catalogue':
      return <Bell size={20} className="text-teal-500" aria-label="Catalogue notification" />;
    case 'digest':
      return <Bell size={20} className="text-indigo-500" aria-label="Digest notification" />;
    default:
      return <Bell size={20} className="text-gray-500" aria-label="General notification" />;
  }
};

const NotificationPanel = ({
  notifications,
  onMarkAllRead,
  isLoading,
  filter,
  setFilter
}: NotificationPanelProps) => {
  const filteredNotifications = notifications.filter(n =>
    filter === 'all' ? true : n.related_entity === filter
  );
  const hasUnread = filteredNotifications.some(n => !n.is_read);

  // Refs and state for keyboard navigation
  const listRef = useRef<HTMLUListElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Keyboard handler for notification list
  const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (!filteredNotifications.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => {
        if (prev === null || prev === filteredNotifications.length - 1) return 0;
        return prev + 1;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => {
        if (prev === null || prev === 0) return filteredNotifications.length - 1;
        return prev - 1;
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusedIndex(filteredNotifications.length - 1);
    }
  };

  // Effect to focus the active notification item
  useEffect(() => {
    if (focusedIndex === null) return;
    const list = listRef.current;
    if (!list) return;
    const items = list.querySelectorAll<HTMLAnchorElement>('.notification-link');
    if (items[focusedIndex]) {
      items[focusedIndex].focus();
    }
  }, [focusedIndex]);

  const getLink = (n: Notification) => {
    if (n.related_entity === 'digest') return `/explore?digest_id=${n.related_id}`;
    if (n.related_entity === 'artwork') return `/artwork/${n.related_id}`;
    if (n.related_entity === 'artist') return `/artist/${n.related_id}`;
    if (n.related_entity === 'catalogue') return `/catalogue/${n.related_id}`;
    return '#';
  };

  return (
    <div
      className="notification-panel"
      role="region"
      aria-label="Notifications panel"
      tabIndex={-1} // Make container programmatically focusable
    >
      <div
        className="notification-panel-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h4 id="notification-panel-heading">Notifications</h4>
        {hasUnread && (
          <button
            className="button-link"
            onClick={onMarkAllRead}
            aria-label="Mark all notifications as read"
            type="button"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div
        className="notification-filters"
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
        role="tablist"
        aria-label="Notification filters"
      >
        {['all', 'artwork', 'artist', 'catalogue', 'digest'].map(f => (
          <button
            key={f}
            className={`button ${filter === f ? 'button-primary' : ''}`}
            onClick={() => setFilter(f as NotificationPanelProps['filter'])}
            aria-selected={filter === f}
            role="tab"
            type="button"
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <ul
        className="notification-list"
        aria-live="polite"
        aria-relevant="additions removals"
        aria-labelledby="notification-panel-heading"
        onKeyDown={onKeyDown}
        ref={listRef}
        tabIndex={0} // Make list focusable for keyboard nav
        role="list"
      >
        {isLoading && <li className="notification-list-message">Loading...</li>}
        {!isLoading && filteredNotifications.length === 0 && (
          <li className="notification-list-message">No notifications to show.</li>
        )}
        {!isLoading &&
          filteredNotifications.map((n, i) => (
            <li key={n.id.toString()} className="notification-list-item" role="listitem">
              <Link
                to={getLink(n)}
                className="notification-link"
                tabIndex={focusedIndex === i ? 0 : -1}
                aria-current={!n.is_read ? 'true' : undefined}
              >
                <div
                  className="notification-content"
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <div className="notification-icon" style={{ marginRight: '0.5rem' }}>
                    {getNotificationIcon(n.type, n.related_entity)}
                  </div>
                  <div className="notification-body">
                    <p className={`notification-message ${!n.is_read ? 'unread' : ''}`}>
                      {n.message}
                    </p>
                    <small
                      className="notification-timestamp"
                      aria-label={`Received ${formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}`}
                    >
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </small>
                  </div>
                </div>
              </Link>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default NotificationPanel;
