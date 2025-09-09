import { Helmet } from 'react-helmet-async'
import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchArtistBySlug, fetchArtworksByUser, type ArtworkRow } from '@/services/data'
import { artistJsonLd } from '@/seo/jsonld'

export default function Artist() {
  const { slug } = useParams()
  const [artist, setArtist] = useState<{ id: string; slug: string; name: string } | null>(null)
  const [works, setWorks] = useState<ArtworkRow[]>([])
  useEffect(() => {
    if (!slug) return
    ;(async () => {
      try {
        const a = await fetchArtistBySlug(slug)
        setArtist(a)
        const w = await fetchArtworksByUser(a.id)
        setWorks(w)
      } catch {}
    })()
  }, [slug])
  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>{artist?.name ?? slug} | Artist | Force Lite</title>
        {artist && (
          <script type="application/ld+json">{JSON.stringify(artistJsonLd({ name: artist.name, slug: artist.slug }))}</script>
        )}
      </Helmet>
      <h1>{artist?.name ?? slug}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginTop: 16 }}>
        {works.map((a) => (
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

