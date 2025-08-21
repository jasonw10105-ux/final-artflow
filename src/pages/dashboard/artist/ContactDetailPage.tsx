// src/pages/dashboard/artist/ContactDetailPage.tsx

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { MessageSquare, ShoppingCart, Star, Eye } from 'lucide-react';
import { Tag } from '../../../components/dashboard/TagManager';

// --- MOCK DATA AND TYPES ---
// In a real app, these types might live in a central types file.
interface MockArtwork { id: string; title: string; slug: string; }
interface MockCatalogue { id: string; title: string; slug: string; }
interface MockSale { id: string; artwork: MockArtwork; sale_date: string; price: number; }
interface MockInquiry { id: string; artwork: MockArtwork; message_preview: string; created_at: string; conversation_id: string; }
interface MockInterest { id: string; item: MockArtwork | MockCatalogue; type: 'artwork' | 'catalogue'; notes: string; }
interface MockContact { id: string; full_name: string; email: string; phone_number?: string; address?: string; notes?: string; tags: Tag[] }
interface MockContactDetails {
    contact: MockContact;
    sales: MockSale[];
    inquiries: MockInquiry[];
    interests: MockInterest[];
}
// --- END MOCK DATA ---


// This function simulates fetching all related data for a contact.
// In a real implementation, you would use Supabase to query all these tables.
const fetchContactDetails = async (contactId: string, userId: string): Promise<MockContactDetails> => {
    console.log(`Fetching details for contact ${contactId} for user ${userId}`);
    
    // For now, return mock data:
    const mockArtworks: MockArtwork[] = [
        { id: 'art1', title: 'Cosmic Dreams', slug: 'cosmic-dreams' },
        { id: 'art2', title: 'Oceanic Whispers', slug: 'oceanic-whispers' },
    ];
    const mockCatalogues: MockCatalogue[] = [
        { id: 'cat1', title: '2024 Abstract Collection', slug: '2024-abstract-collection' }
    ];

    return new Promise(resolve => setTimeout(() => resolve({
        contact: {
            id: contactId,
            full_name: 'Jane Doe',
            email: 'jane.doe@example.com',
            phone_number: '555-123-4567',
            address: '123 Art Collector Lane, New York, NY 10001',
            notes: 'Met at the Art Basel fair. Very interested in abstract expressionism and has a significant budget. Follow up in September.',
            tags: [{id: 'tag1', name: 'VIP'}, {id: 'tag2', name: 'Art Basel 2024'}]
        },
        sales: [
            { id: 'sale1', artwork: mockArtworks[0], sale_date: '2024-06-15', price: 4500.00 }
        ],
        inquiries: [
            { id: 'inq1', artwork: mockArtworks[1], message_preview: 'Hello, I was wondering about the framing options for this piece...', created_at: '2024-08-01T10:00:00Z', conversation_id: 'conv123' }
        ],
        interests: [
            { id: 'int1', item: mockArtworks[1], type: 'artwork', notes: 'Expressed strong interest during gallery visit.'},
            { id: 'int2', item: mockCatalogues[0], type: 'catalogue', notes: 'Viewed the online catalogue twice.'},
        ]
    }), 500));
};

const DetailCard: React.FC<{children: React.ReactNode; title: string; icon: React.ReactElement}> = ({children, title, icon}) => (
  <div style={{ background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
      {icon}
      <h3 style={{ margin: 0 }}>{title}</h3>
    </div>
    {children}
  </div>
);

const ContactDetailPage = () => {
    const { contactId } = useParams();
    const { user } = useAuth();

    const { data, isLoading, error } = useQuery({
        queryKey: ['contactDetails', contactId],
        queryFn: () => fetchContactDetails(contactId!, user!.id),
        enabled: !!contactId && !!user,
    });

    if (isLoading) return <p>Loading contact details...</p>;
    if (error) return <p>Error loading contact: {error.message}</p>;
    if (!data) return <p>Contact not found.</p>

    const { contact, sales, inquiries, interests } = data;

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <Link to="/artist/contacts" className="button-secondary" style={{ marginBottom: '1rem', display: 'inline-block' }}>&larr; All Contacts</Link>
                <h1>{contact.full_name}</h1>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {contact.tags.map(tag => <span key={tag.id} className="tag-pill" style={{ background: 'var(--secondary)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem' }}>{tag.name}</span>)}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'flex-start' }}>
                {/* LEFT COLUMN -- CONTACT INFO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <DetailCard title="Contact Information" icon={<Eye size={20} />}>
                    <p><strong>Email:</strong> {contact.email}</p>
                    {contact.phone_number && <p><strong>Phone:</strong> {contact.phone_number}</p>}
                    {contact.address && <p><strong>Address:</strong> {contact.address}</p>}
                  </DetailCard>
                  <DetailCard title="Notes" icon={<Star size={20} />}>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{contact.notes || 'No notes for this contact.'}</p>
                  </DetailCard>
                </div>

                {/* RIGHT COLUMN -- ACTIVITY */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <DetailCard title="Recent Sales" icon={<ShoppingCart size={20} />}>
                        {sales.length > 0 ? (
                            sales.map(sale => (
                                <div key={sale.id}>
                                    Sold <Link to={`/artist/artworks/edit/${sale.artwork.id}`}><strong>{sale.artwork.title}</strong></Link> on {new Date(sale.sale_date).toLocaleDateString()} for ${sale.price.toFixed(2)}
                                </div>
                            ))
                        ) : <p>No sales recorded.</p>}
                    </DetailCard>

                    <DetailCard title="Inquiries & Messages" icon={<MessageSquare size={20} />}>
                        {inquiries.length > 0 ? (
                            inquiries.map(inquiry => (
                                <div key={inquiry.id}>
                                    Inquired about <Link to={`/artist/artworks/edit/${inquiry.artwork.id}`}><strong>{inquiry.artwork.title}</strong></Link> on {new Date(inquiry.created_at).toLocaleDateString()}.
                                    <p style={{ fontStyle: 'italic', color: 'var(--muted-foreground)', paddingLeft: '1rem', borderLeft: '2px solid var(--border)', marginTop: '0.25rem' }}>"{inquiry.message_preview}"</p>
                                    <Link to={`/artist/messages?conversation=${inquiry.conversation_id}`}>View Conversation &rarr;</Link>
                                </div>
                            ))
                        ) : <p>No inquiries from this contact.</p>}
                    </DetailCard>
                     <DetailCard title="Known Interests" icon={<Star size={20} />}>
                        {interests.length > 0 ? (
                            interests.map(interest => (
                                <div key={interest.id}>
                                    <p>Interested in {interest.type === 'artwork' ? 'Artwork' : 'Catalogue'}: <strong>{interest.item.title}</strong></p>
                                    <p style={{ fontStyle: 'italic', color: 'var(--muted-foreground)' }}>Notes: {interest.notes}</p>
                                </div>
                            ))
                        ) : <p>No specific interests tracked.</p>}
                    </DetailCard>
                </div>
            </div>
        </div>
    );
};

export default ContactDetailPage;