import { Helmet } from 'react-helmet-async'
import { useState } from 'react'
import { http } from '@/services/http'

export default function Sell() {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [image, setImage] = useState<File | null>(null)

  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>Sell | Force Lite</title>
      </Helmet>
      <h1>List Your Artwork</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const form = new FormData()
          form.set('title', title)
          form.set('priceCents', String(Math.round(Number(price || 0) * 100)))
          if (image) form.set('image', image)
          const res = await http.post('/artworks', form, { headers: { 'Content-Type': 'multipart/form-data' } })
          alert(`Submitted ${res.data.artwork.title}`)
        }}
        style={{ display: 'grid', gap: 12, maxWidth: 480 }}
      >
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
        <button type="submit">Submit</button>
      </form>
    </div>
  )
}

