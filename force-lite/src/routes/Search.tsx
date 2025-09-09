import { Helmet } from 'react-helmet-async'
import { useSearchParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { searchArtworks, type ArtworkRow } from '@/services/data'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [items, setItems] = useState<ArtworkRow[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const data = await searchArtworks(q)
        setItems(data)
      } finally {
        setLoading(false)
      }
    })()
  }, [q])
  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>Search | Force Lite</title>
      </Helmet>
      <h1>Search</h1>
      <input
        value={q}
        onChange={(e) => setParams({ q: e.target.value })}
        placeholder="Search artists, artworks, galleries…"
        style={{ padding: 8, width: '100%', maxWidth: 480 }}
      />
      {loading && <div style={{ marginTop: 12 }}>Loading…</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginTop: 16 }}>
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

