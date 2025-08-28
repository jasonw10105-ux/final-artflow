// src/pages/explore/ExplorePage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';

interface Digest {
  id: bigint;
  title: string;
  description: string;
  items: any[];
}

const ExplorePage = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const digestId = queryParams.get('digest');

  const [selectedDigest, setSelectedDigest] = useState<Digest | null>(null);

  const { data: digests = [] } = useQuery({
    queryKey: ['digests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('digests').select('*');
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (digestId) {
      const found = digests.find(d => d.id.toString() === digestId);
      if (found) setSelectedDigest(found);
    }
  }, [digestId, digests]);

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', borderRight: '1px solid #ddd', padding: '1rem' }}>
        <h3>Digests</h3>
        <ul>
          {digests.map(d => (
            <li key={d.id} style={{ marginBottom:'0.5rem', cursor:'pointer' }} onClick={() => setSelectedDigest(d)}>
              {d.title}
            </li>
          ))}
        </ul>
      </div>

      {/* Right Panel */}
      <div style={{ flex:1, padding:'1rem' }}>
        {selectedDigest ? (
          <>
            <h2>{selectedDigest.title}</h2>
            <p>{selectedDigest.description}</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1rem' }}>
              {selectedDigest.items.map((item:any) => (
                <div key={item.id} style={{ border:'1px solid #ccc', borderRadius:'8px', padding:'0.5rem' }}>
                  <p>{item.title}</p>
                  <small>{item.type}</small>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>Select a digest to explore recommendations.</p>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
