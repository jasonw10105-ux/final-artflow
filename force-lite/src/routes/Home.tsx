import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>Home | Force Lite</title>
      </Helmet>
      <h1>Discover Art</h1>
      <p>Explore artists, artworks, auctions, and more.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Link key={i} to={`/artwork/${i + 1}`} style={{ border: '1px solid #222', padding: 12, borderRadius: 6 }}>
            <div style={{ background: '#222', height: 160, borderRadius: 4 }} />
            <div style={{ marginTop: 8 }}>Artwork #{i + 1}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

