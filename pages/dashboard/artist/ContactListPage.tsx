// src/pages/dashboard/artist/ContactListPage.tsx

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { PlusCircle } from 'lucide-react';

const fetchContacts = async (userId: string) => {
    const { data, error } = await supabase.from('contacts').select('*').eq('user_id', userId).order('full_name');
    if (error) throw new Error(error.message);
    return data;
};

const ContactListPage = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    
    // FIXED: Switched to the object syntax for useQuery
    const { data: contacts, isLoading } = useQuery({
        queryKey: ['contacts', user?.id],
        queryFn: () => fetchContacts(user!.id),
        enabled: !!user
    });
    
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');

    // FIXED: Switched to the object syntax for useMutation
    const addContactMutation = useMutation({
        mutationFn: async ({ name, email }: { name: string, email: string }) => {
            const { data, error } = await supabase.from('contacts').insert({
                user_id: user!.id,
                full_name: name,
                email: email,
            });
            if (error) throw new Error(error.message);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            setShowAddForm(false);
            setNewName('');
            setNewEmail('');
        },
        onError: (error: any) => {
            alert(`Failed to add contact: ${error.message}`);
        }
    });

    const handleAddContact = (e: React.FormEvent) => {
        e.preventDefault();
        addContactMutation.mutate({ name: newName, email: newEmail });
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Contacts</h1>
                <button onClick={() => setShowAddForm(true)} className="button button-primary" style={{ display: 'flex', gap: '0.5rem' }}>
                    <PlusCircle size={16} /> Add Contact
                </button>
            </div>
            
            {showAddForm && (
                <div style={{ background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem' }}>
                    <form onSubmit={handleAddContact}>
                        <h3>New Contact</h3>
                        <input className="input" placeholder="Full Name" value={newName} onChange={e => setNewName(e.target.value)} required />
                        <input className="input" type="email" placeholder="Email Address" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                        <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                            <button type="submit" className="button button-primary" disabled={addContactMutation.isPending}>Save Contact</button>
                            <button type="button" className="button-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {isLoading ? <p>Loading contacts...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {contacts?.map(contact => (
                        <div key={contact.id} style={{ background: 'var(--card)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                            <p>{contact.full_name}</p>
                            <small style={{ color: 'var(--muted-foreground)' }}>{contact.email}</small>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
export default ContactListPage;