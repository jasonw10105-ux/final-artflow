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
    const items = (data || []).map((a: any) => {
      const reasons: string[] = []
      if (prefs?.preferred_styles?.includes(a.genre)) reasons.push(`Matches your style: ${a.genre}`)
      if (prefs?.preferred_mediums?.includes(a.medium)) reasons.push(`Medium match: ${a.medium}`)
      if (prefs?.max_budget && a.price && a.price <= prefs.max_budget) reasons.push('Within your budget')
      return { ...a, reasons }
    })
    res.json({ items })
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
// Personalized re-ranker (heuristic)
router.get('/recs/personalized', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const { data: prefs } = await supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle()

    const { data: pool } = await supabase
      .from('artworks')
      .select('id,user_id,title,price,primary_image_url,genre,medium,dominant_colors')
      .eq('status','available')
      .order('created_at', { ascending: false })
      .limit(300)

    const wPalette = Number(req.query.wPalette || 1.0)
    const wGenre = Number(req.query.wGenre || 0.7)
    const wMedium = Number(req.query.wMedium || 0.5)
    const wBudget = Number(req.query.wBudget || 0.6)

    const palettePref = String(req.query.palettePref || '').toLowerCase()
    const maxBudget = req.query.maxBudget ? Number(req.query.maxBudget) : (prefs?.max_budget || undefined)

    function s(a: any) {
      let score = 0
      const fams = groupByColorFamily(a.dominant_colors || [])
      if (palettePref && fams.includes(palettePref)) score += 1 * wPalette
      if (prefs?.preferred_styles?.includes(a.genre)) score += 1 * wGenre
      if (prefs?.preferred_mediums?.includes(a.medium)) score += 1 * wMedium
      if (maxBudget && a.price && a.price <= maxBudget) score += 1 * wBudget
      return score
    }

    const ranked = (pool || []).map(a => ({ ...a, score: s(a) }))
      .sort((x, y) => y.score - x.score)

    const used = new Map<string, number>()
    const out: any[] = []
    for (const a of ranked) {
      const k = String(a.user_id || 'unknown')
      const c = used.get(k) || 0
      if (c >= 1) continue
      used.set(k, c + 1)
      const reasons: string[] = []
      const fams = groupByColorFamily(a.dominant_colors || [])
      if (palettePref && fams.includes(palettePref)) reasons.push(`Palette: ${palettePref}`)
      if (prefs?.preferred_styles?.includes(a.genre)) reasons.push(`Your style: ${a.genre}`)
      if (prefs?.preferred_mediums?.includes(a.medium)) reasons.push(`Your medium: ${a.medium}`)
      if (maxBudget && a.price && a.price <= maxBudget) reasons.push('Within budget')
      out.push({ ...a, reasons })
      if (out.length >= 48) break
    }

    res.json({ items: out })
  } catch (e) { next(e) }
})

// Refine endpoint: parse free-text preferences into query weights (naive v1)
router.post('/recs/refine', async (req, res, next) => {
  try {
    const chunks: Buffer[] = []
    for await (const ch of req) chunks.push(ch)
    const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { text: string }
    const t = (body.text || '').toLowerCase()
    const out: Record<string, any> = {}
    if (/warm|earthy|red|orange|yellow/.test(t)) out.paletteBias = 'warm'
    if (/cool|blue|green|teal|cyan/.test(t)) out.paletteBias = 'cool'
    if (/neutral|minimal|black|white|gray/.test(t)) out.paletteBias = 'neutral'
    if (/abstract|minimal|non-?objective/.test(t)) out.style = 'abstract'
    if (/figurative|portrait|figure|human/.test(t)) out.style = 'figurative'
    const priceMatch = /under\s*\$?(\d+[\d,]*)|\$?(\d+[\d,]*)\s*max/.exec(t)
    if (priceMatch) {
      const raw = priceMatch[1] || priceMatch[2]
      if (raw) out.maxPrice = Number(String(raw).replace(/,/g, ''))
    }
    res.json({ params: out })
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

    const ranked = (pool || []).map(b => {
      const bNames = namePalette(b.dominant_colors || []).map(n => n.name)
      const paletteOverlap = jaccard(aNames, bNames)
      const genreMatch = (b.genre || '').toLowerCase() === (a.genre || '').toLowerCase()
      const mediumMatch = (b.medium || '').toLowerCase() === (a.medium || '').toLowerCase()
      const scoreVal = score(b)
      const reasons: string[] = []
      if (paletteOverlap > 0) reasons.push(`Palette overlap ${(paletteOverlap*100).toFixed(0)}%`)
      if (genreMatch && a.genre) reasons.push(`Same genre: ${a.genre}`)
      if (mediumMatch && a.medium) reasons.push(`Same medium: ${a.medium}`)
      return { ...b, score: scoreVal, reasons }
    })
      .sort((x, y) => y.score - x.score)
      .slice(0, 24)

    res.json({ items: ranked })
  } catch (e) { next(e) }
})

// Dynamic Auto Grouping: builds themed buckets based on color families, price bands, and genre
router.get('/groups/dynamic', async (req, res, next) => {
  try {
    const paletteBias = String(req.query.paletteBias || '').toLowerCase()
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined
    const styleBias = String(req.query.style || '').toLowerCase()

    const { data: recent } = await supabase
      .from('artworks')
      .select('id,user_id,title,price,primary_image_url,genre,dominant_colors')
      .eq('status','available')
      .order('created_at', { ascending: false })
      .limit(200)

    const items = (recent || []).map(a => ({
      ...a,
      color_names: namePalette(a.dominant_colors || []).map(n => n.name),
      color_families: groupByColorFamily(a.dominant_colors || []),
      price_band: a.price == null ? 'unknown' : a.price < 1000 ? '<$1k' : a.price < 5000 ? '$1k–$5k' : a.price < 20000 ? '$5k–$20k' : '$20k+'
    }))

    const prefFilter = (x: any) => {
      if (maxPrice && typeof x.price === 'number' && x.price > maxPrice) return false
      if (paletteBias && !(x.color_families || []).includes(paletteBias)) return false
      if (styleBias && !(String(x.genre || '').toLowerCase().includes(styleBias))) return false
      return true
    }

    function diversify(list: any[], perArtist = 1, limit = 24) {
      const used = new Map<string, number>()
      const out: any[] = []
      for (const a of list) {
        const k = String(a.user_id || 'unknown')
        const c = used.get(k) || 0
        if (c >= perArtist) continue
        used.set(k, c + 1)
        out.push(a)
        if (out.length >= limit) break
      }
      return out
    }

    const group = (label: string, filter: (x: any) => boolean) => {
      const pool = items.filter(x => prefFilter(x) && filter(x))
      const withReasons = pool.map(x => {
        const reasons: string[] = []
        if (paletteBias && x.color_families.includes(paletteBias)) reasons.push(`Palette: ${paletteBias}`)
        if (styleBias && String(x.genre || '').toLowerCase().includes(styleBias)) reasons.push(`Style: ${x.genre}`)
        if (maxPrice && x.price && x.price <= maxPrice) reasons.push('Within budget')
        if (!reasons.length) reasons.push('Great fit for this theme')
        return { ...x, reasons }
      })
      return { label, items: diversify(withReasons, 1, 24) }
    }

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
    const used = new Set<string>()
    const diversified = [] as any[]
    for (const a of ranked) {
      const k = String(a.user_id || 'unknown')
      if (used.has(k)) continue
      used.add(k)
      const reasons = [] as string[]
      const fams = groupByColorFamily(a.dominant_colors || [])
      if (fams.includes('cool')) reasons.push('Cool palette')
      if (fams.includes('warm')) reasons.push('Warm palette')
      if ((a.genre || '') && prefs?.preferred_styles?.includes(a.genre)) reasons.push(`Near your style: ${a.genre}`)
      if ((a.medium || '') && prefs?.preferred_mediums?.includes(a.medium)) reasons.push(`Medium you like: ${a.medium}`)
      diversified.push({ ...a, reasons })
      if (diversified.length >= 30) break
    }

    res.json({ items: diversified })
  } catch (e) { next(e) }
})


