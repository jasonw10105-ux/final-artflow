// src/pages/dashboard/collector/CollectorVaultPage.tsx
import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { Database } from '@/types/database.types';
import { Download, Award } from 'lucide-react';
import VaultAccessPage from './VaultAccessPage';
import '@/styles/app.css';

// Type Definitions
type SalesRow = Database['public']['Tables']['sales']['Row'];
type ArtworkRow = Pick<Database['public']['Tables']['artworks']['Row'], 'title' | 'slug' | 'user_id' | 'year'>;
type ProfileRow = Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'slug'>;
type ArtworkImageRow = Pick<Database['public']['Tables']['artwork_images']['Row'], 'image_url'>;

interface DetailedSale extends SalesRow {
    artwork: (ArtworkRow & {
        images: ArtworkImageRow[] | null;
        artist: ProfileRow | null;
        image_url?: string;
    }) | null;
}

const CollectorVaultPage = () => {
    const { user } = useAuth();
    const [isVerified, setIsVerified] = useState(false);

    const { data: sales, isLoading, error } = useQuery<DetailedSale[], Error>({
        queryKey: ['collectorVaultSales', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    id, sale_price, sale_date, digital_coa_url,
                    artwork:artwork_id (
                        title, slug, year,
                        images:artwork_images(image_url),
                        artist:user_id (full_name, slug)
                    )
                `)
                .eq('collector_id', user.id)
                .order('sale_date', { ascending: false });

            if (error) throw error;
            
            return (data || []).map(sale => ({
                ...sale,
                artwork: sale.artwork ? {
                    ...sale.artwork,
                    image_url: sale.artwork.images?.[0]?.image_url || 'https://placehold.co/50x50?text=No+Img',
                    artist: sale.artwork.artist || { full_name: 'Unknown', slug: '#' }
                } : null
            }));
        },
        enabled: !!user && isVerified, // Only fetch data once verified
    });

    if (!isVerified) {
        return <VaultAccessPage onVerified={() => setIsVerified(true)} />;
    }

    if (isLoading) return <div className="page-container"><p className="loading-message">Loading your vault...</p></div>;
    if (error) return <div className="page-container"><p className="error-message">Error: {error.message}</p></div>;

    return (
        <div className="page-container">
            <h1>My Vault</h1>
            <p className="page-subtitle">A secure record of your acquired artworks and their official documentation.</p>
            
            <div className="card-table-wrapper mt-8">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Artwork</th>
                            <th>Artist</th>
                            <th>Acquired</th>
                            <th className="text-center">Certificate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales && sales.length > 0 ? (
                            sales.map(sale => (
                                <tr key={sale.id}>
                                    <td>
                                        <Link to={`/${sale.artwork?.artist?.slug}/artwork/${sale.artwork?.slug}`} className="flex items-center gap-4 text-link">
                                            <img src={sale.artwork?.image_url} alt={sale.artwork?.title || 'Untitled'} className="table-thumbnail" />
                                            <div>
                                                <span className="font-semibold">{sale.artwork?.title}</span>
                                                <span className="block text-sm text-muted-foreground">{sale.artwork?.year}</span>
                                            </div>
                                        </Link>
                                    </td>
                                    <td>
                                        <Link to={`/${sale.artwork?.artist?.slug}`} className="text-link">
                                            {sale.artwork?.artist?.full_name}
                                        </Link>
                                    </td>
                                    <td>{new Date(sale.sale_date || '').toLocaleDateString()}</td>
                                    <td className="text-center">
                                        {sale.digital_coa_url ? (
                                            <a
                                                href={sale.digital_coa_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="button button-secondary button-sm button-with-icon"
                                            >
                                                <Download size={14} /> View Digital CoA
                                            </a>
                                        ) : (
                                            <span className="text-sm text-muted-foreground italic">Physical CoA</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="text-center py-12">
                                    <div className="empty-state-card">
                                        <Award size={48} className="text-muted-foreground" />
                                        <h3 className="text-lg font-semibold mt-4">Your vault is empty.</h3>
                                        <p className="text-muted-foreground">Artworks you purchase will appear here, along with their certificates.</p>
                                        <Link to="/artworks" className="button button-primary mt-4">Browse Artworks</Link>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CollectorVaultPage;