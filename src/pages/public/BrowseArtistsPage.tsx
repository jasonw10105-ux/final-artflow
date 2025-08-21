import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

const fetchArtists = async (searchTerm: string | null, sortLetter: string | null) => {
    const { data, error } = await supabase.rpc('get_all_artists', { 
        search_term: searchTerm || null,
        sort_letter: sortLetter || null 
    });
    if (error) throw new Error(error.message);
    return data;
};

const BrowseArtistsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortLetter, setSortLetter] = useState<string | null>(null);

    // --- THIS IS THE CRITICAL FIX ---
    // The useQuery call has been converted to the required "Object" syntax.
    const { data: artists, isLoading } = useQuery({
        queryKey: ['allArtists', searchTerm, sortLetter], 
        queryFn: () => fetchArtists(searchTerm, sortLetter),
        keepPreviousData: true 
    });

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <h1>Browse Artists</h1>
            <div style={{ display: 'flex', gap: '1rem', margin: '2rem 0' }}>
                <input 
                    type="search" 
                    placeholder="Search by artist name..." 
                    className="input" 
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setSortLetter(null); // Clear letter sort when searching
                    }}
                />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
                <button className="button-secondary" onClick={() => setSortLetter(null)} style={{ background: sortLetter === null ? 'var(--primary)' : 'var(--secondary)'}}>All</button>
                {ALPHABET.map(letter => (
                    <button key={letter} className="button-secondary" onClick={() => setSortLetter(letter)} style={{ background: sortLetter === letter ? 'var(--primary)' : 'var(--secondary)'}}>
                        {letter}
                    </button>
                ))}
            </div>

            {isLoading ? <p>Loading artists...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
                    {artists?.map((artist: any) => (
                        <Link to={`/${artist.slug}`} key={artist.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                             <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                <img src={artist.avatar_url || 'https://placehold.co/400x400'} alt={artist.full_name} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                                <div style={{ padding: '1rem' }}>
                                    <h4>{artist.full_name}</h4>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {artists?.length === 0 && <p style={{textAlign: 'center', gridColumn: '1 / -1'}}>No artists found matching your criteria.</p>}
                </div>
            )}
        </div>
    );
};
export default BrowseArtistsPage;