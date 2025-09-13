import { Router } from 'express'
import { supabase } from '../../src/server/supabase'
import { requireAuth, getUserIdFromRequest } from '../middleware/auth'
import { namePalette, groupByColorFamily } from '../../src/services/color'

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
// Similar by palette & metadata
router.get('/recs/similar/:artworkId', async (req, res, next) => {
  try {
    const artworkId = String(req.params.artworkId)
    const { data: a } = await supabase.from('artworks').select('id,genre,medium,dominant_colors').eq('id', artworkId).single()
    if (!a) return res.json({ items: [] })
    const aNames = namePalette(a.dominant_colors || []).map(n => n.name)
    const aSet = new Set(aNames)

    const { data: pool } = await supabase
      .from('artworks')
      .select('id,title,price,primary_image_url,genre,medium,dominant_colors')
      .neq('id', artworkId)
      .eq('status','available')
      .order('created_at', { ascending: false })
      .limit(400)

    function jaccard(xs: string[], ys: string[]): number {
      const X = new Set(xs), Y = new Set(ys)
      const inter = Array.from(X).filter(x => Y.has(x)).length
      const uni = new Set([...Array.from(X), ...Array.from(Y)]).size
      return uni === 0 ? 0 : inter / uni
    }

    function score(b: any): number {
      const bNames = namePalette(b.dominant_colors || []).map((n) => n.name)
      let s = jaccard(aNames, bNames) * 2.0
      if ((b.genre || '').toLowerCase() === (a.genre || '').toLowerCase()) s += 0.6
      if ((b.medium || '').toLowerCase() === (a.medium || '').toLowerCase()) s += 0.4
      return s
    }

    const ranked = (pool || []).map(b => ({ ...b, score: score(b) }))
      .sort((x, y) => y.score - x.score)
      .slice(0, 24)

    res.json({ items: ranked })
  } catch (e) { next(e) }
})

// Dynamic Auto Grouping: builds themed buckets based on color families, price bands, and genre
router.get('/groups/dynamic', async (_req, res, next) => {
  try {
    const { data: recent } = await supabase
      .from('artworks')
      .select('id,title,price,primary_image_url,genre,dominant_colors')
      .eq('status','available')
      .order('created_at', { ascending: false })
      .limit(200)

    const items = (recent || []).map(a => ({
      ...a,
      color_names: namePalette(a.dominant_colors || []).map(n => n.name),
      color_families: groupByColorFamily(a.dominant_colors || []),
      price_band: a.price == null ? 'unknown' : a.price < 1000 ? '<$1k' : a.price < 5000 ? '$1k–$5k' : a.price < 20000 ? '$5k–$20k' : '$20k+'
    }))

    const group = (label: string, filter: (x: any) => boolean) => ({ label, items: items.filter(filter).slice(0, 24) })

    const groups = [
      group('Calming Blues', x => x.color_names.includes('blue') || x.color_names.includes('sky') || x.color_names.includes('indigo')),
      group('Warm & Earthy', x => x.color_families.includes('warm')),
      group('Minimal Neutrals', x => x.color_families.includes('neutral')),
      group('Under $1,000', x => x.price_band === '<$1k'),
      group('Statement Pieces $5k–$20k', x => x.price_band === '$5k–$20k'),
      group('Abstract Now', x => (x.genre || '').toLowerCase().includes('abstract')),
      group('Figurative Focus', x => (x.genre || '').toLowerCase().includes('figurative')),
    ].filter(g => g.items.length > 0)

    res.json({ groups })
  } catch (e) { next(e) }
})

// Serendipity: resurfacing recently added and near-preference but slightly outside comfort zone
router.get('/recs/serendipity', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const { data: prefs } = await supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle()

    const { data: pool } = await supabase
      .from('artworks')
      .select('id,title,price,primary_image_url,genre,medium,dominant_colors')
      .eq('status','available')
      .order('created_at', { ascending: false })
      .limit(200)

    const preferStyles = new Set<string>((prefs?.preferred_styles || []).map((s: string) => String(s).toLowerCase()))
    const preferMediums = new Set<string>((prefs?.preferred_mediums || []).map((s: string) => String(s).toLowerCase()))

    function score(a: any): number {
      let s = 0
      const genre = (a.genre || '').toLowerCase()
      const medium = (a.medium || '').toLowerCase()
      if (preferStyles.has(genre)) s += 2
      if (preferMediums.has(medium)) s += 1
      // bonus for cool-to-warm transition to promote exploration
      const fams = groupByColorFamily(a.dominant_colors || [])
      if (fams.includes('cool')) s += 0.4
      if (fams.includes('warm')) s += 0.4
      // slight randomization for serendipity
      s += Math.random() * 0.5
      return s
    }

    const ranked = (pool || []).map(a => ({ ...a, score: score(a) }))
      .sort((x, y) => y.score - x.score)
      .slice(0, 30)

    res.json({ items: ranked })
  } catch (e) { next(e) }
})


