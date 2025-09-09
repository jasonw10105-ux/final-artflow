import { Router } from 'express'
import { supabase } from '../../src/server/supabase'
import { requireAuth, getUserIdFromRequest } from '../middleware/auth'

const router = Router()

router.get('/recs/for-collector', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    // Simple candidate generation by preferred mediums/styles and budget
    const { data: prefs } = await supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle()
    let q = supabase.from('artworks').select('id,title,price,primary_image_url,genre,medium').eq('status','available')
    if (prefs?.preferred_mediums?.length) q = q.in('medium', prefs.preferred_mediums as any)
    if (prefs?.preferred_styles?.length) q = q.in('genre', prefs.preferred_styles as any)
    if (prefs?.max_budget) q = q.lte('price', prefs.max_budget as any)
    const { data } = await q.order('created_at', { ascending: false }).limit(48)
    res.json({ items: data || [] })
  } catch (e) { next(e) }
})

router.get('/recs/because/:artworkId', async (req, res, next) => {
  try {
    const artworkId = String(req.params.artworkId)
    const { data: a } = await supabase.from('artworks').select('genre,medium,price').eq('id', artworkId).single()
    if (!a) return res.status(404).json({ items: [] })
    const { data } = await supabase
      .from('artworks')
      .select('id,title,price,primary_image_url,genre,medium')
      .neq('id', artworkId)
      .or(`genre.eq.${a.genre},medium.eq.${a.medium}`)
      .order('created_at', { ascending: false })
      .limit(48)
    res.json({ items: data || [] })
  } catch (e) { next(e) }
})

export default router
;

// Vector-based recommendations (if RPC available)
router.get('/recs/vector/:artworkId', async (req, res, next) => {
  try {
    const artworkId = String(req.params.artworkId)
    // Try RPC match_artworks(embedding vector) if configured in DB
    const { data: vectors } = await supabase.rpc('match_similar_artworks', { p_artwork_id: artworkId, p_limit: 48 })
    if (vectors && Array.isArray(vectors)) return res.json({ items: vectors })
    // Fallback to metadata-based
    const { data: a } = await supabase.from('artworks').select('genre,medium,price').eq('id', artworkId).single()
    if (!a) return res.json({ items: [] })
    const { data } = await supabase
      .from('artworks')
      .select('id,title,price,primary_image_url,genre,medium')
      .neq('id', artworkId)
      .or(`genre.eq.${a.genre},medium.eq.${a.medium}`)
      .order('created_at', { ascending: false })
      .limit(48)
    return res.json({ items: data || [] })
  } catch (e) { next(e) }
})

