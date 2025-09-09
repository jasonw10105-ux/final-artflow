import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'

export default function Artist() {
  const { slug } = useParams()
  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>{slug} | Artist | Force Lite</title>
      </Helmet>
      <h1>Artist: {slug}</h1>
      <p>Biography, artworks, and shows will appear here.</p>
    </div>
  )
}

