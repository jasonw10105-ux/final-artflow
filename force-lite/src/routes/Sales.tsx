import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subMonths } from 'date-fns'
import toast from 'react-hot-toast'

interface AppSale {
  id: string
  sale_price: number
  sale_date: string | null
  artwork_id: string
  digital_coa_url?: string | null
  collector_id: string
  artworks: { title: string | null; image_url: string | null }
  collector?: { id: string; full_name: string | null }
}

interface MonthlyRevenue { month_name: string; total_revenue: number }

const fetchSalesData = async (artistId: string): Promise<AppSale[]> => {
  const { data, error } = await supabase
    .from('sales')
    .select(`*, digital_coa_url, artworks ( id, title, artwork_images(image_url, is_primary, position) ), collector:profiles!sales_collector_id_fkey ( id, full_name )`)
    .eq('artist_id', artistId)
    .order('sale_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as any).map((sale: any) => ({
    ...sale,
    artworks: {
      title: sale.artworks?.title ?? null,
      image_url: sale.artworks?.artwork_images?.find((i: any) => i.is_primary)?.image_url || sale.artworks?.artwork_images?.[0]?.image_url || null,
    }
  }))
}

const fetchMonthlyRevenue = async (artistId: string): Promise<MonthlyRevenue[]> => {
  const { data, error } = await supabase.rpc('get_monthly_sales_revenue', { p_artist_id: artistId })
  if (error) throw new Error(error.message)
  return data || []
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-card border border-border rounded-md shadow-lg">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-muted-foreground">Revenue: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function SalesPage() {
  const [artistId, setArtistId] = useState<string | null>(null)
  React.useEffect(() => { (async () => { const { data } = await supabase.auth.getUser(); setArtistId(data.user?.id ?? null) })() }, [])
  const [dateRange, setDateRange] = useState({ from: format(subMonths(new Date(), 1), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') })

  const { data: sales = [], isLoading: isLoadingSales } = useQuery<AppSale[], Error>({ queryKey: ['sales', artistId], queryFn: () => fetchSalesData(artistId!), enabled: !!artistId })
  const { data: monthlyRevenue = [], isLoading: isLoadingChart } = useQuery<MonthlyRevenue[], Error>({ queryKey: ['monthlyRevenue', artistId], queryFn: () => fetchMonthlyRevenue(artistId!), enabled: !!artistId })

  const filteredSales = useMemo(() => {
    if (!sales) return []
    try {
      const fromDate = new Date(dateRange.from)
      const toDate = new Date(dateRange.to)
      toDate.setHours(23, 59, 59, 999)
      return sales.filter(sale => {
        const saleDate = sale.sale_date ? new Date(sale.sale_date) : new Date(0)
        return saleDate >= fromDate && saleDate <= toDate
      })
    } catch { return sales }
  }, [sales, dateRange])

  const stats = useMemo(() => {
    if (!sales) return { totalRevenue: 0, totalSales: 0, uniqueCollectors: 0, averageSalePrice: 0 }
    const totalRevenue = sales.reduce((acc, s) => acc + (s.sale_price ?? 0), 0)
    const uniqueCollectors = new Set(sales.map(s => s.collector_id)).size
    const totalSales = sales.length
    const averageSalePrice = totalSales > 0 ? totalRevenue / totalSales : 0
    return { totalRevenue, totalSales, uniqueCollectors, averageSalePrice }
  }, [sales])

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const handleExport = () => {
    if (!filteredSales || filteredSales.length === 0) { toast.error('No data to export for the selected range.'); return }
    const headers = ['Artwork Title','Date Sold','Collector Name','Sale Price (USD)','CoA URL']
    const rows = filteredSales.map(s => [JSON.stringify(s.artworks.title || ''), s.sale_date ? new Date(s.sale_date).toLocaleDateString() : '', JSON.stringify(s.collector?.full_name || 'N/A'), s.sale_price, (s as any).digital_coa_url || 'Physical'])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a'); const url = URL.createObjectURL(blob)
    link.setAttribute('href', url); link.setAttribute('download', `sales_report_${dateRange.from}_to_${dateRange.to}.csv`)
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
    toast.success('Sales report downloaded!')
  }

  return (
    <div className="page-container">
      <h1>Sales Overview</h1>
      <p className="page-subtitle">Track your artwork sales and revenue performance.</p>

      <div className="kpi-grid mb-8">
        <Stat title="Total Revenue" value={formatCurrency(stats.totalRevenue)} />
        <Stat title="Artworks Sold" value={String(stats.totalSales)} />
        <Stat title="Unique Collectors" value={String(stats.uniqueCollectors)} />
        <Stat title="Avg. Sale Price" value={formatCurrency(stats.averageSalePrice)} />
      </div>

      <div className="dashboard-section">
        <h3 className="section-title">Sales Trends (Last 12 Months)</h3>
        {isLoadingChart ? <p className="loading-message">Loading chart...</p> : monthlyRevenue.length > 0 ? (
          <div className="w-full h-72 bg-card p-4 rounded-md border border-border">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month_name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v as number / 1000)}k`} />
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
            <input type="date" className="input" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} />
            <span className="text-muted-foreground">to</span>
            <input type="date" className="input" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} />
            <button onClick={handleExport} className="button button-secondary button-with-icon">Export CSV</button>
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
                      <img src={sale.artworks.image_url || ''} alt={sale.artworks.title || 'Artwork'} className="table-thumbnail" />
                      <span>{sale.artworks.title}</span>
                    </Link>
                  </td>
                  <td>{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}</td>
                  <td>{sale.collector?.full_name || 'N/A'}</td>
                  <td className="text-right font-semibold">{formatCurrency(sale.sale_price)}</td>
                  <td className="text-center">{sale.digital_coa_url ? <a href={sale.digital_coa_url} target="_blank" rel="noopener noreferrer">View</a> : <span className="text-xs text-muted-foreground italic">Physical CoA</span>}</td>
                </tr>
              ))
            ) : <tr><td colSpan={5} className="text-center py-8 empty-state-message">No sales found in this date range.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="stat-card">
      <div>
        <p className="stat-title">{title}</p>
        <h3 className="stat-value">{value}</h3>
      </div>
    </div>
  )
}

