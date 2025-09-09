import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
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
      <p style={{ marginTop: 12 }}>Results for "{q}" will appear here.</p>
    </div>
  )
}

