import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type Artist = { id: string; name: string | null; slug: string | null }

export default function Artists() {
  const [items, setItems] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id,name,slug')
        .eq('role', 'ARTIST')
        .order('created_at', { ascending: false })
        .limit(100)
      setItems((data as any) || [])
      setLoading(false)
    })()
  }, [])
  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>Artists | Force Lite</title>
      </Helmet>
      <h1>Artists</h1>
      {loading ? <div>Loading…</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {items.map(a => (
            <Link key={a.id} to={`/artist/${a.slug ?? a.id}`} style={{ border: '1px solid #222', padding: 12, borderRadius: 6 }}>
              <div style={{ marginTop: 8 }}>{a.name ?? 'Unnamed artist'}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

