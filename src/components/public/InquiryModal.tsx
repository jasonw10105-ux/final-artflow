import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';

interface InquiryModalProps {
  artworkId: string;
  onClose: () => void;
}

const InquiryModal = ({ artworkId, onClose }: InquiryModalProps) => {
    const { session, profile } = useAuth();
    const isLoggedIn = !!session;
    const [message, setMessage] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Pre-fill form if the user is logged in
    useEffect(() => {
        if (isLoggedIn && profile) {
            setName(profile.full_name || '');
            setEmail(session.user?.email || '');
        }
    }, [session, profile, isLoggedIn]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Using a Supabase Edge Function is the best practice here.
            // The function would handle creating the conversation and sending a notification.
            const { error } = await supabase.functions.invoke('create-inquiry', {
                body: { 
                    artworkId, 
                    message, 
                    inquirerName: name, 
                    inquirerEmail: email 
                },
            });

            if (error) throw error;

            alert('Your inquiry has been sent successfully!');
            onClose();

        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };
    
    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>Inquire about this Artwork</h3>
                <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem'}}>
                    {!isLoggedIn && (
                        <>
                            <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" required />
                            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your Email" required />
                        </>
                    )}
                    <textarea className="input" value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message to the artist here..." required rows={5}></textarea>
                    
                    <div style={{display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end'}}>
                      <button type="button" className="button-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                      <button type="submit" className="button button-primary" disabled={submitting}>
                        {submitting ? 'Sending...' : 'Send Inquiry'}
                      </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InquiryModal;