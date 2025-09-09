import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { http } from '@/services/http'

type User = { id: string; email: string; role: 'artist' | 'collector' | 'admin'; name?: string }

export default function Dashboard() {
  const [me, setMe] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    (async () => {
      try {
        const res = await http.get('/auth/me')
        setMe(res.data.user)
      } catch {
        setMe(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>Dashboard | Force Lite</title>
      </Helmet>
      {loading ? (
        <div>Loading…</div>
      ) : !me ? (
        <div>Please sign in</div>
      ) : me.role === 'artist' ? (
        <ArtistDashboard me={me} />)
      : (
        <CollectorDashboard me={me} />
      )}
    </div>
  )
}

function ArtistDashboard({ me }: { me: User }) {
  return (
    <div>
      <h1>Artist Dashboard</h1>
      <p>Welcome, {me.name || me.email}</p>
      <ul>
        <li>My listings</li>
        <li>Sales</li>
        <li>Insights</li>
      </ul>
    </div>
  )
}

function CollectorDashboard({ me }: { me: User }) {
  return (
    <div>
      <h1>Collector Dashboard</h1>
      <p>Welcome, {me.name || me.email}</p>
      <ul>
        <li>Saved artworks</li>
        <li>Orders</li>
        <li>Recommendations</li>
      </ul>
    </div>
  )
}

