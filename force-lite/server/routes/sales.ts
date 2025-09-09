import { Router } from 'express'
import PDFDocument from 'pdfkit'
import { supabase } from '../../src/server/supabase'
import { requireAuth, getUserIdFromRequest } from '../middleware/auth'

const router = Router()

router.post('/sales/:id/generate-coa', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    const saleId = String(req.params.id)

    // Load sale and verify the requester is the artist
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .select('id, artwork_id, artist_id, collector_id, sale_price, sale_date')
      .eq('id', saleId)
      .single()
    if (saleErr) throw saleErr
    if (!sale) return res.status(404).json({ error: 'Sale not found' })
    if (sale.artist_id !== userId) return res.status(403).json({ error: 'Forbidden' })

    // Load artwork metadata
    const { data: art, error: artErr } = await supabase
      .from('artworks')
      .select('title, medium, genre, dimensions, primary_image_url, user_id')
      .eq('id', sale.artwork_id)
      .single()
    if (artErr) throw artErr

    // Load artist profile
    const { data: artist, error: profErr } = await supabase
      .from('profiles')
      .select('name, full_name, slug')
      .eq('id', sale.artist_id)
      .single()
    if (profErr) throw profErr

    // Build PDF to buffer
    const doc = new PDFDocument({ size: 'A4', margin: 48 })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c))
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))))

    doc.fontSize(20).text('Certificate of Authenticity', { align: 'left', underline: true })
    doc.moveDown()
    doc.fontSize(12).text(`Artist: ${artist?.full_name || artist?.name || ''}`)
    doc.text(`Artwork: ${art?.title || 'Untitled'}`)
    if (art?.medium) doc.text(`Medium: ${art.medium}`)
    if (art?.genre) doc.text(`Genre: ${art.genre}`)
    if (art?.dimensions) doc.text(`Dimensions: ${JSON.stringify(art.dimensions)}`)
    doc.text(`Sale Price: ${sale.sale_price != null ? sale.sale_price : 'N/A'}`)
    doc.text(`Sale Date: ${sale.sale_date ? new Date(sale.sale_date).toISOString().slice(0,10) : 'N/A'}`)
    doc.moveDown()
    doc.text('This document certifies that the artwork listed above is an authentic, original work by the listed artist.', { lineGap: 6 })
    doc.moveDown(2)
    doc.text(`Signed: ____________________    Date: ${new Date().toISOString().slice(0,10)}`)
    doc.end()
    const pdfBuffer = await done

    // Upload to Supabase Storage
    const bucket = process.env.SUPABASE_COA_BUCKET || 'coas'
    const key = `${sale.artist_id}/${sale.id}/coa-${Date.now()}.pdf`
    const { error: upErr } = await supabase.storage.from(bucket).upload(key, pdfBuffer, { contentType: 'application/pdf', upsert: true })
    if (upErr) throw upErr
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(key)

    // Update sale with COA URL
    const { error: updErr } = await supabase
      .from('sales')
      .update({ digital_coa_url: pub.publicUrl })
      .eq('id', sale.id)
    if (updErr) throw updErr

    // Respond with URL
    res.status(201).json({ digital_coa_url: pub.publicUrl })
  } catch (e) { next(e) }
})

export default router

