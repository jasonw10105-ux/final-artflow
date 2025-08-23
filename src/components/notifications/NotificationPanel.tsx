// src/components/notifications/NotificationPanel.tsx

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
    const panelStyle: React.CSSProperties = {
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: '380px',
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
        zIndex: 1010,
        maxHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--border)',
    };

    const listStyle: React.CSSProperties = {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        overflowY: 'auto',
    };

    const hasUnread = notifications.some(n => !n.is_read);

    return (
        <div style={panelStyle}>
            <div style={headerStyle}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Notifications</h4>
                {hasUnread && (
                    <button className="button-link" onClick={onMarkAllRead}>
                        Mark all as read
                    </button>
                )}
            </div>
            <ul style={listStyle}>
                {isLoading && <li style={{ padding: '2rem', textAlign: 'center' }}>Loading...</li>}
                {!isLoading && notifications.length === 0 && (
                    <li style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>You're all caught up!</li>
                )}
                {!isLoading && notifications.map(n => (
                    <li key={n.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <Link to={n.link_url || '#'} style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <div>{getNotificationIcon(n.type)}</div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, lineHeight: 1.4, fontWeight: n.is_read ? 400 : 600 }}>
                                        {n.message}
                                    </p>
                                    <small style={{ color: 'var(--muted-foreground)' }}>
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