import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { PlusCircle, Upload, Trash2, Tag, Mail, Phone, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppContact, TagRow } from '@/types/app.types';
import '@/styles/app.css'; // Import the centralized styles

// --- Data Fetching ---
const fetchContacts = async (userId: string): Promise<AppContact[]> => {
    // In a real app, this would be a more complex query joining contact_tags and tags
    const { data, error } = await supabase
        .from('contacts')
        .select(`
            id, full_name, email, phone_number, notes, purchase_intent_score,
            contact_tags(tag_id, tags(id, name))
        `)
        .eq('user_id', userId)
        .order('full_name', { ascending: true });

    if (error) {
      console.error("Error fetching contacts:", error);
      throw new Error(error.message);
    }

    return data.map(contact => ({
      ...contact,
      tags: contact.contact_tags?.map((ct: any) => ct.tags).filter(Boolean) || [],
    })) as AppContact[];
};

const fetchTags = async (userId: string): Promise<TagRow[]> => {
    const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
};

// --- CSV Import Modal Component ---
interface CsvImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: () => void;
    userId: string;
}

const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onImportSuccess, userId }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [importLog, setImportLog] = useState<string[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setImportLog([]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error("Please select a CSV file to upload.");
            return;
        }

        setIsLoading(true);
        setImportLog([]);
        const reader = new FileReader();

        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim() !== '');

            if (lines.length < 2) {
                toast.error("CSV file is empty or too short.");
                setIsLoading(false);
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const contactsToInsert = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length !== headers.length) {
                    setImportLog(prev => [...prev, `Skipping row ${i + 1}: Mismatched column count.`]);
                    continue;
                }

                const contact: Partial<AppContact> = { user_id: userId, full_name: '', email: '' }; // Initialize required fields
                headers.forEach((header, index) => {
                    if (header === 'full_name') contact.full_name = values[index];
                    else if (header === 'email') contact.email = values[index];
                    else if (header === 'phone_number') contact.phone_number = values[index];
                    else if (header === 'notes') contact.notes = values[index];
                    // Add more mappings as needed (e.g., address fields, tags)
                });

                if (contact.full_name && contact.email) {
                    contactsToInsert.push(contact);
                } else {
                    setImportLog(prev => [...prev, `Skipping row ${i + 1}: Missing full_name or email.`]);
                }
            }

            if (contactsToInsert.length === 0) {
                toast.error("No valid contacts found in the CSV for import.");
                setIsLoading(false);
                return;
            }

            try {
                // Check for existing contacts by email to prevent duplicates
                const existingEmails = new Set((await supabase.from('contacts').select('email').eq('user_id', userId)).data?.map(c => c.email) || []);
                const newContacts = contactsToInsert.filter(c => !existingEmails.has(c.email));
                const updatedContacts = contactsToInsert.filter(c => existingEmails.has(c.email));

                if (newContacts.length > 0) {
                    const { error } = await supabase.from('contacts').insert(newContacts as any[]);
                    if (error) throw error;
                    setImportLog(prev => [...prev, `Successfully imported ${newContacts.length} new contacts.`]);
                }

                if (updatedContacts.length > 0) {
                    // For simplicity, we'll skip updating existing. A real solution would upsert or merge.
                    setImportLog(prev => [...prev, `Skipped ${updatedContacts.length} existing contacts with matching emails.`]);
                }

                toast.success(`CSV Import Complete: ${newContacts.length} new contacts added!`);
                onImportSuccess();
                onClose();
            } catch (error: any) {
                setImportLog(prev => [...prev, `Error during Supabase insert: ${error.message}`]);
                toast.error(`Import failed: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        reader.readAsText(file);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content csv-import-modal-content">
                <div className="modal-header">
                    <h3>Import Contacts from CSV</h3>
                    <button type="button" onClick={onClose} className="button-icon-secondary"><XCircle size={20} /></button>
                </div>
                <div className="modal-body">
                    <p className="text-muted-foreground mb-4">Upload a CSV file containing your contact list. Supported headers: <code className="code-snippet">full_name</code>, <code className="code-snippet">email</code>, <code className="code-snippet">phone_number</code>, <code className="code-snippet">notes</code>.</p>
                    <div className="form-group mb-4">
                        <label htmlFor="csv-file" className="label">Select CSV File</label>
                        <input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} className="input-file" />
                    </div>
                    {file && <p className="mb-2">Selected file: <strong>{file.name}</strong></p>}
                    <button onClick={handleUpload} className="button button-primary w-full" disabled={!file || isLoading}>
                        {isLoading ? 'Importing...' : 'Upload and Import'}
                    </button>
                    {importLog.length > 0 && (
                        <div className="import-log-box">
                            <h4>Import Log:</h4>
                            {importLog.map((log, index) => (
                                <p key={index} className="text-sm">{log}</p>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Bulk Tagging Modal Component ---
interface BulkTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedContactIds: string[];
    onApplyTags: (tagIds: string[], action: 'add' | 'remove') => void;
    userId: string;
}

const BulkTagModal: React.FC<BulkTagModalProps> = ({ isOpen, onClose, selectedContactIds, onApplyTags, userId }) => {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [action, setAction] = useState<'add' | 'remove'>('add');
    const [newTagName, setNewTagName] = useState('');

    const queryClient = useQueryClient();
    const { data: availableTags, isLoading: isLoadingTags } = useQuery<TagRow[], Error>({
        queryKey: ['tags', userId],
        queryFn: () => fetchTags(userId),
        enabled: !!userId,
    });

    const createTagMutation = useMutation({
        mutationFn: async (name: string) => {
            const { data, error } = await supabase.from('tags').insert({ name, user_id: userId }).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (newTag) => {
            queryClient.invalidateQueries({ queryKey: ['tags', userId] });
            setSelectedTags(prev => [...prev, newTag.id]);
            setNewTagName('');
            toast.success(`Tag '${newTag.name}' created!`);
        },
        onError: (err: any) => {
            toast.error(`Failed to create tag: ${err.message}`);
        },
    });

    const handleTagToggle = (tagId: string) => {
        setSelectedTags(prev =>
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
    };

    const handleSubmit = () => {
        if (selectedTags.length === 0) {
            toast.error("Please select at least one tag.");
            return;
        }
        onApplyTags(selectedTags, action);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content bulk-tag-modal-content">
                <div className="modal-header">
                    <h3>Bulk Tag Contacts ({selectedContactIds.length})</h3>
                    <button type="button" onClick={onClose} className="button-icon-secondary"><XCircle size={20} /></button>
                </div>
                <div className="modal-body">
                    <p className="text-muted-foreground mb-4">Apply tags to selected contacts.</p>

                    <div className="form-group mb-4">
                        <label className="label">Action</label>
                        <div className="radio-group">
                            <label className="radio-label">
                                <input type="radio" name="tagAction" value="add" checked={action === 'add'} onChange={() => setAction('add')} className="radio" />
                                Add Tags
                            </label>
                            <label className="radio-label">
                                <input type="radio" name="tagAction" value="remove" checked={action === 'remove'} onChange={() => setAction('remove')} className="radio" />
                                Remove Tags
                            </label>
                        </div>
                    </div>

                    <div className="form-group mb-4">
                        <label className="label">Available Tags</label>
                        {isLoadingTags ? (
                            <p className="loading-message">Loading tags...</p>
                        ) : availableTags && availableTags.length > 0 ? (
                            <div className="tag-checkbox-list responsive-grid-col">
                                {availableTags.map(tag => (
                                    <div key={tag.id} className="checkbox-item tag-item">
                                        <input
                                            type="checkbox"
                                            id={`tag-${tag.id}`}
                                            checked={selectedTags.includes(tag.id)}
                                            onChange={() => handleTagToggle(tag.id)}
                                            className="checkbox"
                                        />
                                        <label htmlFor={`tag-${tag.id}`}>{tag.name}</label>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No tags defined yet.</p>
                        )}
                    </div>

                    <div className="form-group mb-4">
                        <label htmlFor="new-tag-name" className="label">Create New Tag</label>
                        <div className="flex gap-2">
                            <input
                                id="new-tag-name"
                                type="text"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                placeholder="New tag name"
                                className="input flex-grow"
                            />
                            <button
                                type="button"
                                onClick={() => createTagMutation.mutate(newTagName)}
                                className="button button-secondary button-sm"
                                disabled={!newTagName.trim() || createTagMutation.isLoading}
                            >
                                {createTagMutation.isLoading ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>

                    <button onClick={handleSubmit} className="button button-primary w-full" disabled={selectedTags.length === 0}>
                        Apply Tags
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main Contact List Page ---
const ContactListPage = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showBulkTagModal, setShowBulkTagModal] = useState(false);

    const { data: contacts, isLoading, error } = useQuery<AppContact[], Error>({
        queryKey: ['contacts', user?.id],
        queryFn: () => fetchContacts(user!.id),
        enabled: !!user,
    });

    const filteredContacts = useMemo(() => {
        if (!contacts) return [];
        const lowerCaseQuery = searchQuery.toLowerCase();
        return contacts.filter(contact =>
            contact.full_name.toLowerCase().includes(lowerCaseQuery) ||
            contact.email.toLowerCase().includes(lowerCaseQuery) ||
            contact.tags.some(tag => tag.name.toLowerCase().includes(lowerCaseQuery))
        );
    }, [contacts, searchQuery]);

    const deleteContactMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('contacts').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts', user?.id] });
            toast.success("Contact deleted successfully.");
        },
        onError: (err: any) => {
            toast.error(`Failed to delete contact: ${err.message}`);
        },
    });

    const handleBulkDelete = () => {
        if (window.confirm(`Are you sure you want to delete ${selectedContactIds.length} selected contacts? This action cannot be undone.`)) {
            // In a real application, you'd likely have a single RPC call for bulk delete
            Promise.all(selectedContactIds.map(id => deleteContactMutation.mutateAsync(id)))
                .then(() => {
                    toast.success("Selected contacts deleted.");
                    setSelectedContactIds([]);
                })
                .catch(err => {
                    toast.error(`Error deleting some contacts: ${err.message}`);
                });
        }
    };

    const handleApplyBulkTags = async (tagIds: string[], action: 'add' | 'remove') => {
        const operations: Promise<any>[] = [];
        for (const contactId of selectedContactIds) {
            if (action === 'add') {
                // For each selected tag, link it to the contact if not already
                for (const tagId of tagIds) {
                    operations.push(
                        supabase.from('contact_tags').upsert({ contact_id: contactId, tag_id: tagId }, { onConflict: 'contact_id, tag_id' })
                    );
                }
            } else { // 'remove'
                // For each selected tag, remove its link to the contact
                for (const tagId of tagIds) {
                    operations.push(
                        supabase.from('contact_tags').delete().eq('contact_id', contactId).eq('tag_id', tagId)
                    );
                }
            }
        }
        await Promise.all(operations)
            .then(() => {
                toast.success(`Tags ${action === 'add' ? 'added to' : 'removed from'} ${selectedContactIds.length} contacts.`);
                queryClient.invalidateQueries({ queryKey: ['contacts', user?.id] });
                setSelectedContactIds([]);
            })
            .catch(err => {
                toast.error(`Error applying bulk tags: ${err.message}`);
            });
    };


    if (isLoading) return <p className="loading-message">Loading contacts...</p>;
    if (error) return <p className="error-message">Error loading contacts: {error.message}</p>;

    return (
        <div className="page-container">
            <CsvImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['contacts', user?.id] })}
                userId={user!.id}
            />
            <BulkTagModal
                isOpen={showBulkTagModal}
                onClose={() => setShowBulkTagModal(false)}
                selectedContactIds={selectedContactIds}
                onApplyTags={handleApplyBulkTags}
                userId={user!.id}
            />

            <div className="page-header-row">
                <h1>Contacts</h1>
                <div className="actions-group">
                    <button onClick={() => setShowImportModal(true)} className="button button-secondary button-with-icon">
                        <Upload size={16} /> Import CSV
                    </button>
                    <Link to="/u/contacts/new" className="button button-primary button-with-icon">
                        <PlusCircle size={16} /> New Contact
                    </Link>
                </div>
            </div>

            <div className="filter-bar-grid mb-4">
                <input
                    className="input"
                    placeholder="Search by name, email or tag..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {selectedContactIds.length > 0 && (
                <div className="bulk-actions-bar">
                    <span>{selectedContactIds.length} selected</span>
                    <button onClick={() => setShowBulkTagModal(true)} className="button button-secondary button-sm button-with-icon">
                        <Tag size={16} /> Add/Remove Tags
                    </button>
                    <button onClick={handleBulkDelete} className="button button-danger button-sm button-with-icon">
                        <Trash2 size={16} /> Delete
                    </button>
                </div>
            )}

            <div className="contact-list">
                {filteredContacts.length > 0 ? (
                    filteredContacts.map(contact => (
                        <div key={contact.id} className="contact-list-item">
                            <input
                                type="checkbox"
                                className="bulk-select-checkbox"
                                checked={selectedContactIds.includes(contact.id)}
                                onChange={() => handleSelectContact(contact.id)}
                                title="Select for bulk actions"
                            />
                            <div className="contact-details">
                                <h3 className="contact-name">{contact.full_name}</h3>
                                <p className="contact-info"><Mail size={14} /> {contact.email}</p>
                                {contact.phone_number && <p className="contact-info"><Phone size={14} /> {contact.phone_number}</p>}
                                <div className="contact-tags">
                                    {contact.tags.map(tag => (
                                        <span key={tag.id} className="tag-pill">{tag.name}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="contact-actions">
                                <Link to={`/u/contacts/${contact.id}`} className="button button-secondary button-sm">View Details</Link>
                                <Link to={`/u/contacts/edit/${contact.id}`} className="button button-secondary button-sm">Edit</Link>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state-card">
                        <p>
                            {contacts && contacts.length > 0
                                ? "No contacts match your current search/filters."
                                : "You haven't added any contacts yet."}
                        </p>
                        <p className="mt-4">
                            Click "New Contact" or "Import CSV" to get started.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactListPage;