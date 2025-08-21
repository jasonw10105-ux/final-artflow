import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/supabase';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Artwork = Pick<Database['public']['Tables']['artworks']['Row'], 'title' | 'slug'>;
type Profile = Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'slug'>;

type Inquiry = Conversation & {
  artworks: Artwork;
  profiles: Profile;
};

const CollectorInquiriesPage: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInquiries = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in to view your inquiries.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          artworks ( title, slug ),
          profiles ( full_name, slug )
        `)
        .eq('inquirer_user_id', user.id);

      if (error) {
        setError(error.message);
      } else if (data) {
        setInquiries(data as Inquiry[]);
      }
      setLoading(false);
    };

    fetchInquiries();
  }, []);

  if (loading) {
    return <div>Loading your inquiries...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <h1>My Inquiries</h1>
      {inquiries.length > 0 ? (
        <ul>
          {inquiries.map((inquiry) => (
            <li key={inquiry.id}>
              <Link to={`/artists/${inquiry.profiles.slug}/artwork/${inquiry.artworks.slug}`}>
                <p>Artwork: {inquiry.artworks.title}</p>
                <p>Artist: {inquiry.profiles.full_name}</p>
                <p>Status: {inquiry.status}</p>
                <p>Last Message: {new Date(inquiry.last_message_at || 0).toLocaleString()}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>You have not made any inquiries.</p>
      )}
    </div>
  );
};

export default CollectorInquiriesPage;
