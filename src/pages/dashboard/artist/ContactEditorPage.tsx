// src/pages/dashboard/artist/ContactEditorPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import TagManager, { Tag } from '../../../components/dashboard/TagManager';

// Fetch a single contact with its associated tags
const fetchContact = async (contactId: string, userId: string) => {
    const { data, error } = await supabase
        .from('contacts')
        .select('*, tags(*)') // Use Supabase join to get tags
        .eq('id', contactId)
        .eq('user_id', userId)
        .single();
    if (error) throw new Error(error.message);
    return data;
};

// Fetch all tags created by the artist
const fetchAllTags = async (userId: string) => {
    const { data, error } = await supabase
      .from('tags')
      .select('id, name')
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return data;
}

const ContactEditorPage = () => {
    const { contactId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
    
    const isEditMode = Boolean(contactId);

    // Query for the contact being edited
    const { data: existingContact, isLoading: isLoadingContact } = useQuery({
        queryKey: ['contact', contactId],
        queryFn: () => fetchContact(contactId!, user!.id),
        enabled: isEditMode && !!user,
    });

    // Query for all tags available to the artist
    const { data: allTags, isLoading: isLoadingTags } = useQuery({
        queryKey: ['tags', user?.id],
        queryFn: () => fetchAllTags(user!.id),
        enabled: !!user
    });

    useEffect(() => {
        if (existingContact) {
            setFullName(existingContact.full_name);
            setEmail(existingContact.email);
            setPhoneNumber(existingContact.phone_number || '');
            setAddress(existingContact.address || '');
            setNotes(existingContact.notes || '');
            setSelectedTags(existingContact.tags || []);
        }
    }, [existingContact]);

    // Mutation to save contact and handle tag relationships
    const mutation = useMutation({
        mutationFn: async ({ contactData, tags }: { contactData: any, tags: Tag[] }) => {
            let savedContactId = contactId;
            // 1. Upsert the contact
            if (isEditMode) {
                const { error } = await supabase.from('contacts').update(contactData).eq('id', contactId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('contacts').insert(contactData).select('id').single();
                if (error) throw error;
                savedContactId = data.id;
            }

            // 2. Handle Tag relationships
            const originalTagIds = existingContact?.tags.map((t: Tag) => t.id) || [];
            const newTagIds = tags.map(t => t.id);

            const tagsToAdd = newTagIds.filter(id => !originalTagIds.includes(id));
            const tagsToRemove = originalTagIds.filter(id => !newTagIds.includes(id));

            if (tagsToRemove.length > 0) {
              const { error } = await supabase.from('contact_tags').delete().eq('contact_id', savedContactId).in('tag_id', tagsToRemove);
              if (error) throw new Error(`Failed to remove tags: ${error.message}`);
            }
            if (tagsToAdd.length > 0) {
              const linksToInsert = tagsToAdd.map(tagId => ({ contact_id: savedContactId, tag_id: tagId }));
              const { error } = await supabase.from('contact_tags').insert(linksToInsert);
              if (error) throw new Error(`Failed to add tags: ${error.message}`);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
            navigate('/artist/contacts');
        },
        onError: (error: Error) => {
            alert(`Error saving contact: ${error.message}`);
        }
    });

    const handleCreateTag = async (tagName: string): Promise<Tag | null> => {
        const { data, error } = await supabase
          .from('tags')
          .insert({ name: tagName, user_id: user!.id })
          .select('id, name')
          .single();

        if (error) {
          alert(`Could not create tag: ${error.message}`);
          return null;
        }
        queryClient.invalidateQueries({ queryKey: ['tags', user?.id] }); // refresh all tags list
        return data;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName || !email) {
            alert('Full Name and Email are required.');
            return;
        }
        const contactData = {
            user_id: user!.id,
            full_name: fullName,
            email: email,
            phone_number: phoneNumber,
            address: address,
            notes: notes,
            updated_at: new Date()
        };
        mutation.mutate({ contactData, tags: selectedTags });
    };

    if (isLoadingContact || isLoadingTags) return <p>Loading...</p>;

    return (
        <div>
            <h1>{isEditMode ? 'Edit Contact' : 'Create New Contact'}</h1>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px', marginTop: '2rem' }}>
                <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required />
                <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="tel" placeholder="Phone Number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                <textarea placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
                <textarea placeholder="General notes about this contact..." value={notes} onChange={e => setNotes(e.target.value)} rows={5} />
                
                <TagManager 
                  allTags={allTags || []}
                  selectedTags={selectedTags}
                  onSelectedTagsChange={setSelectedTags}
                  onTagCreate={handleCreateTag}
                />

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="button" onClick={() => navigate('/artist/contacts')} className="button-secondary">Cancel</button>
                    <button type="submit" className="button-primary" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Saving...' : 'Save Contact'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ContactEditorPage;