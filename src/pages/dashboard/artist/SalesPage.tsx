import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Database } from '@/types/database.types';
import { CreditCard, TrendingUp, Users } from 'lucide-react';

type Sale = Database['public']['Tables']['sales']['Row'] & {
    artworks: Pick<Database['public']['Tables']['artworks']['Row'], 'title' | 'image_url'>;
};

const fetchSalesData = async (artistId: string): Promise<Sale[]> => {
    const { data, error } = await supabase
        .from('sales')
        .select(`
            *,
            artworks ( title, image_url )
        `)
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data as Sale[];
};

const StatCard = ({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) => (
    <div style={{ background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--secondary)', padding: '0.75rem', borderRadius: '50%' }}>{icon}</div>
            <div>
                <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>{title}</p>
                <h3 style={{ margin: 0, fontSize: '1.75rem' }}>{value}</h3>
            </div>
        </div>
    </div>
);

const SalesPage = () => {
    const { user } = useAuth();
    const { data: sales, isLoading } = useQuery({
        queryKey: ['sales', user?.id],
        queryFn: () => fetchSalesData(user!.id),
        enabled: !!user,
    });

    const stats = useMemo(() => {
        if (!sales) return { totalRevenue: 0, totalSales: 0, uniqueBuyers: 0 };
        const totalRevenue = sales.reduce((acc, sale) => acc + (sale.amount_net || 0), 0);
        const uniqueBuyers = new Set(sales.map(sale => sale.buyer_email)).size;
        return {
            totalRevenue,
            totalSales: sales.length,
            uniqueBuyers,
        };
    }, [sales]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    return (
        <div>
            <h1>Sales Overview</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', margin: '2rem 0' }}>
                <StatCard title="Total Revenue (Net)" value={formatCurrency(stats.totalRevenue)} icon={<TrendingUp />} />
                <StatCard title="Artworks Sold" value={stats.totalSales.toString()} icon={<CreditCard />} />
                <StatCard title="Unique Collectors" value={stats.uniqueBuyers.toString()} icon={<Users />} />
            </div>

            <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--secondary)' }}>
                        <tr>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Artwork</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Date Sold</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Buyer</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Net Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }}>Loading sales data...</td></tr>
                        ) : sales && sales.length > 0 ? (
                            sales.map(sale => (
                                <tr key={sale.id} style={{ borderTop: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <img src={sale.artworks.image_url || ''} alt={sale.artworks.title || ''} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                                        <span>{sale.artworks.title}</span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>{new Date(sale.created_at).toLocaleDateString()}</td>
                                    <td style={{ padding: '1rem' }}>{sale.buyer_name}<br /><span style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>{sale.buyer_email}</span></td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(sale.amount_net)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No sales recorded yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SalesPage;