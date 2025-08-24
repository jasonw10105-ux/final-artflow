import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Mail, DollarSign, Bell } from 'lucide-react';

// Define the shape of a notification object
interface Notification {
    id: bigint;
    created_at: string;
    type: string;
    message: string;
    link_url: string | null;
    is_read: boolean;
}

interface NotificationPanelProps {
    notifications: Notification[];
    onMarkAllRead: () => void;
    isLoading: boolean;
}

const getNotificationIcon = (type: string) => {
    switch (type) {
        case 'new_inquiry':
        case 'new_message':
            return <Mail size={20} className="text-blue-500" />;
        case 'new_sale':
            return <DollarSign size={20} className="text-green-500" />;
        default:
            return <Bell size={20} className="text-gray-500" />;
    }
};

const NotificationPanel = ({ notifications, onMarkAllRead, isLoading }: NotificationPanelProps) => {
    const hasUnread = notifications.some(n => !n.is_read);

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
            <ul className="notification-list">
                {isLoading && <li className="notification-list-message">Loading...</li>}
                {!isLoading && notifications.length === 0 && (
                    <li className="notification-list-message">You're all caught up!</li>
                )}
                {!isLoading && notifications.map(n => (
                    <li key={n.id} className="notification-list-item">
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
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default NotificationPanel;