import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'

export default function Artwork() {
  const { id } = useParams()
  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>Artwork {id} | Force Lite</title>
      </Helmet>
      <h1>Artwork #{id}</h1>
      <p>Details, provenance, and purchase options will appear here.</p>
    </div>
  )
}

