import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/lib/supabase'

type QuizItem = { id: string; title: string | null; price: number | null; primary_image_url: string | null; medium: string | null; genre: string | null; subject: string | null; dominant_colors: string[] | null }

export default function CollectorQuiz() {
  const [items, setItems] = useState<QuizItem[]>([])
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [idx, setIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('artworks')
        .select('id,title,price,primary_image_url,medium,genre,subject,dominant_colors')
        .order('created_at', { ascending: false })
        .limit(50)
      const sample = shuffle((data as any) || []).slice(0, 10)
      setItems(sample)
    })()
  }, [])

  async function submit() {
    setSubmitting(true)
    const { data: u } = await supabase.auth.getUser()
    const userId = u.user?.id
    if (!userId) return
    const liked = items.filter(i => answers[i.id])
    const disliked = items.filter(i => answers[i.id] === false)
    const prefs = summarize(liked, disliked)
    await supabase.from('user_preferences').upsert({ user_id: userId, learned_preferences: prefs })
    setSubmitting(false)
    alert('Thanks! Preferences seeded.')
  }

  const current = items[idx]
  return (
    <div style={{ padding: 24 }}>
      <Helmet>
        <title>Collector Quiz | Force Lite</title>
      </Helmet>
      <h1>Tell us what you like</h1>
      {current ? (
        <div style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
          {current.primary_image_url && (
            <img src={current.primary_image_url} alt={current.title ?? 'Artwork'} style={{ width: '100%', borderRadius: 8 }} />
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="button" onClick={() => { setAnswers(a => ({ ...a, [current.id]: true })); setIdx(i => i + 1) }}>Yes</button>
            <button className="button" onClick={() => { setAnswers(a => ({ ...a, [current.id]: false })); setIdx(i => i + 1) }}>No</button>
          </div>
          <div>{idx + 1} / 10</div>
        </div>
      ) : (
        <div>
          <p>All done.</p>
          <button className="button button-primary" onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
        </div>
      )}
    </div>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function summarize(liked: QuizItem[], disliked: QuizItem[]) {
  const topMediums = tally(liked.map(i => i.medium).filter(Boolean) as string[])
  const topGenres = tally(liked.map(i => i.genre).filter(Boolean) as string[])
  const budgets = liked.map(i => i.price || 0).filter(Boolean)
  const range = budgets.length ? { min: Math.min(...budgets), max: Math.max(...budgets) } : undefined
  return {
    top_liked_mediums: Object.entries(topMediums).map(([name, count]) => ({ name, count })),
    top_liked_styles: Object.entries(topGenres).map(([name, count]) => ({ name, count })),
    preferred_price_range_from_behavior: range ? { min: range.min, max: range.max } : undefined,
    negative_preferences: {
      disliked_mediums: Object.keys(tally(disliked.map(i => i.medium).filter(Boolean) as string[])),
      disliked_styles: Object.keys(tally(disliked.map(i => i.genre).filter(Boolean) as string[])),
    }
  }
}

function tally(items: string[]) {
  return items.reduce((acc: Record<string, number>, k) => { acc[k] = (acc[k] || 0) + 1; return acc }, {})
}

