import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function Onboarding() {
  const [name, setName] = useState('')
  const [role, setRole] = useState<'ARTIST' | 'COLLECTOR'>('COLLECTOR')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        navigate('/auth', { replace: true })
      }
    })()
  }, [navigate])

  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>Onboarding | Force Lite</title>
      </Helmet>
      <h1>Complete your profile</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setLoading(true)
          const { data: u } = await supabase.auth.getUser()
          const userId = u.user?.id
          if (!userId) return
          const { error } = await supabase.from('profiles').upsert(
            { id: userId, name, role, slug: slug || null },
            { onConflict: 'id' }
          )
          setLoading(false)
          if (error) {
            alert(error.message)
            return
          }
          navigate('/dashboard', { replace: true })
        }}
        style={{ display: 'grid', gap: 12, maxWidth: 480 }}
      >
        <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
        <select value={role} onChange={(e) => setRole(e.target.value as any)}>
          <option value="COLLECTOR">Collector</option>
          <option value="ARTIST">Artist</option>
        </select>
        <input placeholder="Slug (optional)" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Continue'}</button>
      </form>
    </div>
  )
}

