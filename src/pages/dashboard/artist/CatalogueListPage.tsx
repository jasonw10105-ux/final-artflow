// src/pages/dashboard/artist/CatalogueListPage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { Database } from '@/types/database.types';

type Catalogue = Database['public']['Tables']['catalogues']['Row'];

const fetchCatalogues = async (userId: string): Promise<Catalogue[]> => {
    const { data, error } = await supabase
        .from('catalogues')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
};

const CatalogueListPage = () => {
    const { user } = useAuth();
    const { data: catalogues, isLoading } = useQuery({
        queryKey: ['catalogues', user?.id],
        queryFn: () => fetchCatalogues(user!.id),
        enabled: !!user,
    });

    if (isLoading) return <p>Loading catalogues...</p>;

    const sortedCatalogues = catalogues
        ? [...catalogues].sort((a: Catalogue, b: Catalogue) => {
              if (a.is_system_catalogue) return -1;
              if (b.is_system_catalogue) return 1;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
        : [];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Catalogues</h1>
                <Link to="/artist/catalogues/new" className="button button-primary">Create New Catalogue</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sortedCatalogues.map((cat: Catalogue) => (
                    <div key={cat.id} style={{ background: 'var(--card)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                        <Link to={`/artist/catalogues/edit/${cat.id}`}>
                            <h3>{cat.title}</h3>
                        </Link>
                        <p>{cat.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CatalogueListPage;