import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import '@/styles/app.css';

interface InquiryModalProps {
  artworkId: string;
  onClose: () => void;
  previewImageUrl?: string;
  previewTitle?: string;
}

const InquiryModal = ({ artworkId, onClose, previewImageUrl, previewTitle }: InquiryModalProps) => {
    const { session, profile } = useAuth();
    const isLoggedIn = !!session;
    const [message, setMessage] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isLoggedIn && profile) {
            setName(profile.full_name || '');
            setEmail(session.user?.email || '');
        }
    }, [session, profile, isLoggedIn]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !name.trim() || !email.trim()) {
            alert('Please fill out all fields.');
            return;
        }
        setIsSubmitting(true);

        try {
            const { error } = await supabase.functions.invoke('create-inquiry', {
                body: { 
                    artworkId, 
                    message, 
                    inquirerName: name, 
                    inquirerEmail: email 
                },
            });

            if (error) throw error;

            alert('Your inquiry has been sent successfully! The artist has been notified.');
            onClose();

        } catch (error: any) {
            console.error('Inquiry submission error:', error);
            alert(`Error sending inquiry: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="modal-backdrop">
            <div className="modal-content inquiry-modal-content">
                {previewImageUrl && previewTitle && (
                    <div className="modal-preview-banner">
                        <img src={previewImageUrl} alt={previewTitle} className="modal-preview-image" />
                        <div className="modal-preview-info">
                            <h4>Inquire about {previewTitle} by </h4>
                            <p className="modal-subtitle">Your message will be sent directly to the artist.</p>
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="modal-form">
                    {!isLoggedIn && (
                        <>
                            <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" required />
                            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your Email" required />
                        </>
                    )}
                    <textarea 
                        className="input" 
                        value={message} 
                        onChange={e => setMessage(e.target.value)} 
                        placeholder="Type your message to the artist here..." 
                        required 
                        rows={5}
                    ></textarea>
                    
                    <div className="modal-actions">
                      <button type="button" className="button button-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                      <button type="submit" className="button button-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Sending...' : 'Send Inquiry'}
                      </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InquiryModal;