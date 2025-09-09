import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchArtwork } from '@/services/data'

export default function Artwork() {
  const { id } = useParams()
  const [art, setArt] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const a = await fetchArtwork(id)
        setArt(a)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])
  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>{art?.title ?? `Artwork ${id}`} | Force Lite</title>
      </Helmet>
      {loading ? (
        <div>Loading…</div>
      ) : art ? (
        <div>
          {art.primary_image_url && (
            <img src={art.primary_image_url} alt={art.title ?? 'Artwork'} style={{ width: '100%', maxWidth: 960, borderRadius: 6 }} />
          )}
          <h1 style={{ marginTop: 16 }}>{art.title ?? 'Untitled'}</h1>
          {art.price != null && <div>Price: {art.price}</div>}
          {art.description && <p style={{ marginTop: 8 }}>{art.description}</p>}
        </div>
      ) : (
        <div>Not found</div>
      )}
    </div>
  )
}

