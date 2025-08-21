// src/pages/dashboard/artist/CatalogueListPage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { PlusCircle } from 'lucide-react';

// --- FIXED: This function now fetches catalogues and their artwork counts in a single, efficient query ---
const fetchCataloguesWithArtworkCounts = async (userId: string) => {
    const { data, error } = await supabase
        .from('catalogues')
        .select('*, artworks(count)') // Selects all catalogue fields and gets the count of related artworks.
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching catalogues:", error);
        throw new Error(error.message);
    }
    return data;
}

const CatalogueListPage = () => {
    const { user, profile } = useAuth(); // Get profile for the public "View" link slug

    const { data: catalogues, isLoading } = useQuery({
        queryKey: ['cataloguesWithCounts', user?.id],
        queryFn: () => fetchCataloguesWithArtworkCounts(user!.id),
        enabled: !!user,
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Catalogues</h1>
                <Link to="/artist/catalogues/new" className="button button-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <PlusCircle size={16} /> Create Catalogue
                </Link>
            </div>
            
            {isLoading ? <p>Loading catalogues...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {catalogues && catalogues.length > 0 ? (
                        catalogues.map((cat: any) => (
                            <div key={cat.id} style={{
                                background: 'var(--card)',
                                borderRadius: 'var(--radius)',
                                padding: '1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                border: '1px solid var(--border)'
                            }}>
                                <div>
                                    <h3 style={{ margin: '0 0 0.5rem 0' }}>{cat.title}</h3>
                                    <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>
                                        {/* --- FIXED: Access the count directly from the query result --- */}
                                        {cat.artworks[0]?.count || 0} artwork(s)
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    {cat.is_published && profile?.slug && (
                                        <Link 
                                            to={`/catalogue/${profile.slug}/${cat.slug}`} 
                                            className='button-secondary button' 
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            View Public Page
                                        </Link>
                                    )}
                                    <Link to={`/artist/catalogues/edit/${cat.id}`} className='button-secondary button'>Edit</Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                            <p>You haven't created any catalogues yet.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CatalogueListPage;