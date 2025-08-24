// src/pages/dashboard/collector/CollectorSalesPage.tsx

import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { Link } from 'react-router-dom';

const CollectorSalesPage = () => {
    const { user } = useAuth();

    const { data: sales, isLoading } = useQuery({
        queryKey: ['collectorSales', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    id,
                    sale_price,
                    sale_date,
                    artwork:artworks (
                        title,
                        slug,
                        image_url,
                        artist:profiles (
                            full_name,
                            slug
                        )
                    )
                `)
                .eq('collector_id', user.id)
                .order('sale_date', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!user
    });

    if (isLoading) return <p>Loading your collection...</p>;

    return (
        <div>
            <h1>My Collection</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sales?.map((sale: any) => (
                    <div key={sale.id} style={{ display: 'flex', alignItems: 'center', background: 'var(--card)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                        <img src={sale.artwork.image_url} alt={sale.artwork.title} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius)', marginRight: '1.5rem' }} />
                        <div style={{ flex: 1 }}>
                            <Link to={`/artwork/${sale.artwork.artist.slug}/${sale.artwork.slug}`} style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{sale.artwork.title}</Link>
                            <p>by <Link to={`/artist/${sale.artwork.artist.slug}`}>{sale.artwork.artist.full_name}</Link></p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>ZAR {sale.sale_price}</p>
                            <p style={{ color: 'var(--muted-foreground)' }}>Acquired: {new Date(sale.sale_date).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
                {sales?.length === 0 && <p>Your acquired artworks will appear here.</p>}
            </div>
        </div>
    );
};

export default CollectorSalesPage;