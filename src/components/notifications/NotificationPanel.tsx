// src/components/ui/NotificationPanel.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Mail, DollarSign, Bell } from 'lucide-react';

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
      return <Bell size={20} className="text-purple-500" />;
    case 'artist':
      return <Bell size={20} className="text-orange-500" />;
    case 'catalogue':
      return <Bell size={20} className="text-teal-500" />;
    case 'digest':
      return <Bell size={20} className="text-indigo-500" />;
    default:
      return <Bell size={20} className="text-gray-500" />;
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

  const getLink = (n: Notification) => {
    if (n.related_entity === 'digest') return `/explore?digest_id=${n.related_id}`;
    if (n.related_entity === 'artwork') return `/artwork/${n.related_id}`;
    if (n.related_entity === 'artist') return `/artist/${n.related_id}`;
    if (n.related_entity === 'catalogue') return `/catalogue/${n.related_id}`;
    return '#';
  };

  return (
    <div className="notification-panel">
      <div className="notification-panel-header">
        <h4>Notifications</h4>
        {hasUnread && (
          <button className="button-link" onClick={onMarkAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="notification-filters" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['all','artwork','artist','catalogue','digest'].map(f => (
          <button
            key={f}
            className={`button ${filter === f ? 'button-primary' : ''}`}
            onClick={() => setFilter(f as any)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <ul className="notification-list">
        {isLoading && <li className="notification-list-message">Loading...</li>}
        {!isLoading && filteredNotifications.length === 0 && (
          <li className="notification-list-message">No notifications to show.</li>
        )}
        {!isLoading && filteredNotifications.map(n => (
          <li key={n.id} className="notification-list-item">
            <Link to={getLink(n)} className="notification-link">
              <div className="notification-content">
                <div className="notification-icon">{getNotificationIcon(n.type, n.related_entity)}</div>
                <div className="notification-body">
                  <p className={`notification-message ${!n.is_read ? 'unread' : ''}`}>
                    {n.message}
                  </p>
                  <small className="notification-timestamp">
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
