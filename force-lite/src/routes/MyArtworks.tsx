import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'

type Artwork = { id: string; title: string | null; primary_image_url: string | null }

export default function MyArtworks() {
  const [items, setItems] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) {
        setItems([])
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('artworks')
        .select('id,title,primary_image_url')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (!error) setItems((data as any) || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>My Artworks | Force Lite</title>
      </Helmet>
      <h1>My Artworks</h1>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {items.map(a => (
            <Link key={a.id} to={`/artwork/${a.id}`} style={{ border: '1px solid #222', padding: 12, borderRadius: 6 }}>
              {a.primary_image_url ? (
                <img src={a.primary_image_url} alt={a.title ?? 'Artwork'} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 4 }} />
              ) : (
                <div style={{ background: '#222', height: 160, borderRadius: 4 }} />
              )}
              <div style={{ marginTop: 8 }}>{a.title ?? 'Untitled'}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

