import { Helmet } from 'react-helmet-async'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

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
          const { data: userData } = await supabase.auth.getUser()
          const userId = userData.user?.id
          if (!userId) {
            alert('Please sign in')
            return
          }
          if (!image) {
            alert('Select an image')
            return
          }
          const ext = image.name.split('.').pop() || 'jpg'
          const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          const up = await supabase.storage.from('artworks').upload(path, image, { upsert: true })
          if (up.error) {
            alert(up.error.message)
            return
          }
          const url = supabase.storage.from('artworks').getPublicUrl(path).data.publicUrl
          const { error } = await supabase.from('artworks').insert({
            title,
            price: price ? Number(price) : null,
            user_id: userId,
            primary_image_url: url,
            status: 'available'
          })
          if (error) {
            alert(error.message)
            return
          }
          alert('Submitted')
          setTitle('')
          setPrice('')
          setImage(null)
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

