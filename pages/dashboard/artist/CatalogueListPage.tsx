// src/pages/dashboard/artist/CatalogueListPage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

const fetchCatalogues = async (userId: string) => {
    const { data, error } = await supabase
        .from('catalogues')
        .select('id, title, description, is_published, slug')
        .eq('user_id', userId)
        .order('title', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
};

const CatalogueListPage = () => {
    const { user, profile } = useAuth();

    const { data: catalogues, isLoading } = useQuery({
        queryKey: ['catalogues', user?.id],
        queryFn: () => fetchCatalogues(user!.id),
        enabled: !!user,
    });

    if (isLoading) return <p>Loading catalogues...</p>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Catalogues</h1>
                <Link to="/artist/catalogues/new" className="button button-primary" style={{ display: 'flex', gap: '0.5rem' }}>
                    <PlusCircle size={16} /> New Catalogue
                </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {catalogues && catalogues.length > 0 ? (
                    catalogues.map(cat => (
                        <div key={cat.id} style={{ background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.5rem' }}>{cat.title}</h3>
                                <p style={{ color: 'var(--muted-foreground)' }}>{cat.description || 'No description'}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <a href={`/catalogue/${profile?.slug}/${cat.slug}`} target="_blank" rel="noopener noreferrer" className="button-secondary">View</a>
                                <Link to={`/artist/catalogues/edit/${cat.id}`} className="button-secondary">Edit</Link>
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '3rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
                        You haven't created any catalogues yet.
                    </p>
                )}
            </div>
        </div>
    );
};

export default CatalogueListPage;