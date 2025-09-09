import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/lib/supabase'

export default function ArtistSettings() {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [statement, setStatement] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      const id = u.user?.id
      if (!id) return
      const { data } = await supabase.from('profiles').select('name,bio,statement,avatar_url').eq('id', id).single()
      if (data) {
        setName(data.name || '')
        setBio(data.bio || '')
        setStatement(data.statement || '')
        setAvatarUrl(data.avatar_url || '')
      }
    })()
  }, [])

  async function onUploadAvatar(file: File) {
    const { data: u } = await supabase.auth.getUser()
    const id = u.user?.id
    if (!id) return
    const ext = file.name.split('.').pop() || 'jpg'
    const key = `avatars/${id}/${Date.now()}.${ext}`
    const up = await supabase.storage.from('avatars').upload(key, file, { upsert: true })
    if (up.error) { alert(up.error.message); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(key)
    setAvatarUrl(data.publicUrl)
  }

  async function onSave() {
    setSaving(true)
    const { data: u } = await supabase.auth.getUser()
    const id = u.user?.id
    if (!id) return
    const { error } = await supabase.from('profiles').upsert({ id, name, bio, statement, avatar_url: avatarUrl })
    setSaving(false)
    if (error) alert(error.message)
    else alert('Saved')
  }

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Helmet>
        <title>Artist Settings | Force Lite</title>
      </Helmet>
      <h1>Artist Settings</h1>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div>
          <label>Headshot</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {avatarUrl ? <img src={avatarUrl} alt="Headshot" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#222' }} />}
            <input ref={fileRef} type="file" accept="image/*" onChange={(e) => e.target.files && onUploadAvatar(e.target.files[0])} />
          </div>
        </div>
        <div>
          <label>Artist Statement</label>
          <textarea value={statement} onChange={(e) => setStatement(e.target.value)} className="textarea" rows={6} />
        </div>
        <div>
          <label>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="textarea" rows={6} />
        </div>
        <div>
          <button className="button button-primary" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

