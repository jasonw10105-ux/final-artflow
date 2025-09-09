import { Router } from 'express'
import { supabase } from '../../src/server/supabase'
import { requireAuth, getUserIdFromRequest } from '../middleware/auth'

const router = Router()

router.get('/contacts', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    res.json({ items: data || [] })
  } catch (e) { next(e) }
})

router.post('/contacts', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    const body = await readJson(req)
    const { data, error } = await supabase
      .from('contacts')
      .insert({ user_id: userId, full_name: body.full_name, email: body.email, organization: body.organization ?? null, phone_number: body.phone_number ?? null, notes: body.notes ?? null, tags: body.tags ?? [] })
      .select('*')
      .single()
    if (error) throw error
    res.status(201).json({ contact: data })
  } catch (e) { next(e) }
})

router.patch('/contacts/:id', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    const body = await readJson(req)
    const { data, error } = await supabase
      .from('contacts')
      .update({ full_name: body.full_name, organization: body.organization, phone_number: body.phone_number, notes: body.notes, tags: body.tags })
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error) throw error
    res.json({ contact: data })
  } catch (e) { next(e) }
})

router.delete('/contacts/:id', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId)
    if (error) throw error
    res.status(204).end()
  } catch (e) { next(e) }
})

router.post('/contacts/:id/share-log', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    const contactId = req.params.id
    const body = await readJson(req)
    const { error } = await supabase
      .from('contact_activity_logs')
      .insert({ user_id: userId, contact_id: contactId, activity_type: 'share', metadata: { kind: body.kind, url: body.url } })
    if (error) throw error
    res.status(201).json({ ok: true })
  } catch (e) { next(e) }
})

async function readJson(req: any){
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')
}

export default router

