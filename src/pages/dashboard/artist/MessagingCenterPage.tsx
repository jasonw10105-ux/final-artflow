// src/pages/dashboard/artist/MessagingCenterPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { Search, Send, MessageSquarePlus } from 'lucide-react';

const MessageView = ({ conversation, user }: { conversation: any; user: any }) => {
    // ... (MessageView component remains largely the same, but now receives the whole conversation object)
    const [messages, setMessages] = useState<any[]>([]);
    const [reply, setReply] = useState('');

    const fetchMessages = useCallback(async () => {
        // ... (fetch logic is the same)
    }, [conversation.id]);
    
    useEffect(() => {
        fetchMessages();
        // ... (real-time subscription is the same)
    }, [conversation.id, fetchMessages]);

    const handleReply = async (e: React.FormEvent) => {
        // ... (reply logic is the same)
    };
    
    return (
        <div className="message-view-container">
            <header className="message-view-header">
                {/* Dribbble-inspired header */}
                <div className="avatar-placeholder">{conversation.inquirer_name.charAt(0)}</div>
                <div>
                    <h4>{conversation.inquirer_name}</h4>
                    <p>Regarding: {conversation.artwork?.title || 'General Inquiry'}</p>
                </div>
            </header>
            <div className="message-list">
                {messages.map(msg => (
                    <div key={msg.id} className={`message-bubble ${msg.sender_id === user.id ? 'sent' : 'received'}`}>
                        <p>{msg.content}</p>
                        <span className="message-timestamp">{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                ))}
            </div>
            <form onSubmit={handleReply} className="message-reply-form">
                <input className="input" value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your message..."/>
                <button type="submit" className="button-primary icon-button"><Send size={20} /></button>
            </form>
        </div>
    );
};

const MessagingEmptyState = () => (
    <div className="messaging-empty-state">
        <MessageSquarePlus size={64} color="var(--muted-foreground)" />
        <h2>Your inbox is empty</h2>
        <p>Start a new conversation with one of your existing contacts.</p>
        <button className="button-primary" onClick={() => alert("Modal for selecting a contact would open here.")}>
            Start a New Conversation
        </button>
    </div>
);

const MessagingCenterPage = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchConversations = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase.from('conversations')
            .select('*, artwork:artworks(title)')
            .eq('artist_id', user.id)
            .order('last_message_at', { ascending: false });
        setConversations(data || []);
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        fetchConversations();
        // ... (real-time subscription is the same)
    }, [user, fetchConversations]);

    const filteredConversations = useMemo(() => {
        return conversations.filter(c => 
            c.inquirer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.artwork?.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [conversations, searchTerm]);

    const activeConversation = useMemo(() => {
        return conversations.find(c => c.id === activeConvoId);
    }, [conversations, activeConvoId]);

    // Set the first conversation as active by default if none is selected
    useEffect(() => {
        if (!activeConvoId && filteredConversations.length > 0) {
            setActiveConvoId(filteredConversations[0].id);
        }
    }, [activeConvoId, filteredConversations]);
    
    if (isLoading) {
        return <div className="loading-fullscreen">Loading Messages...</div>;
    }

    if (conversations.length === 0) {
        return <MessagingEmptyState />;
    }

    return (
        <div className="messaging-container">
            <aside className="conversation-sidebar">
                <header className="sidebar-header">
                    <h1>Inbox</h1>
                    <div className="search-input-wrapper">
                        <Search size={18} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search messages..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>
                <div className="conversation-list">
                    {filteredConversations.map((convo) => (
                        <div key={convo.id} onClick={() => setActiveConvoId(convo.id)} 
                            className={`conversation-item ${convo.id === activeConvoId ? 'active' : ''}`}>
                             <div className="avatar-placeholder">{convo.inquirer_name.charAt(0)}</div>
                             <div className="convo-details">
                                <div className="convo-header">
                                    <span className="inquirer-name">{convo.inquirer_name}</span>
                                    <span className="convo-timestamp">{new Date(convo.last_message_at).toLocaleDateString()}</span>
                                </div>
                                <p className="convo-preview">Regarding: {convo.artwork.title}</p>
                             </div>
                             {convo.artist_unread && <div className="unread-dot"></div>}
                        </div>
                    ))}
                </div>
            </aside>
            <main className="message-view">
                {activeConversation ? (
                    <MessageView conversation={activeConversation} user={user} />
                ) : (
                    <div className="messaging-empty-state"><h3>Select a conversation</h3></div>
                )}
            </main>
        </div>
    );
};
export default MessagingCenterPage;