import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button'; // Assuming a Button component
import { LocationJson } from '@/types/database.types'; // Database Tag type
import { AppContact, TagRow, AppSale, AppInquiry } from '@/types/app.types'; // App-level types for contact and related data
import { Mail, Phone, MapPin, NotebookPen, XCircle, Plus, Tag as TagIcon, ShoppingCart, MessageSquare, Star, ArrowLeft } from 'lucide-react';
import '@/styles/app.css'; // Import the centralized styles


// --- Data Fetching ---
// Fetch a single contact with tags
const fetchContact = async (contactId: string, userId: string): Promise<AppContact | null> => {
    const { data, error } = await supabase
        .from('contacts')
        .select(`
            *,
            address,
            contact_tags(tag_id, tags(id, name))
        `)
        .eq('id', contactId)
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error("Error fetching contact:", error);
        // Specifically handle RLS or not found
        if (error.code === 'PGRST116' || error.message.includes('0 rows') || error.message.includes('policy')) {
            return null; // Treat as not found/no access
        }
        throw new Error(error.message);
    }
    if (!data) return null;

    return {
        ...data,
        tags: data.contact_tags?.map((ct: any) => ct.tags).filter(Boolean) || [],
    } as AppContact;
};

// Fetch all available tags for the user
const fetchAllTags = async (userId: string): Promise<TagRow[]> => {
    const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
};

// Fetch sales for this contact
const fetchContactSales = async (contactId: string, userId: string): Promise<AppSale[]> => {
    const { data, error } = await supabase
        .from('sales')
        .select(`
            *,
            artworks ( id, title, slug, artwork_images(image_url, is_primary, position) ),
            collector:profiles!sales_collector_id_fkey(full_name, slug)
        `)
        .eq('collector_id', contactId) // Assuming contactId is also collector_id for registered users
        .eq('artist_id', userId)
        .order('sale_date', { ascending: false });

    if (error) throw error;

    return data.map((sale: any) => ({
        ...sale,
        artworks: {
            ...sale.artworks,
            image_url: sale.artworks.artwork_images?.find((img: any) => img.is_primary)?.image_url || sale.artworks.artwork_images?.[0]?.image_url || null,
        }
    })) as AppSale[];
};

// Fetch inquiries for this contact
const fetchContactInquiries = async (contactEmail: string, artistId: string): Promise<AppInquiry[]> => {
    // Note: Inquiries might be linked by email if the contact isn't a registered user
    const { data, error } = await supabase
        .from('inquiries')
        .select(`
            *,
            artwork:artworks(id, title, slug)
        `)
        .eq('inquirer_email', contactEmail)
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AppInquiry[];
};


// --- Tag Management Component ---
interface TagManagerProps {
    currentTags: TagRow[];
    onTagsUpdate: (newTags: TagRow[]) => void;
    userId: string;
}

const TagManager: React.FC<TagManagerProps> = ({ currentTags, onTagsUpdate, userId }) => {
    const [newTagName, setNewTagName] = useState('');
    const { data: allAvailableTags, isLoading: isLoadingAllTags } = useQuery<TagRow[], Error>({
        queryKey: ['allTags', userId],
        queryFn: () => fetchAllTags(userId),
        enabled: !!userId,
    });
    const queryClient = useQueryClient();

    const addTagMutation = useMutation({
        mutationFn: async (tagData: { contactId: string | undefined; tagId: string }) => {
            if (!tagData.contactId) throw new Error("Contact ID is required to add tag.");
            const { error } = await supabase.from('contact_tags').insert({ contact_id: tagData.contactId, tag_id: tagData.tagId });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contact', useParams().contactId] });
            queryClient.invalidateQueries({ queryKey: ['contacts', userId] });
            toast.success("Tag added successfully!");
        },
        onError: (err: any) => toast.error(`Failed to add tag: ${err.message}`),
    });

    const removeTagMutation = useMutation({
        mutationFn: async (tagData: { contactId: string | undefined; tagId: string }) => {
            if (!tagData.contactId) throw new Error("Contact ID is required to remove tag.");
            const { error } = await supabase.from('contact_tags').delete().eq('contact_id', tagData.contactId).eq('tag_id', tagData.tagId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contact', useParams().contactId] });
            queryClient.invalidateQueries({ queryKey: ['contacts', userId] });
            toast.success("Tag removed successfully!");
        },
        onError: (err: any) => toast.error(`Failed to remove tag: ${err.message}`),
    });

    const createNewTagMutation = useMutation({
        mutationFn: async (name: string) => {
            const { data, error } = await supabase.from('tags').insert({ name, user_id: userId }).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (newTag) => {
            queryClient.invalidateQueries({ queryKey: ['allTags', userId] });
            setNewTagName('');
            toast.success(`Tag '${newTag.name}' created!`);
            // Automatically add the new tag to the current contact
            if (useParams().contactId) {
                addTagMutation.mutate({ contactId: useParams().contactId, tagId: newTag.id });
            }
        },
        onError: (err: any) => toast.error(`Failed to create tag: ${err.message}`),
    });

    const handleAddExistingTag = (tagId: string) => {
        addTagMutation.mutate({ contactId: useParams().contactId, tagId });
    };

    const handleRemoveTag = (tagId: string) => {
        removeTagMutation.mutate({ contactId: useParams().contactId, tagId });
    };

    const handleCreateTagAndAddToContact = () => {
        if (newTagName.trim()) {
            createNewTagMutation.mutate(newTagName.trim());
        }
    };

    const availableTagsToAdd = useMemo(() => {
        return allAvailableTags?.filter(tag => !currentTags.some(ct => ct.id === tag.id)) || [];
    }, [allAvailableTags, currentTags]);


    return (
        <div className="tag-manager">
            <h4 className="section-subtitle">Current Tags</h4>
            <div className="current-tags-list">
                {currentTags.length > 0 ? (
                    currentTags.map(tag => (
                        <div key={tag.id} className="tag-pill tag-pill-removable">
                            <span>{tag.name}</span>
                            <button onClick={() => handleRemoveTag(tag.id)} className="tag-remove-button">
                                <XCircle size={14} />
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="text-muted-foreground text-sm">No tags added yet.</p>
                )}
            </div>

            <h4 className="section-subtitle mt-4">Add Existing Tag</h4>
            {isLoadingAllTags ? (
                <p className="loading-message">Loading available tags...</p>
            ) : availableTagsToAdd.length > 0 ? (
                <div className="available-tags-grid">
                    {availableTagsToAdd.map(tag => (
                        <button key={tag.id} onClick={() => handleAddExistingTag(tag.id)} className="button button-secondary button-sm tag-add-button">
                            <Plus size={14} /> {tag.name}
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground text-sm">No more tags to add.</p>
            )}

            <h4 className="section-subtitle mt-4">Create & Add New Tag</h4>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Enter new tag name"
                    className="input flex-grow"
                />
                <Button
                    onClick={handleCreateTagAndAddToContact}
                    className="button button-primary button-sm"
                    isLoading={createNewTagMutation.isLoading}
                    disabled={!newTagName.trim()}
                >
                    Create & Add
                </Button>
            </div>
        </div>
    );
};


// --- Main Contact Editor Page ---
const ContactEditorPage = () => {
    const { contactId } = useParams<{ contactId: string }>();
    const isEditing = !!contactId;
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [addressStreet, setAddressStreet] = useState('');
    const [addressCity, setAddressCity] = useState('');
    const [addressCountry, setAddressCountry] = useState('');
    const [notes, setNotes] = useState('');
    const [currentTags, setCurrentTags] = useState<TagRow[]>([]); // State for tags
    const [purchaseIntentScore, setPurchaseIntentScore] = useState<number | null>(null);

    // Form validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch existing contact data
    const { data: contactData, isLoading: isLoadingContact } = useQuery<AppContact | null, Error>({
        queryKey: ['contact', contactId],
        queryFn: () => fetchContact(contactId!, user!.id),
        enabled: !!contactId && !!user,
        staleTime: 0, // Always refetch for editor
        retry: false,
    });

    // Fetch related sales and inquiries
    const { data: sales, isLoading: isLoadingSales } = useQuery<AppSale[], Error>({
        queryKey: ['contactSales', contactId],
        queryFn: () => fetchContactSales(contactId!, user!.id),
        enabled: !!contactId && !!user,
    });

    const { data: inquiries, isLoading: isLoadingInquiries } = useQuery<AppInquiry[], Error>({
        queryKey: ['contactInquiries', contactData?.email], // Fetch by email if contact is not a registered user (no collector_id)
        queryFn: () => fetchContactInquiries(contactData!.email, user!.id),
        enabled: !!contactData?.email && !!user,
    });


    // Populate form fields when data loads for editing
    useEffect(() => {
        if (contactData) {
            setFullName(contactData.full_name);
            setEmail(contactData.email);
            setPhoneNumber(contactData.phone_number || '');
            setNotes(contactData.notes || '');
            setCurrentTags(contactData.tags || []); // Set initial tags
            setPurchaseIntentScore(contactData.purchase_intent_score);

            const address = contactData.address as LocationJson;
            if (address) {
                setAddressStreet(address.street || '');
                setAddressCity(address.city || '');
                setAddressCountry(address.country || '');
            } else {
                setAddressStreet('');
                setAddressCity('');
                setAddressCountry('');
            }
        } else if (!isEditing) {
            // Clear form for new contact
            setFullName('');
            setEmail('');
            setPhoneNumber('');
            setAddressStreet('');
            setAddressCity('');
            setAddressCountry('');
            setNotes('');
            setCurrentTags([]);
            setPurchaseIntentScore(null);
        }
    }, [contactData, isEditing]);

    // Handle redirection for not found/error in editing mode
    useEffect(() => {
        if (isEditing && !isLoadingContact && contactId && !contactData) {
            toast.error("Contact not found or you do not have permission to view it.");
            navigate("/u/contacts", { replace: true });
        }
    }, [isEditing, isLoadingContact, contactId, contactData, navigate]);


    // --- Form Validation Logic ---
    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!fullName.trim()) newErrors.fullName = 'Full Name is required.';
        if (!email.trim()) newErrors.email = 'Email is required.';
        else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email format is invalid.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    // Mutation for saving/updating contact
    const saveContactMutation = useMutation({
        mutationFn: async () => { // Removed payload from mutationFn since state variables are used directly
            if (!user) throw new Error("Not authenticated");
            if (!validateForm()) throw new Error("Please correct the errors in the form.");

            const contactToSave = {
                user_id: user.id,
                full_name: fullName.trim(),
                email: email.trim(),
                phone_number: phoneNumber.trim() || null,
                address: (addressStreet || addressCity || addressCountry) ? {
                    street: addressStreet.trim() || null,
                    city: addressCity.trim() || null,
                    country: addressCountry.trim() || null,
                } as LocationJson : null,
                notes: notes.trim() || null,
                purchase_intent_score: purchaseIntentScore,
                updated_at: new Date().toISOString(),
            };

            if (isEditing) {
                const { data, error } = await supabase.from('contacts').update(contactToSave).eq('id', contactId!).select().single();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabase.from('contacts').insert(contactToSave).select().single();
                if (error) throw error;
                return data;
            }
        },
        onSuccess: (data) => {
            toast.success(`Contact ${isEditing ? 'updated' : 'created'} successfully!`);
            queryClient.invalidateQueries({ queryKey: ['contacts', user?.id] }); // Invalidate list
            queryClient.invalidateQueries({ queryKey: ['contact', data.id] }); // Invalidate specific contact
            if (!isEditing) {
                navigate(`/u/contacts/edit/${data.id}`, { replace: true });
            }
        },
        onError: (err: any) => {
            console.error("Save contact error:", err);
            toast.error(`Failed to save contact: ${err.message}`);
        },
    });


    if (isLoadingContact) return <p className="loading-message">Loading contact details...</p>;
    if (!contactData && isEditing) return null; // Wait for redirection if not found


    return (
        <div className="page-container contact-editor-page">
            <Link to="/u/contacts" className="button button-secondary back-button button-with-icon">
                <ArrowLeft size={16} /> All Contacts
            </Link>
            <h1 className="page-title">{isEditing ? `Edit Contact: ${contactData?.full_name}` : 'New Contact'}</h1>
            <p className="page-subtitle">Manage contact information, activity, and interests.</p>

            <form onSubmit={saveContactMutation.mutate} className="form-grid-main">
                {/* Left Column: Contact Details */}
                <div className="form-card form-column-left">
                    <h2 className="section-title">Contact Information</h2>
                    <div className="form-group">
                        <label className="label" htmlFor="fullName">Full Name</label>
                        <input id="fullName" type="text" value={fullName} onChange={e => { setFullName(e.target.value); setErrors(prev => ({ ...prev, fullName: '' })); }} className={`input ${errors.fullName ? 'input-error' : ''}`} required />
                        {errors.fullName && <p className="error-message">{errors.fullName}</p>}
                    </div>
                    <div className="form-group">
                        <label className="label" htmlFor="email">Email</label>
                        <input id="email" type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })); }} className={`input ${errors.email ? 'input-error' : ''}`} required />
                        {errors.email && <p className="error-message">{errors.email}</p>}
                    </div>
                    <div className="form-group">
                        <label className="label" htmlFor="phoneNumber">Phone Number</label>
                        <input id="phoneNumber" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="input" />
                    </div>

                    <h3 className="section-subtitle mt-6">Address</h3>
                    <div className="form-group">
                        <label className="label" htmlFor="addressStreet">Street Address</label>
                        <input id="addressStreet" type="text" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} className="input" />
                    </div>
                    <div className="form-grid-2-col">
                        <div className="form-group">
                            <label className="label" htmlFor="addressCity">City</label>
                            <input id="addressCity" type="text" value={addressCity} onChange={e => setAddressCity(e.target.value)} className="input" />
                        </div>
                        <div className="form-group">
                            <label className="label" htmlFor="addressCountry">Country</label>
                            <input id="addressCountry" type="text" value={addressCountry} onChange={e => setAddressCountry(e.target.value)} className="input" />
                        </div>
                    </div>

                    <h3 className="section-subtitle mt-6">Internal Notes</h3>
                    <div className="form-group">
                        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="textarea min-h-[100px]" placeholder="Add private notes about this contact..."></textarea>
                    </div>

                    <h3 className="section-subtitle mt-6">Purchase Intent Score (1-100)</h3>
                    <div className="form-group">
                        <input
                            id="purchaseIntentScore"
                            type="number"
                            min="1"
                            max="100"
                            value={purchaseIntentScore ?? ''}
                            onChange={e => setPurchaseIntentScore(parseInt(e.target.value) || null)}
                            className="input md:w-1/3"
                            placeholder="e.g., 75"
                        />
                    </div>
                </div>

                {/* Right Column: Tags & Activity */}
                <div className="form-column-right">
                    <div className="form-card mb-6">
                        <h2 className="section-title">Tags</h2>
                        {isEditing && user?.id ? (
                            <TagManager currentTags={currentTags} onTagsUpdate={setCurrentTags} userId={user.id} />
                        ) : (
                            <p className="text-muted-foreground">Save the contact first to manage tags.</p>
                        )}
                    </div>

                    <div className="form-card">
                        <h2 className="section-title">Activity Timeline</h2>
                        {(isLoadingSales || isLoadingInquiries) && <p className="loading-message">Loading activity...</p>}
                        {(!sales?.length && !inquiries?.length && !isLoadingSales && !isLoadingInquiries) ? (
                            <p className="empty-chart-message">No recorded activity for this contact yet.</p>
                        ) : (
                            <div className="activity-timeline">
                                {sales?.map(sale => (
                                    <div key={sale.id} className="activity-item">
                                        <ShoppingCart size={20} className="activity-icon text-primary" />
                                        <div className="activity-content">
                                            <p className="activity-text">
                                                Purchased <Link to={`/u/artworks/edit/${sale.artwork_id}`} className="text-link"><strong>{sale.artworks.title}</strong></Link>
                                                <span className="text-muted-foreground"> on {new Date(sale.sale_date).toLocaleDateString()} for {new Intl.NumberFormat('en-US', { style: 'currency', currency: sale.currency || 'USD' }).format(sale.sale_price)}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {inquiries?.map(inquiry => (
                                    <div key={inquiry.id} className="activity-item">
                                        <MessageSquare size={20} className="activity-icon text-secondary-foreground" />
                                        <div className="activity-content">
                                            <p className="activity-text">
                                                Inquired about <Link to={`/u/artworks/edit/${inquiry.artwork_id}`} className="text-link"><strong>{inquiry.artwork.title}</strong></Link>
                                                <span className="text-muted-foreground"> on {new Date(inquiry.created_at || '').toLocaleDateString()}</span>
                                            </p>
                                            <p className="activity-note">"{inquiry.message.substring(0, 70)}..."</p>
                                            {/* Link to actual conversation page (if implemented) */}
                                            {inquiry.conversation_id && <Link to={`/u/messages?conversation=${inquiry.conversation_id}`} className="text-link text-sm mt-1 block">View Conversation &rarr;</Link>}
                                        </div>
                                    </div>
                                ))}
                                {/* Placeholder for other activity types like catalogue views, custom notes etc. */}
                                <div className="activity-item">
                                    <NotebookPen size={20} className="activity-icon text-muted-foreground" />
                                    <div className="activity-content">
                                        <p className="activity-text">Added general notes to contact profile.</p>
                                        <p className="activity-note text-muted-foreground">Placeholder for a note entry.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                         {/* Quick Note/Task Add: A dedicated input or button to quickly add a new note or a follow-up task related to this contact */}
                         <div className="mt-4">
                            <button type="button" className="button button-secondary button-with-icon w-full">
                                <Plus size={16} /> Add Quick Note / Task
                            </button>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="form-actions col-span-full mt-6">
                    <Button type="submit" className="button button-primary button-lg" isLoading={saveContactMutation.isLoading}>
                        {isEditing ? 'Save Changes' : 'Create Contact'}
                    </Button>
                    {/* Email Communication Integration: An "Email Contact" button */}
                    {isEditing && contactData?.email && (
                        <a href={`mailto:${contactData.email}`} className="button button-secondary button-with-icon ml-4" target="_blank" rel="noopener noreferrer">
                            <Mail size={16} /> Email Contact
                        </a>
                    )}
                </div>
            </form>
        </div>
    );
};

export default ContactEditorPage;