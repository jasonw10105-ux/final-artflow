// src/components/ui/NotificationPanel.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Mail, DollarSign, Bell } from 'lucide-react';

interface Notification {
  id: bigint;
  created_at: string;
  type: 'artwork' | 'artist' | 'catalogue' | 'digest' | 'new_message' | 'new_sale';
  message: string;
  link_url: string | null;
  is_read: boolean;
  digest_id?: bigint; // optional
}

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
  isLoading: boolean;
  filter: 'all' | 'artwork' | 'artist' | 'catalogue' | 'digest';
  setFilter: (filter: 'all' | 'artwork' | 'artist' | 'catalogue' | 'digest') => void;
  userPreferences: {
    artwork: boolean;
    artist: boolean;
    catalogue: boolean;
    digest: boolean;
  };
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_message': return <Mail size={20} className="text-blue-500" />;
    case 'new_sale': return <DollarSign size={20} className="text-green-500" />;
    case 'artwork': return <Bell size={20} className="text-purple-500" />;
    case 'artist': return <Bell size={20} className="text-orange-500" />;
    case 'catalogue': return <Bell size={20} className="text-teal-500" />;
    case 'digest': return <Bell size={20} className="text-indigo-500" />;
    default: return <Bell size={20} className="text-gray-500" />;
  }
};

const NotificationPanel = ({
  notifications,
  onMarkAllRead,
  isLoading,
  filter,
  setFilter,
  userPreferences
}: NotificationPanelProps) => {
  const navigate = useNavigate();

  const filteredNotifications = notifications.filter(n => {
    if (filter !== 'all' && n.type !== filter) return false;
    if (!userPreferences[n.type as keyof typeof userPreferences]) return false;
    return true;
  });

  const hasUnread = filteredNotifications.some(n => !n.is_read);

  const handleDigestClick = (digestId: bigint) => {
    navigate(`/explore?digest=${digestId}`);
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
        {['all', 'artwork', 'artist', 'catalogue', 'digest'].map(f => (
          <button
            key={f}
            className={`button ${filter === f ? 'button-primary' : ''}`}
            onClick={() => setFilter(f as 'all' | 'artwork' | 'artist' | 'catalogue' | 'digest')}
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
            {n.type === 'digest' && n.digest_id ? (
              <button
                className="notification-link"
                onClick={() => handleDigestClick(n.digest_id!)}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0 }}
              >
                <div className="notification-content">
                  <div className="notification-icon">{getNotificationIcon(n.type)}</div>
                  <div className="notification-body">
                    <p className={`notification-message ${!n.is_read ? 'unread' : ''}`}>
                      {n.message}
                    </p>
                    <small className="notification-timestamp">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </small>
                  </div>
                </div>
              </button>
            ) : (
              <Link to={n.link_url || '#'} className="notification-link">
                <div className="notification-content">
                  <div className="notification-icon">{getNotificationIcon(n.type)}</div>
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
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationPanel;
