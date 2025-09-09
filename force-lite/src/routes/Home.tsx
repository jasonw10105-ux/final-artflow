import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchArtworks, type ArtworkRow } from '@/services/data'

export default function Home() {
  const [items, setItems] = useState<ArtworkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    ;(async () => {
      try {
        const data = await fetchArtworks()
        setItems(data)
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [])
  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>Home | Force Lite</title>
      </Helmet>
      <h1>Discover Art</h1>
      {loading && <div>Loading…</div>}
      {error && <div style={{ color: 'tomato' }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {items.map((a) => (
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
    </div>
  )
}

