import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';

interface InquiryModalProps {
  artworkId: string;
  onClose: () => void;
}

const InquiryModal = ({ artworkId, onClose }: InquiryModalProps) => {
    const { session } = useAuth();
    const isLoggedIn = !!session;
    const [message, setMessage] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [shareDetails, setShareDetails] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (session) {
            setName(session.user.user_metadata.full_name || '');
            setEmail(session.user.email || '');
        }
    }, [session]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const body = { artworkId, message, name, email, contactNumber, shareDetails };
        const headers: { [key: string]: string } = { 'Content-Type': 'application/json' };
        if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

        const { data, error } = await supabase.functions.invoke('create-inquiry', { body, headers });
        if (error) alert(`Error: ${error.message}`);
        else {
            alert(data.message);
            onClose();
        }
        setSubmitting(false);
    };
    
    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>Inquire about this Artwork</h3>
                <form onSubmit={handleSubmit}>
                    {!isLoggedIn && (
                        <>
                            <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" required/>
                            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your Email" required/>
                            <input className="input" type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="Contact Number" required/>
                        </>
                    )}
                    <textarea className="input" value={message} onChange={e => setMessage(e.target.value)} placeholder="Your Message" required></textarea>
                    <div>
                        <input type="checkbox" id="share-details" checked={shareDetails} onChange={e => setShareDetails(e.target.checked)} />
                        <label htmlFor="share-details" style={{display: 'inline-block', marginLeft: '0.5rem'}}>Share my contact details with the artist.</label>
                    </div>
                    <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                      <button type="submit" className="button button-primary" disabled={submitting}>{submitting ? 'Sending...' : 'Send Inquiry'}</button>
                      <button type="button" className="button-secondary" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default InquiryModal;