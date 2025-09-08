import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { AppSale } from '@/types/app.types';
import { CreditCard, TrendingUp, Users, DollarSign, Package, Download, Ship, PiggyBank } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';
import toast from 'react-hot-toast';
import '@/styles/app.css';

// --- TYPE DEFINITIONS ---
interface MonthlyRevenue {
    month_name: string;
    total_revenue: number;
}

// --- DATA FETCHING ---
const fetchSalesData = async (artistId: string): Promise<AppSale[]> => {
    const { data, error } = await supabase
        .from('sales')
        .select(`
            *,
            digital_coa_url,
            artworks ( id, title, slug, artwork_images(image_url, is_primary, position) ),
            collector:profiles!sales_collector_id_fkey ( id, full_name, slug )
        `)
        .eq('artist_id', artistId)
        .order('sale_date', { ascending: false });

    if (error) {
        console.error("Error fetching sales data:", error);
        throw new Error(error.message);
    }
    return data.map((sale: any) => ({
        ...sale,
        artworks: {
            ...sale.artworks,
            image_url: sale.artworks.artwork_images?.find((img: any) => img.is_primary)?.image_url || sale.artworks.artwork_images?.[0]?.image_url || null,
        }
    })) as AppSale[];
};

const fetchMonthlyRevenue = async (artistId: string): Promise<MonthlyRevenue[]> => {
    const { data, error } = await supabase.rpc('get_monthly_sales_revenue', { p_artist_id: artistId });
    if (error) {
        console.error("Error fetching monthly revenue:", error);
        throw new Error(error.message);
    }
    return data || [];
};

// --- HELPER COMPONENTS ---
const StatCard = ({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) => (
    <div className="stat-card">
        <div className="stat-icon-secondary">{icon}</div>
        <div>
            <p className="stat-title">{title}</p>
            <h3 className="stat-value">{value}</h3>
        </div>
    </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 bg-card border border-border rounded-md shadow-lg">
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-muted-foreground">Revenue: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};

// --- MAIN COMPONENT ---
const SalesPage = () => {
    const { user } = useAuth();
    const [dateRange, setDateRange] = useState({
        from: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd'),
    });

    const { data: sales, isLoading: isLoadingSales } = useQuery<AppSale[], Error>({
        queryKey: ['sales', user?.id],
        queryFn: () => fetchSalesData(user!.id),
        enabled: !!user,
    });
    
    const { data: monthlyRevenue, isLoading: isLoadingChart } = useQuery<MonthlyRevenue[], Error>({
        queryKey: ['monthlyRevenue', user?.id],
        queryFn: () => fetchMonthlyRevenue(user!.id),
        enabled: !!user,
    });

    const filteredSales = useMemo(() => {
        if (!sales) return [];
        try {
            const fromDate = new Date(dateRange.from);
            const toDate = new Date(dateRange.to);
            // Set time to end of day for 'to' date to include all sales on that day
            toDate.setHours(23, 59, 59, 999);

            return sales.filter(sale => {
                const saleDate = new Date(sale.sale_date);
                return saleDate >= fromDate && saleDate <= toDate;
            });
        } catch (e) {
            // Handle invalid date strings
            return sales;
        }
    }, [sales, dateRange]);

    const stats = useMemo(() => {
        if (!sales) return { totalRevenue: 0, totalSales: 0, uniqueCollectors: 0, averageSalePrice: 0 };
        const totalRevenue = sales.reduce((acc, sale) => acc + (sale.sale_price ?? 0), 0);
        const uniqueCollectors = new Set(sales.map(sale => sale.collector_id)).size;
        const totalSales = sales.length;
        const averageSalePrice = totalSales > 0 ? totalRevenue / totalSales : 0;
        return { totalRevenue, totalSales, uniqueCollectors, averageSalePrice };
    }, [sales]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const handleExport = () => {
        if (!filteredSales || filteredSales.length === 0) {
            toast.error("No data to export for the selected range.");
            return;
        }
        const headers = ["Artwork Title", "Date Sold", "Collector Name", "Sale Price (USD)", "CoA URL"];
        const rows = filteredSales.map(sale => [
            `"${sale.artworks.title}"`,
            new Date(sale.sale_date).toLocaleDateString(),
            `"${sale.collector?.full_name || 'N/A'}"`,
            sale.sale_price,
            (sale as any).digital_coa_url || "Physical"
        ]);
        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales_report_${dateRange.from}_to_${dateRange.to}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Sales report downloaded!");
    };

    return (
        <div className="page-container">
            <h1>Sales Overview</h1>
            <p className="page-subtitle">Track your artwork sales and revenue performance.</p>

            <div className="kpi-grid mb-8">
                <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={<TrendingUp />} />
                <StatCard title="Artworks Sold" value={stats.totalSales.toString()} icon={<Package />} />
                <StatCard title="Unique Collectors" value={stats.uniqueCollectors.toString()} icon={<Users />} />
                <StatCard title="Avg. Sale Price" value={formatCurrency(stats.averageSalePrice)} icon={<DollarSign />} />
            </div>

            <div className="dashboard-section">
                <h3 className="section-title">Sales Trends (Last 12 Months)</h3>
                {isLoadingChart ? <p className="loading-message">Loading chart...</p> : monthlyRevenue && monthlyRevenue.length > 0 ? (
                    <div className="w-full h-72 bg-card p-4 rounded-md border border-border">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyRevenue} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="month_name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value as number / 1000)}k`} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--accent-subtle)' }} />
                                <Bar dataKey="total_revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : <p className="empty-state-message">No sales data in the last year to display trends.</p>}
            </div>

            <div className="dashboard-section mt-8">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="section-title">Sales History</h3>
                    <div className="flex items-center gap-4">
                        <input type="date" className="input" value={dateRange.from} onChange={e => setDateRange(prev => ({...prev, from: e.target.value}))} />
                        <span className="text-muted-foreground">to</span>
                        <input type="date" className="input" value={dateRange.to} onChange={e => setDateRange(prev => ({...prev, to: e.target.value}))} />
                        <button onClick={handleExport} className="button button-secondary button-with-icon">
                            <Download size={16}/> Export CSV
                        </button>
                    </div>
                </div>
                <div className="card-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Artwork</th>
                                <th>Date Sold</th>
                                <th>Collector</th>
                                <th className="text-right">Sale Price</th>
                                <th className="text-center">Certificate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingSales ? (
                                <tr><td colSpan={5} className="text-center py-8 loading-message">Loading sales data...</td></tr>
                            ) : filteredSales.length > 0 ? (
                                filteredSales.map(sale => (
                                    <tr key={sale.id}>
                                        <td>
                                            <Link to={`/u/artworks/edit/${sale.artwork_id}`} className="flex items-center gap-4 text-link">
                                                <img src={sale.artworks.image_url || 'https://placehold.co/50x50?text=No+Image'} alt={sale.artworks.title || 'Artwork'} className="table-thumbnail" />
                                                <span>{sale.artworks.title}</span>
                                            </Link>
                                        </td>
                                        <td>{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}</td>
                                        <td>
                                            {sale.collector?.id ? (
                                                <Link to={`/u/contacts/edit/${sale.collector_id}`} className="text-link">
                                                    {sale.collector.full_name}
                                                </Link>
                                            ) : (
                                                <span>{sale.collector?.full_name || 'N/A'}</span>
                                            )}
                                        </td>
                                        <td className="text-right font-semibold">{formatCurrency(sale.sale_price)}</td>
                                        <td className="text-center">
                                            {(sale as any).digital_coa_url ? (
                                                <a href={(sale as any).digital_coa_url} target="_blank" rel="noopener noreferrer" className="button button-icon-secondary" title="View Digital Certificate">
                                                    <Download size={16} />
                                                </a>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">Physical CoA</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : <tr><td colSpan={5} className="text-center py-8 empty-state-message">No sales found in this date range.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div className="dashboard-section">
                    <h3 className="section-title">Shipping Status Tracking</h3>
                    <p className="text-muted-foreground">Integrate with shipping APIs to track your sold artworks directly from the dashboard.</p>
                    <div className="feature-coming-soon-card">
                        <Ship size={36} />
                        <span>Connect with Shippo, EasyPost, and more. <br/> (Coming Soon)</span>
                        <Link to="/u/settings/integrations" className="button button-secondary button-sm mt-2">Manage Integrations</Link>
                    </div>
                </div>
                <div className="dashboard-section">
                    <h3 className="section-title">Profit Tracking</h3>
                    <p className="text-muted-foreground">Input material costs for artworks to calculate gross and net profit per sale.</p>
                     <div className="feature-coming-soon-card">
                        <PiggyBank size={36} />
                        <span>Automatically calculate profit margins on each sale. <br/> (Coming Soon)</span>
                        <Link to="/u/artworks" className="button button-secondary button-sm mt-2">Add Artwork Costs</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesPage;