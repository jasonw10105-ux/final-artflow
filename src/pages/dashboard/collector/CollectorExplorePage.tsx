// src/pages/dashboard/collector/ExplorePage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface Digest {
  id: bigint;
  title: string;
  type: 'artwork' | 'artist' | 'catalogue';
  related_data: any;
  created_at: string;
}

const ExplorePage = () => {
  const { user } = useAuth();
  const [selectedDigest, setSelectedDigest] = useState<Digest | null>(null);

  // Fetch digests for this collector
  const { data: digests = [], isLoading: loadingDigests } = useQuery({
    queryKey: ['collectorDigests', user?.id],
    queryFn: async (): Promise<Digest[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('digests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div style={{ display: 'flex', maxWidth: '1400px', margin: '0 auto', padding: '2rem', gap: '2rem' }}>
      {/* Left Sidebar: Digests */}
      <aside style={{ width: '300px', borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
        <h3>Your Digests</h3>
        {loadingDigests ? (
          <p>Loading...</p>
        ) : digests.length === 0 ? (
          <p>No digests yet. Your notifications will appear here.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {digests.map(d => (
              <li key={d.id} style={{ marginBottom: '1rem' }}>
                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius)',
                    background: selectedDigest?.id === d.id ? 'var(--accent)' : 'var(--card)',
                    color: selectedDigest?.id === d.id ? 'white' : 'inherit',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedDigest(d)}
                >
                  {d.title}
                  <br />
                  <small style={{ color: 'var(--muted-foreground)' }}>
                    {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Right Panel: Digest Details */}
      <section style={{ flex: 1 }}>
        {selectedDigest ? (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>{selectedDigest.title}</h2>

            {/* Display learned behavior details */}
            {selectedDigest.type === 'artwork' && selectedDigest.related_data.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {selectedDigest.related_data.map((art: any) => (
                  <Link key={art.id} to={`/artworks/${art.slug}`} className="scroll-card">
                    <img src={art.image_url || '/placeholder.png'} alt={art.title} style={{ width: '100%', borderRadius: 'var(--radius)' }} />
                    <p>{art.title}</p>
                  </Link>
                ))}
              </div>
            ) : selectedDigest.type === 'artist' && selectedDigest.related_data.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                {selectedDigest.related_data.map((artist: any) => (
                  <Link key={artist.id} to={`/artists/${artist.slug}`} className="scroll-card-artist">
                    <img src={artist.avatar_url || '/placeholder.png'} alt={artist.full_name} style={{ width: '100%', borderRadius: 'var(--radius)' }} />
                    <p>{artist.full_name}</p>
                  </Link>
                ))}
              </div>
            ) : selectedDigest.type === 'catalogue' && selectedDigest.related_data.length > 0 ? (
              <div>
                {selectedDigest.related_data.map((item: any) => (
                  <div key={item.id} style={{ marginBottom: '1rem', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--card)' }}>
                    <Link to={`/artworks/${item.slug}`} style={{ fontWeight: 'bold' }}>{item.title}</Link>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No related data to display.</p>
            )}
          </div>
        ) : (
          <p>Select a digest on the left to view curated recommendations based on your learned behavior.</p>
        )}
      </section>
    </div>
  );
};

export default ExplorePage;
