// src/pages/dashboard/collector/CollectorSalesPage.tsx

import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { Link } from 'react-router-dom';

const CollectorSalesPage = () => {
    const { user } = useAuth();

    const { data: sales, isLoading, error } = useQuery({
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
    if (error) return <p>Error loading collection: {error.message}</p>

    return (
        <div>
            <h1>My Collection</h1>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>A history of your acquired artworks.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {sales?.map((sale: any) => (
                    <div key={sale.id} style={{ display: 'flex', alignItems: 'center', background: 'var(--card)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                        <img src={sale.artwork.image_url} alt={sale.artwork.title} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius)', marginRight: '1.5rem' }} />
                        <div style={{ flex: 1 }}>
                            <Link to={`/artwork/${sale.artwork.artist.slug}/${sale.artwork.slug}`} style={{ fontSize: '1.2rem', fontWeight: 'bold', textDecoration: 'none' }}>{sale.artwork.title}</Link>
                            <p style={{margin: '0.25rem 0 0 0'}}>by <Link to={`/artist/${sale.artwork.artist.slug}`}>{sale.artwork.artist.full_name}</Link></p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '1.1rem', fontWeight: '500', margin: 0 }}>ZAR {parseFloat(sale.sale_price).toLocaleString()}</p>
                            <p style={{ color: 'var(--muted-foreground)', margin: '0.25rem 0 0 0' }}>Acquired: {new Date(sale.sale_date).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
                {sales?.length === 0 && (
                     <div style={{textAlign: 'center', padding: '3rem', background: 'var(--card)', borderRadius: 'var(--radius)'}}>
                        <p>Your collection is empty.</p>
                        <p style={{color: 'var(--muted-foreground)'}}>Artworks you purchase will appear here.</p>
                        <Link to="/artworks" className="button">Browse Artworks</Link>
                     </div>
                )}
            </div>
        </div>
    );
};
export default CollectorSalesPage;
