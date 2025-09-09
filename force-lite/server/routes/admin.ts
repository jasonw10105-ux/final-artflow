import { Router } from 'express'
import { supabase } from '../../src/server/supabase'
import { requireAuth, getUserIdFromRequest } from '../middleware/auth'

const router = Router()

// Recompute learned preferences for the current user (can be scheduled externally)
router.post('/admin/recompute-learned', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const [{ data: likes }, { data: views }, { data: sales }] = await Promise.all([
      supabase.from('artwork_reactions').select('artwork_id').eq('collector_id', userId).eq('reaction_type','like'),
      supabase.from('artwork_views').select('artwork_id').eq('viewer_id', userId),
      supabase.from('sales').select('artwork_id'),
    ])
    const artworkIds = Array.from(new Set([...(likes||[]).map((r:any)=>r.artwork_id), ...(views||[]).map((v:any)=>v.artwork_id), ...(sales||[]).map((s:any)=>s.artwork_id)]))
    const { data: arts } = await supabase.from('artworks').select('medium,genre,price').in('id', artworkIds)
    const mediums = tally((arts||[]).map((a:any)=>a.medium).filter(Boolean))
    const styles = tally((arts||[]).map((a:any)=>a.genre).filter(Boolean))
    const prices = (arts||[]).map((a:any)=>a.price).filter((n:any)=>typeof n==='number')
    const learned = {
      top_liked_mediums: entries(mediums),
      top_liked_styles: entries(styles),
      preferred_price_range_from_behavior: prices.length?{ min: Math.min(...prices), max: Math.max(...prices)}:undefined,
      last_learned_update: new Date().toISOString()
    }
    await supabase.from('user_preferences').upsert({ user_id: userId, learned_preferences: learned })
    res.json({ ok: true, learned })
  } catch (e) { next(e) }
})

function tally(arr: string[]){
  return arr.reduce((acc: Record<string, number>, k) => { acc[k]=(acc[k]||0)+1; return acc }, {})
}
function entries(obj: Record<string, number>){
  return Object.entries(obj).map(([name, count])=>({ name, count }))
}

export default router

