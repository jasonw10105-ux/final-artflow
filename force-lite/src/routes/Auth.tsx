import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function sendMagicLink() {
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
    if (error) setError(error.message)
    else setSent(true)
  }

  async function signInGoogle() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
    if (error) setError(error.message)
  }

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <Helmet>
        <title>Sign in | Force Lite</title>
      </Helmet>
      <h1>Sign in</h1>
      <div style={{ display: 'grid', gap: 12 }}>
        <input placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button onClick={sendMagicLink} disabled={!email}>Send magic link</button>
        <button onClick={signInGoogle}>Continue with Google</button>
        {sent && <div>Check your inbox for a sign-in link.</div>}
        {error && <div style={{ color: 'tomato' }}>{error}</div>}
      </div>
    </div>
  )
}