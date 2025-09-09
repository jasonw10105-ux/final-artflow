import { Router } from 'express'
import PDFDocument from 'pdfkit'
import { supabase } from '../../src/server/supabase'
import { requireAuth, getUserIdFromRequest } from '../middleware/auth'

const router = Router()

async function fetchArtistArtworks(artistId: string) {
  const { data, error } = await supabase
    .from('artworks')
    .select('id, title, price, status, medium, genre, dimensions, primary_image_url, created_at')
    .eq('user_id', artistId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

router.get('/reports/inventory.pdf', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const artworks = await fetchArtistArtworks(userId)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="inventory.pdf"')
    const doc = new PDFDocument({ size: 'A4', margin: 48 })
    doc.pipe(res)
    doc.fontSize(20).text('Inventory Report', { underline: true })
    doc.moveDown()
    artworks.forEach((a: any, idx: number) => {
      doc.fontSize(12).text(`${idx + 1}. ${a.title || 'Untitled'}`)
      const details = [a.medium, a.genre].filter(Boolean).join(' · ')
      if (details) doc.fillColor('#666').text(details)
      doc.fillColor('#000').text(`Price: ${a.price != null ? a.price : 'N/A'} · Status: ${a.status}`)
      doc.moveDown(0.75)
    })
    doc.end()
  } catch (e) { next(e) }
})

router.get('/reports/inventory.csv', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const artworks = await fetchArtistArtworks(userId)
    const headers = ['Title','Price','Status','Medium','Genre','CreatedAt']
    const rows = artworks.map((a: any) => [a.title || '', a.price ?? '', a.status || '', a.medium || '', a.genre || '', a.created_at || ''])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => typeof v === 'string' ? JSON.stringify(v) : v).join(','))].join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"')
    res.end(csv)
  } catch (e) { next(e) }
})

router.get('/reports/consignment.pdf', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const artworkId = String(req.query.artworkId || '')
    if (!artworkId) return res.status(400).json({ error: 'artworkId required' })
    const { data: a, error } = await supabase
      .from('artworks')
      .select('id,title,price,dimensions,medium,genre,provenance,created_at')
      .eq('id', artworkId)
      .eq('user_id', userId)
      .single()
    if (error) throw error
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="consignment.pdf"')
    const doc = new PDFDocument({ size: 'A4', margin: 48 })
    doc.pipe(res)
    doc.fontSize(20).text('Consignment Sheet', { underline: true })
    doc.moveDown()
    doc.fontSize(12).text(`Title: ${a?.title || 'Untitled'}`)
    doc.text(`Price: ${a?.price ?? 'N/A'}`)
    doc.text(`Medium: ${a?.medium || ''}`)
    doc.text(`Genre: ${a?.genre || ''}`)
    doc.text(`Dimensions: ${a?.dimensions ? JSON.stringify(a.dimensions) : ''}`)
    doc.text(`Provenance: ${a?.provenance || ''}`)
    doc.end()
  } catch (e) { next(e) }
})

router.get('/reports/labels.pdf', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const artworks = await fetchArtistArtworks(userId)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="labels.pdf"')
    const doc = new PDFDocument({ size: 'LETTER', margins: { top: 36, left: 36, right: 36, bottom: 36 } })
    doc.pipe(res)
    const cols = 3, rows = 10
    const labelW = (612 - 72) / cols
    const labelH = (792 - 72) / rows
    let i = 0
    artworks.slice(0, cols * rows).forEach((a: any) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = 36 + col * labelW
      const y = 36 + row * labelH
      doc.rect(x + 4, y + 4, labelW - 8, labelH - 8).stroke('#CCC')
      doc.fontSize(10).text(a.title || 'Untitled', x + 12, y + 12, { width: labelW - 24 })
      doc.text(a.medium || '', { width: labelW - 24 })
      doc.text(a.genre || '', { width: labelW - 24 })
      i++
    })
    doc.end()
  } catch (e) { next(e) }
})

export default router

