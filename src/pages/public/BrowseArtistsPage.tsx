// src/pages/public/BrowseArtistsPage.tsx

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Link } from 'react-router-dom';
import { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const ARTISTS_PER_PAGE = 12;

const fetchArtists = async (page: number): Promise<{ artists: Profile[], count: number }> => {
    const from = page * ARTISTS_PER_PAGE;
    const to = from + ARTISTS_PER_PAGE - 1;

    const { data, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('role', 'artist')
        .order('full_name', { ascending: true })
        .range(from, to);

    if (error) throw new Error(error.message);
    return { artists: data || [], count: count || 0 };
};

const BrowseArtistsPage = () => {
    const [page, setPage] = useState(0);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['browse_artists', page],
        queryFn: () => fetchArtists(page),
        // FIX: In v5, `keepPreviousData` is replaced by `placeholderData`
        placeholderData: (previousData) => previousData,
    });

    const totalPages = data?.count ? Math.ceil(data.count / ARTISTS_PER_PAGE) : 0;

    if (isLoading && !data) return <p>Loading artists...</p>;
    if (isError) return <p>Error loading artists: {error.message}</p>;

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Browse Artists</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                {data?.artists.map((artist: Profile) => (
                    <Link to={`/${artist.slug}`} key={artist.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden', textAlign: 'center', padding: '1.5rem' }}>
                            <img src={artist.avatar_url || '/placeholder.png'} alt={artist.full_name || 'Artist'} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1rem auto' }} />
                            <h3 style={{ margin: 0 }}>{artist.full_name}</h3>
                        </div>
                    </Link>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                    Previous
                </button>
                <span>Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages}>
                    Next
                </button>
            </div>
        </div>
    );
};

export default BrowseArtistsPage;