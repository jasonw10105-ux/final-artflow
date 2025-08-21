// src/pages/dashboard/artist/ContactListPage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { PlusCircle, Upload } from 'lucide-react';

// Fetches all contacts for the current artist
const fetchContacts = async (userId: string) => {
    const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, email')
        .eq('user_id', userId)
        .order('full_name', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
};

const ContactListPage = () => {
    const { user } = useAuth();

    const { data: contacts, isLoading } = useQuery({
        queryKey: ['contacts', user?.id],
        queryFn: () => fetchContacts(user!.id),
        enabled: !!user,
    });

    // TODO: Implement CSV import functionality
    const handleImportCSV = () => {
        alert('CSV Import functionality to be implemented.');
    };

    if (isLoading) return <p>Loading contacts...</p>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Contacts</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handleImportCSV} className="button button-secondary" style={{ display: 'flex', gap: '0.5rem' }}>
                        <Upload size={16} /> Import CSV
                    </button>
                    <Link to="/artist/contacts/new" className="button button-primary" style={{ display: 'flex', gap: '0.5rem' }}>
                        <PlusCircle size={16} /> New Contact
                    </Link>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {contacts && contacts.length > 0 ? (
                    contacts.map(contact => (
                        <div key={contact.id} style={{ background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.5rem' }}>{contact.full_name}</h3>
                                <p style={{ color: 'var(--muted-foreground)' }}>{contact.email}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <Link to={`/artist/contacts/${contact.id}`} className="button-secondary">View Details</Link>
                                <Link to={`/artist/contacts/edit/${contact.id}`} className="button-secondary">Edit</Link>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '3rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
                        <p>You haven't added any contacts yet.</p>
                        <p style={{ marginTop: '1rem' }}>Click "New Contact" or "Import CSV" to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactListPage;