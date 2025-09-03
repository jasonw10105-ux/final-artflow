import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Send, MessageSquarePlus, MoreVertical, DollarSign, Zap, Shield, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// --- TYPES ---
interface ArtworkImage {
  image_url: string;
  position: number;
}

interface Artwork {
  id: string;
  title: string;
  slug: string;
  price: number;
  artist: { slug: string };
  artwork_images: ArtworkImage[]; // CHANGED: image_url is now part of an array of ArtworkImage
}
interface Conversation {
  id: string;
  inquirer_name: string;
  inquirer_id: string; // Crucial for blocking
  last_message_at: string;
  artist_unread: boolean;
  is_blocked: boolean;
  artwork: Artwork;
}
interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

// Helper function to get the primary image URL
const getPrimaryImageUrl = (artwork: Artwork | null | undefined): string | undefined => {
  if (!artwork || !artwork.artwork_images || artwork.artwork_images.length === 0) {
    return undefined;
  }
  // Sort by position (assuming lower position means primary) and take the first one
  const primaryImage = artwork.artwork_images.sort((a, b) => a.position - b.position)[0];
  return primaryImage?.image_url;
};

// --- MODAL COMPONENT for Blocking ---
const BlockContactModal = ({ onBlock, onClose, inquirerName }: { onBlock: (reason: string) => void; onClose: () => void; inquirerName: string }) => {
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onBlock(reason);
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h3>Block {inquirerName}?</h3>
                        <button type="button" onClick={onClose} className="button-icon"><X size={20} /></button>
                    </div>
                    <p>Blocked contacts will not be able to send you new messages. Please provide a reason for this action (for internal records).</p>
                    <textarea
                        className="input"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g., Spam, harassment, etc."
                        required
                    />
                    <div className="modal-footer">
                        <button type="button" className="button-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="button-danger">Block Contact</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- MESSAGE VIEW COMPONENT ---
const MessageView = ({ conversation, user }: { conversation: Conversation; user: any }) => {
    const queryClient = useQueryClient();
    const [messages, setMessages] = useState<Message[]>([]);
    const [reply, setReply] = useState('');
    const [showBlockModal, setShowBlockModal] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get the primary image URL for the current artwork
    const primaryArtworkImageUrl = useMemo(() => getPrimaryImageUrl(conversation.artwork), [conversation.artwork]);

    const automatedReplies = [
        { title: 'Availability Inquiry', text: `Hello! Thank you for your interest. Yes, "${conversation.artwork?.title || 'this piece'}" is still available for purchase.` },
        { title: 'Shipping Question', text: 'Regarding shipping, I typically ship artworks within 3-5 business days. All pieces are professionally packaged and insured. Do you have a specific location you\'d like me to get a quote for?' },
        { title: 'Thank You', text: 'Thank you for your inquiry! I will get back to you shortly.' }
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = useCallback(async () => {
        const { data } = await supabase.from('messages').select('*').eq('conversation_id', conversation.id).order('created_at');
        setMessages(data || []);
    }, [conversation.id]);

    // Mutation to mark a conversation as read
    const markAsReadMutation = useMutation({
        mutationFn: async (convoId: string) => {
            const { error } = await supabase.from('conversations').update({ artist_unread: false }).eq('id', convoId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
        onError: (err: any) => {
            console.error("Failed to mark as read:", err.message);
        },
    });

    useEffect(() => {
        fetchMessages();
        // Mark conversation as read when it's opened
        if (conversation.artist_unread) {
            markAsReadMutation.mutate(conversation.id);
        }

        const subscription = supabase.channel(`messages:${conversation.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` }, (payload) => {
                setMessages(current => [...current, payload.new as Message]);
                // Ensure to mark as unread for the artist if a new message comes from inquirer
                if (payload.new.sender_id !== user.id && !conversation.is_blocked) {
                    supabase.from('conversations').update({ artist_unread: true, last_message_at: new Date().toISOString() }).eq('id', conversation.id).then(({ error }) => {
                        if (error) console.error("Failed to update unread status on new message:", error);
                        queryClient.invalidateQueries({ queryKey: ['conversations'] });
                    });
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(subscription); };
    }, [conversation.id, fetchMessages, conversation.artist_unread, user.id, queryClient, markAsReadMutation, conversation.is_blocked]);

    useEffect(scrollToBottom, [messages]);

    const replyMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!content.trim()) return;
            const { error } = await supabase.from('messages').insert({ conversation_id: conversation.id, sender_id: user.id, content });
            if (error) throw error;
        },
        onSuccess: () => {
            setReply('');
            // Also update last_message_at and artist_unread status for the conversation
            supabase.from('conversations').update({ last_message_at: new Date().toISOString(), artist_unread: false }).eq('id', conversation.id).then(({ error }) => {
                if (error) console.error("Failed to update conversation timestamp:", error);
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
            });
        },
        onError: (err: any) => toast.error(`Error sending message: ${err.message}`),
    });

    const blockMutation = useMutation({
        mutationFn: async (reason: string) => {
            const { error } = await supabase.rpc('block_conversation', { p_conversation_id: conversation.id, p_artist_id: user.id, p_inquirer_id: conversation.inquirer_id, p_reason: reason });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success(`${conversation.inquirer_name} has been blocked.`);
            setShowBlockModal(false);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            // Potentially navigate away if this was the only active conversation
        },
        onError: (err: any) => toast.error(`Error blocking contact: ${err.message}`),
    });

    const unblockMutation = useMutation({
        mutationFn: async () => {
            // Assuming you have an RPC or endpoint to unblock
            // This would likely be another RPC, e.g., 'unblock_conversation'
            const { error } = await supabase.rpc('unblock_conversation', { p_conversation_id: conversation.id, p_artist_id: user.id });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success(`${conversation.inquirer_name} has been unblocked.`);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
        onError: (err: any) => toast.error(`Error unblocking contact: ${err.message}`),
    });


    const handleReply = (e: React.FormEvent) => {
        e.preventDefault();
        replyMutation.mutate(reply);
    };

    const handleCreatePaymentLink = () => {
        const price = conversation.artwork?.price;
        if (!price) {
            toast('This artwork doesn\'t have a price set. Please add a price before creating a payment link.', { icon: '⚠️' });
            return;
        }
        console.log("Simulating payment link generation. API call to backend would go here.");
        const artworkTitle = conversation.artwork.title;
        const paymentMessage = `Here is the secure link to complete your purchase for "${artworkTitle}" priced at $${price.toLocaleString()}:\n\n[Your Secure Payment Link Here]\n\nThis link will expire in 24 hours. Please let me know if you have any questions!`;
        setReply(paymentMessage);
    };

    return (
        <div className="message-view-container">
            {showBlockModal && <BlockContactModal inquirerName={conversation.inquirer_name} onClose={() => setShowBlockModal(false)} onBlock={(reason) => blockMutation.mutate(reason)} />}

            <header className="message-view-header">
                <div className="avatar-placeholder">{conversation.inquirer_name.charAt(0)}</div>
                <div>
                    <h4>{conversation.inquirer_name}</h4>
                    {conversation.artwork && <p>Inquiry about <Link to={`/${conversation.artwork.artist.slug}/artwork/${conversation.artwork.slug}`} target="_blank" className="text-link">{conversation.artwork.title}</Link></p>}
                </div>
                <div className="message-header-actions">
                    <div className="dropdown">
                        <button className="button-icon"><MoreVertical size={20} /></button>
                        <div className="dropdown-content">
                            <a href="#">View Collector Profile</a>
                            {conversation.is_blocked ? (
                                <a href="#" onClick={() => unblockMutation.mutate()}>Unblock Contact</a>
                            ) : (
                                <a href="#" onClick={() => setShowBlockModal(true)}>Block Contact</a>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {conversation.artwork && (
                <div className="artwork-context-banner">
                    {primaryArtworkImageUrl && <img src={primaryArtworkImageUrl} alt={conversation.artwork.title} />} {/* CHANGED */}
                    <div>
                        <strong>{conversation.artwork.title}</strong>
                        <span>{conversation.artwork.price ? `$${conversation.artwork.price.toLocaleString()}` : 'Price on request'}</span>
                    </div>
                    <Link to={`/${conversation.artwork.artist.slug}/artwork/${conversation.artwork.slug}`} target="_blank" className="button-secondary">View Artwork</Link>
                </div>
            )}

            <div className="message-list">
                {messages.map(msg => (
                    <div key={msg.id} className={`message-bubble ${msg.sender_id === user.id ? 'sent' : 'received'}`}>
                        <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                        <span className="message-timestamp">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {conversation.is_blocked ? (
                <div className="blocked-contact-indicator">
                    <Shield size={16} /> You have blocked this contact.
                    <button className="button-link ml-2" onClick={() => unblockMutation.mutate()}>Unblock</button>
                </div>
            ) : (
                <form onSubmit={handleReply} className="message-reply-form">
                    <div className="message-actions">
                        <div className="dropdown dropdown-top">
                           <button type="button" className="button-icon" title="Automated Replies"><Zap size={20} /></button>
                            <div className="dropdown-content">
                                {automatedReplies.map(reply => <a key={reply.title} onClick={() => setReply(reply.text)}>{reply.title}</a>)}
                            </div>
                        </div>
                        <button type="button" className="button-icon" title="Create Payment Link" onClick={handleCreatePaymentLink}>
                            <DollarSign size={20} />
                        </button>
                    </div>
                    <textarea className="input" value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your message..."/>
                    <button type="submit" className="button-primary icon-button" disabled={replyMutation.isPending || !reply.trim()}>
                        <Send size={20} />
                    </button>
                </form>
            )}
        </div>
    );
};


const MessagingEmptyState = () => (
    <div className="messaging-empty-state">
        <MessageSquarePlus size={64} color="var(--muted-foreground)" />
        <h2>Your inbox is empty</h2>
        <p>When a collector inquires about your art, the conversation will appear here.</p>
    </div>
);


const MessagingCenterPage = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const queryClient = useQueryClient();

    const fetchConversations = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        const { data, error } = await supabase.from('conversations')
            .select('*, artwork:artworks(id, title, slug, price, artist:profiles(slug), artwork_images(image_url, position))') // CHANGED: Selecting artwork_images
            .eq('artist_id', user.id)
            .order('last_message_at', { ascending: false });

        if (error) {
            console.error("Error fetching convos:", error);
            toast.error(`Error loading conversations: ${error.message}`);
            setConversations([]);
        } else {
            setConversations(data as Conversation[] || []);
        }
        setIsLoading(false);
    }, [user, queryClient]);

    useEffect(() => {
        fetchConversations();
        const subscription = supabase.channel('conversations')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `artist_id=eq.${user?.id}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['conversations'] }); // Invalidate on change to refetch
            })
            .subscribe();
        return () => { supabase.removeChannel(subscription); };
    }, [user, fetchConversations, queryClient]); // Added queryClient to dependencies

    const filteredConversations = useMemo(() => {
        return conversations.filter(c =>
            !c.is_blocked &&
            (c.inquirer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.artwork?.title.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [conversations, searchTerm]);

    const activeConversation = useMemo(() => {
        return conversations.find(c => c.id === activeConvoId);
    }, [conversations, activeConvoId]);

    useEffect(() => {
        if (!activeConvoId && filteredConversations.length > 0) {
            setActiveConvoId(filteredConversations[0].id);
        } else if (filteredConversations.length === 0) {
            setActiveConvoId(null);
        }
        if (activeConvoId && !filteredConversations.some(c => c.id === activeConvoId)) {
            if (filteredConversations.length > 0) {
                setActiveConvoId(filteredConversations[0].id);
            } else {
                setActiveConvoId(null);
            }
        }
    }, [activeConvoId, filteredConversations, conversations]);

    if (isLoading) {
        return <div className="loading-fullscreen">Loading Messages...</div>;
    }

    return (
        <div className="messaging-container">
            <aside className="conversation-sidebar">
                <header className="sidebar-header">
                    <h1>Inbox</h1>
                    <div className="search-input-wrapper">
                        <Search size={18} className="search-icon" />
                        <input type="text" placeholder="Search by name or artwork..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </header>
                <div className="conversation-list">
                    {filteredConversations.length === 0 && searchTerm === '' ? (
                        <div className="empty-sidebar-message">
                            <MessageSquarePlus size={32} color="var(--muted)" />
                            <p>No active conversations.</p>
                        </div>
                    ) : filteredConversations.length === 0 && searchTerm !== '' ? (
                         <div className="empty-sidebar-message">
                            <Search size={32} color="var(--muted)" />
                            <p>No results found for "{searchTerm}".</p>
                        </div>
                    ) : (
                        filteredConversations.map((convo) => (
                            <div key={convo.id} onClick={() => setActiveConvoId(convo.id)} className={`conversation-item ${convo.id === activeConvoId ? 'active' : ''}`}>
                                <div className="avatar-placeholder">{convo.inquirer_name.charAt(0)}</div>
                                <div className="convo-details">
                                    <div className="convo-header">
                                        <span className="inquirer-name">{convo.inquirer_name}</span>
                                        <span className="convo-timestamp">{new Date(convo.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                    <p className="convo-preview">
                                        {getPrimaryImageUrl(convo.artwork) && <img src={getPrimaryImageUrl(convo.artwork)} className="convo-preview-img" alt=""/>} {/* CHANGED */}
                                        {convo.artwork?.title || 'General Inquiry'}
                                    </p>
                                </div>
                                {convo.artist_unread && <div className="unread-dot"></div>}
                            </div>
                        ))
                    )}
                </div>
            </aside>
            <main className="message-view">
                {activeConversation ? (
                    <MessageView conversation={activeConversation} user={user} />
                ) : (
                    <MessagingEmptyState />
                )}
            </main>
        </div>
    );
};

export default MessagingCenterPage;