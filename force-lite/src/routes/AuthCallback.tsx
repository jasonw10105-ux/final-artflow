import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        // If deep link includes tokens, supabase-js will handle; wait a tick
        setTimeout(async () => {
          const { data } = await supabase.auth.getUser()
          if (data.user) handlePostAuth()
          else navigate('/auth', { replace: true })
        }, 500)
      } else handlePostAuth()
    })()
    async function handlePostAuth() {
      // Redirect to onboarding if missing profile fields
      navigate('/onboarding', { replace: true })
    }
  }, [navigate])
  return <div style={{ padding: 24 }}>Signing you in…</div>
}

