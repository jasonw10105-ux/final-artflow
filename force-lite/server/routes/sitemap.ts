import { Router } from 'express'
import { supabase } from '../../src/server/supabase'

const router = Router()

router.get('/sitemap.xml', async (_req, res) => {
  const base = ''
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${base}/sitemap-artists.xml</loc></sitemap>\n  <sitemap><loc>${base}/sitemap-artworks.xml</loc></sitemap>\n  <sitemap><loc>${base}/sitemap-catalogues.xml</loc></sitemap>\n</sitemapindex>`
  res.type('application/xml').send(xml)
})

router.get('/sitemap-artists.xml', async (_req, res) => {
  const { data } = await supabase.from('profiles').select('slug').eq('role','ARTIST').not('slug','is',null).limit(5000)
  const urls = (data||[]).map((r:any)=>`<url><loc>/${r.slug}</loc></url>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
  res.type('application/xml').send(xml)
})

router.get('/sitemap-artworks.xml', async (_req, res) => {
  const { data } = await supabase.from('artworks').select('id').limit(5000)
  const urls = (data||[]).map((r:any)=>`<url><loc>/artwork/${r.id}</loc></url>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
  res.type('application/xml').send(xml)
})

router.get('/sitemap-catalogues.xml', async (_req, res) => {
  const { data } = await supabase.from('catalogues').select('id').eq('is_published', true).limit(5000)
  const urls = (data||[]).map((r:any)=>`<url><loc>/catalogue/${r.id}</loc></url>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
  res.type('application/xml').send(xml)
})

export default router

