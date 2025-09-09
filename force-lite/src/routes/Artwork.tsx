import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchArtwork } from '@/services/data'
import { useEffectOnce } from '@/utils/useEffectOnce'
import { hasLikedArtwork, likeArtwork, unlikeArtwork, fetchArtworkEditions, recordArtworkView } from '@/services/actions'
import { supabase } from '@/lib/supabase'
import { artworkJsonLd } from '@/seo/jsonld'

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
  const [liked, setLiked] = useState(false)
  const [editions, setEditions] = useState<any[]>([])
  useEffectOnce(() => {
    ;(async () => {
      if (!id) return
      try {
        setLiked(await hasLikedArtwork(id))
        setEditions(await fetchArtworkEditions(id))
        const { data } = await supabase.auth.getUser()
        const viewerId = data.user?.id ?? null
        if (art?.user_id) {
          await recordArtworkView({ artworkId: id, artistId: art.user_id, viewerId })
        }
      } catch {}
    })()
  })
  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>{art?.title ?? `Artwork ${id}`} | Force Lite</title>
        {art && (
          <script type="application/ld+json">{JSON.stringify(artworkJsonLd({ title: art.title, image: art.primary_image_url, price: art.price ?? null, artistName: art.artist_name }))}</script>
        )}
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
          <div style={{ marginTop: 12 }}>
            <button onClick={async () => { try { liked ? await unlikeArtwork(id!) : await likeArtwork(id!); setLiked(!liked) } catch (e) { alert(String(e)) } }}>
              {liked ? '♥ Liked' : '♡ Like'}
            </button>
          </div>
          {editions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>Editions</h3>
              <ul>
                {editions.map((e: any) => (
                  <li key={e.id}>{e.label} {e.sale_number ? `#${e.sale_number}` : ''} {e.price != null ? `- ${e.price}` : ''} {e.sold ? '(Sold)' : ''}</li>
                ))}
              </ul>
            </div>
          )}
          {art.description && <p style={{ marginTop: 8 }}>{art.description}</p>}
        </div>
      ) : (
        <div>Not found</div>
      )}
    </div>
  )
}

