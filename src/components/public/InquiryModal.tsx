// src/components/public/InquiryModal.tsx
// This file was not provided, but inferred from usage.
// Assuming it needs isOpen, onClose, artwork, and artist props.

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Adjust path if necessary
import { useAuth } from '@/contexts/AuthProvider';
import toast from 'react-hot-toast';
import { MessageSquare, XCircle } from 'lucide-react';
import { AppArtwork, AppProfile } from '@/types/app.types'; // Import types

interface InquiryModalProps {
  isOpen: boolean; // Correctly added isOpen
  onClose: () => void;
  artwork: AppArtwork; // Pass the full artwork object
  artist: AppProfile; // Pass the full artist profile object
}

const InquiryModal: React.FC<InquiryModalProps> = ({ isOpen, onClose, artwork, artist }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [name, setName] = useState(user?.user_metadata?.full_name || user?.email || ''); // Pre-fill with user info if logged in
  const [email, setEmail] = useState(user?.email || ''); // Pre-fill with user info if logged in
  const [isSending, setIsSending] = useState(false);

  // Update name/email if user changes or logs in/out
  React.useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || user.email || '');
      setEmail(user.email || '');
    } else {
      setName('');
      setEmail('');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !name.trim() || !email.trim()) {
      toast.error('Please fill out all required fields.');
      return;
    }
    // Double check if not logged in
    if (!user) {
        toast.error('You must be logged in to send an inquiry.');
        return;
    }

    setIsSending(true);
    try {
      // Ensure the artist.id is present
      if (!artist?.id) {
          throw new Error("Artist information is missing for this artwork.");
      }

      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          artist_id: artist.id,
          collector_id: user.id, // The logged-in user is the collector
          artwork_id: artwork.id,
          inquirer_name: name,
          inquirer_id: user.id, // Store inquirer's user ID for blocking etc.
          artist_unread: true, 
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (conversationError) throw conversationError;

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationData.id,
          sender_id: user.id,
          content: message,
        });

      if (messageError) throw messageError;

      toast.success('Your inquiry has been sent successfully! The artist has been notified.');
      onClose();

    } catch (error: any) {
        console.error('Inquiry submission error:', error);
        toast.error(`Failed to send inquiry: ${error.message || 'An unknown error occurred.'}`);
    } finally {
        setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}> {/* Close modal when clicking backdrop */}
      <div className="modal-content inquiry-modal-content" onClick={e => e.stopPropagation()}> {/* Prevent closing when clicking inside */}
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h3>Inquire about "{artwork.title || 'Untitled'}"</h3>
            <button type="button" onClick={onClose} className="button-icon"><XCircle size={20} /></button>
          </div>
          <div className="modal-body space-y-4">
            <div className="flex items-center gap-4 border-b border-border pb-4 mb-4">
              <img src={artwork.artwork_images?.[0]?.image_url || 'https://placehold.co/80x80?text=Artwork'} alt={artwork.title || 'Artwork'} className="w-20 h-20 object-cover rounded" />
              <div>
                <p className="font-semibold">{artwork.title}</p>
                <p className="text-sm text-muted-foreground">by {artist.full_name}</p>
                {artwork.price && <p className="font-bold text-sm">{new Intl.NumberFormat('en-US', { style: 'currency', currency: artwork.currency || 'USD' }).format(artwork.price)}</p>}
              </div>
            </div>

            {!user && (
                <div className="text-sm p-3 bg-secondary rounded-md">
                    <p className="font-semibold text-primary-foreground">You are not logged in.</p>
                    <p className="text-muted-foreground">Please provide your details to send this inquiry.</p>
                </div>
            )}
            
            <div className="form-group">
              <label htmlFor="inquirer-name" className="label">Your Name</label>
              <input 
                id="inquirer-name"
                className="input" 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Your Name" 
                required 
                disabled={!!user} // Disable if logged in, as we use profile name
              />
            </div>
            <div className="form-group">
              <label htmlFor="inquirer-email" className="label">Your Email</label>
              <input 
                id="inquirer-email"
                className="input" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="Your Email" 
                required 
                disabled={!!user} // Disable if logged in, as we use profile email
              />
            </div>

            <div className="form-group">
              <label htmlFor="inquiry-message" className="label">Your Message</label>
              <textarea
                id="inquiry-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="textarea min-h-[120px]"
                placeholder={`I'm interested in "${artwork.title}". Could you please tell me more about it?`}
                required
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="button button-secondary" onClick={onClose} disabled={isSending}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={isSending || !message.trim() || !name.trim() || !email.trim()}>
              {isSending ? 'Sending...' : 'Send Inquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InquiryModal;