// src/pages/dashboard/collector/CollectorExplorePage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface DigestNotification {
  id: bigint;
  created_at: string;
  type: 'artwork' | 'artist' | 'catalogue' | 'learned';
  message: string;
  link_url: string | null;
  data: any; // array of artworks/artists/catalogues or filter info
  rationale?: string; // Human-readable explanation of why this digest was generated
}

const CollectorExplorePage = () => {
  const [selectedDigest, setSelectedDigest] = useState<DigestNotification | null>(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['digestNotifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'digest')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const renderItem = (item: any, type: string) => {
    switch (type) {
      case 'artwork':
        return (
          <Link to={`/artwork/${item.slug}`} key={item.id}>
            <img src={item.image_url} alt={item.title} style={{ width: '100%', borderRadius: 'var(--radius)' }} />
            <p>{item.title}</p>
            <small>{item.artist_name}</small>
          </Link>
        );
      case 'artist':
        return (
          <Link to={`/artist/${item.slug}`} key={item.id}>
            <p>{item.name}</p>
            <small>{item.bio?.slice(0, 60)}...</small>
          </Link>
        );
      case 'catalogue':
        return (
          <Link to={`/catalogue/${item.slug}`} key={item.id}>
            <p>{item.title}</p>
            <small>{item.description?.slice(0, 60)}...</small>
          </Link>
        );
      default:
        return <p key={item.id}>Unknown item type</p>;
    }
  };

  return (
    <div style={{ display: 'flex', height: '80vh', gap: '1rem' }}>
      {/* Sidebar */}
      <div style={{ flex: '0 0 250px', overflowY: 'auto', borderRight: '1px solid var(--border)', padding: '1rem' }}>
        <h3>Digests</h3>
        {isLoading && <p>Loading...</p>}
        {!isLoading && notifications.length === 0 && <p>No digests yet.</p>}
        <ul>
          {notifications.map((n: DigestNotification) => (
            <li key={n.id} style={{ marginBottom: '0.5rem' }}>
              <button
                className={`button ${selectedDigest?.id === n.id ? 'button-primary' : ''}`}
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => setSelectedDigest(n)}
              >
                {n.message}
                <br />
                <small className="text-muted">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Panel */}
      <div style={{ flex: '1', overflowY: 'auto', padding: '1rem' }}>
        {selectedDigest ? (
          <>
            <h3>{selectedDigest.rationale || selectedDigest.message}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {selectedDigest.data && selectedDigest.data.length > 0 ? (
                selectedDigest.data.map((item: any) => renderItem(item, selectedDigest.type))
              ) : (
                <p>No items found for this digest yet.</p>
              )}
            </div>
          </>
        ) : (
          <p>Select a digest from the left to view details and see why it was generated for you.</p>
        )}
      </div>
    </div>
  );
};

export default CollectorExplorePage;
